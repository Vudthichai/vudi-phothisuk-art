import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { ForestCollectionData, ForestImage, ForestArtwork } from './types';
import { BotanicalFall } from '../components/BotanicalFall';
import './PrivateForest.css';
const api = '/.netlify/functions/forest-collection';
const base = '/collections/forest-and-flowers';
function Photograph({ image, eager = false }: { image: ForestImage; eager?: boolean }) {
  const main = image.variants[image.variants.length - 1];
  return <img src={`${api}?image=${encodeURIComponent(main.key)}`} srcSet={image.variants.map(v => `${api}?image=${encodeURIComponent(v.key)} ${v.width}w`).join(', ')} sizes="(max-width:700px) 90vw, 50vw" width={main.width} height={main.height} alt={image.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}
function Inquiry({ artwork }: { artwork: ForestArtwork }) {
  return artwork.availability === 'not-for-sale' ? <p className="private-availability">{artwork.availabilityNote}</p> : <div><p className="private-availability">{artwork.availabilityNote}</p><a className="text-link" href={`mailto:vudiphothisukart@gmail.com?subject=${encodeURIComponent('Artwork inquiry — ' + artwork.title)}`}>Inquire for Pricing</a></div>;
}
export function PrivateForest() {
  const { artworkSlug } = useParams();
  const location = useLocation();
  const [data, setData] = useState<ForestCollectionData | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sequence, setSequence] = useState(0);
  useEffect(() => {
    const oldTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const oldDescription = description?.getAttribute('content') ?? '';
    const existing = document.querySelector('meta[name="robots"]');
    const robots = existing ?? document.createElement('meta');
    const oldRobots = existing?.getAttribute('content');
    robots.setAttribute('name','robots'); robots.setAttribute('content','noindex, nofollow, noarchive');
    if (!existing) document.head.append(robots);
    document.title = 'Forest & Flowers — Private Preview | Vudi Phothisuk Art';
    description?.setAttribute('content','Private collection preview.');
    return () => { document.title = oldTitle; description?.setAttribute('content',oldDescription); if (!existing) robots.remove(); else if (oldRobots !== null && oldRobots !== undefined) robots.setAttribute('content',oldRobots); };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    fetch(api, { credentials: 'same-origin', cache: 'no-store', signal: abort.signal }).then(async response => {
      if (response.ok) setData(await response.json());
      else if (response.status !== 401) setMessage((await response.json()).error);
    }).catch(error => { if (error.name !== 'AbortError') setMessage('The private preview is temporarily unavailable.'); }).finally(() => { if (!abort.signal.aborted) setChecking(false); });
    return () => abort.abort();
  }, []);
  // Browser back/forward cache must revalidate the session before redisplaying content.
  useEffect(() => {
    const refresh = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener('pageshow', refresh);
    return () => window.removeEventListener('pageshow', refresh);
  }, []);
  useEffect(() => { setSequence(0); }, [location.pathname]);
  async function unlock(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(api, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const result = await response.json(); setPassword('');
      if (response.ok) setData(result); else setMessage(result.error);
    } catch { setMessage('The private preview is temporarily unavailable.'); }
    finally { setBusy(false); }
  }
  async function lock() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(api, { method: 'DELETE', credentials: 'same-origin' });
      if (!response.ok) throw new Error();
      setData(null); setSequence(0);
    } catch { setData(null); setMessage('Content hidden. Session could not be cleared; close this browser session to finish locking.'); }
    finally { setBusy(false); }
  }
  const artwork = data?.artworks.find(a => a.slug === artworkSlug);
  return <section className="private-forest section page">
    {!data ? <div className="forest-entrance"><p className="eyebrow">A private exhibition preview</p><h1>Forest &amp; Flowers</h1><p>Enter password to view the collection.</p>{checking ? <p role="status">Checking access…</p> : <form onSubmit={unlock}><label htmlFor="forest-password">Password</label><input id="forest-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /><button className="button-link" disabled={busy} type="submit">{busy ? 'Opening…' : 'Enter Collection'}</button></form>}<p role="status">{message}</p><Link className="text-link" to="/collections">Exit preview</Link></div> : <>
      <div className="forest-private-toolbar"><Link className="text-link" to={artworkSlug ? base : '/collections'}>{artworkSlug ? 'Back to collection' : 'Exit collection'}</Link><button onClick={lock} disabled={busy}>Lock collection</button></div>
      {artworkSlug ? artwork ? <article className="private-artwork"><header><p className="eyebrow">Forest &amp; Flowers</p><h1>{artwork.title}</h1><p>{artwork.dimensions ?? 'Dimensions to be confirmed'}</p><p>{artwork.medium ?? 'Medium to be confirmed'}</p><Inquiry artwork={artwork}/></header><div className="private-artwork-photos">{artwork.images.map((image,index) => <figure key={image.id}><Photograph image={image} eager={index === 0}/><figcaption>{image.role === 'angle' ? 'Angled view' : image.role === 'detail' ? 'Sculptural detail' : 'Full composition'} · Temporary photography</figcaption></figure>)}</div><div className="private-artwork-story">{artwork.copyStatus === 'provisional' && <p className="private-copy-note">Provisional description — pending artist approval.</p>}{artwork.description.map((paragraph,index) => <p key={index}>{paragraph}</p>)}</div><nav className="private-artwork-next" aria-label="Other paintings">{data.artworks.filter(a => a.id !== artwork.id).map(a => <Link key={a.id} to={`${base}/${a.slug}`}>{a.title}</Link>)}</nav></article> : <div><h1>Painting not found</h1><Link to={base}>View the collection</Link></div> : <>
        <header className="private-forest-intro"><p className="eyebrow">Private collection preview</p><h1>{data.title}</h1>{data.introduction.map((p,index) => <p key={index}>{p}</p>)}<p className="private-copy-note">Temporary photography · Final images to follow.</p><button className="text-link" onClick={() => setSequence(n => n + 1)}>A moment in the forest</button>{sequence > 0 && <BotanicalFall key={sequence} particles={[{ assetId:'leaf-green', left:'6%', duration:3.2, delay:0, displayWidth:25 },{ assetId:'petal-tiger-lily', left:'92%', drift:-30, duration:3.4, delay:.4, displayWidth:26 }]} distance="280px"/>}</header>
        <div className="private-forest-gallery">{data.artworks.map(art => <article key={art.id} className={art.images[0].variants[0].width > art.images[0].variants[0].height ? 'forest-landscape' : undefined}><Link to={`${base}/${art.slug}`} aria-label={`View ${art.title}`}><Photograph image={art.images[0]}/><h2>{art.title}</h2></Link><p>{art.dimensions ?? 'Dimensions to be confirmed'}</p><Inquiry artwork={art}/></article>)}</div>
      </>}
      <p role="status">{message}</p>
    </>}
  </section>;
}
