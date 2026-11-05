import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { ForestCollectionData, ForestArtwork } from './types';
import { BotanicalFall } from '../components/BotanicalFall';
import './PrivateForest.css';
import { ArtworkImageGallery } from './ArtworkImageGallery';
import { ForestPhotograph as Photograph } from './ForestPhotograph';
import { primaryForestImage } from './types';
const collectionUrl = '/forest-preview/collection.json';
const sessionKey = 'vudi-forest-preview-unlocked';
function remembered() { try { return sessionStorage.getItem(sessionKey) === 'yes'; } catch { return false; } }
function remember(value: boolean) { try { if (value) sessionStorage.setItem(sessionKey, 'yes'); else sessionStorage.removeItem(sessionKey); } catch { /* Access still works in this view when storage is unavailable. */ } }
const base = '/collections/forest-and-flowers';
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
  const unlockRequest = useRef<AbortController | null>(null);
  useEffect(() => () => unlockRequest.current?.abort(), []);
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
    if (!remembered()) { setChecking(false); return; }
    const abort = new AbortController();
    fetch(collectionUrl, { cache: 'no-store', signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error();
      setData(await response.json());
    }).catch(error => { if (error.name !== 'AbortError') setMessage('The preview could not load. Please try again.'); }).finally(() => { if (!abort.signal.aborted) setChecking(false); });
    return () => abort.abort();
  }, []);
  // Re-read this tab's visibility flag after browser back/forward restoration.
  useEffect(() => {
    const refresh = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener('pageshow', refresh);
    return () => window.removeEventListener('pageshow', refresh);
  }, []);
  useEffect(() => { setSequence(0); }, [location.pathname]);
  async function unlock(event: FormEvent) {
    event.preventDefault(); setMessage('');
    if (password !== 'Evergreen') { setPassword(''); setMessage('That password was not recognized. Please try again.'); return; }
    setBusy(true);
    unlockRequest.current?.abort();
    const abort = new AbortController(); unlockRequest.current = abort;
    try {
      const response = await fetch(collectionUrl, { cache: 'no-store', signal: abort.signal });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (!abort.signal.aborted) { remember(true); setData(result); setPassword(''); }
    } catch { if (!abort.signal.aborted) setMessage('The preview could not load. Please try again.'); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  function lock() {
    unlockRequest.current?.abort();
    remember(false); setData(null); setSequence(0); setPassword(''); setMessage('');
  }
  const artwork = data?.artworks.find(a => a.slug === artworkSlug);
  return <section className="private-forest section page">
    {!data ? <div className="forest-entrance"><p className="eyebrow">A private exhibition preview</p><h1>Forest &amp; Flowers</h1><p>Enter password to view the collection.</p>{checking ? <p role="status">Checking access…</p> : <form onSubmit={unlock}><label htmlFor="forest-password">Password</label><input id="forest-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /><button className="button-link" disabled={busy} type="submit">{busy ? 'Opening…' : 'Enter Collection'}</button></form>}<p role="status">{message}</p><Link className="text-link" to="/collections">Exit preview</Link></div> : <>
      <div className="forest-private-toolbar"><Link className="text-link" to={artworkSlug ? base : '/collections'}>{artworkSlug ? 'Back to collection' : 'Exit collection'}</Link><button onClick={lock} disabled={busy}>Lock collection</button></div>
      {artworkSlug ? artwork ? <article className="private-artwork"><div className="private-artwork-presentation"><ArtworkImageGallery title={artwork.title} images={artwork.images} initialImageId={primaryForestImage(artwork).id}/><header><p className="eyebrow">Forest &amp; Flowers</p><h1>{artwork.title}</h1><p>{artwork.dimensions ?? 'Dimensions to be confirmed'}</p><p>{artwork.medium ?? 'Medium to be confirmed'}</p><Inquiry artwork={artwork}/></header></div><div className="private-artwork-story">{artwork.copyStatus === 'provisional' && <p className="private-copy-note">Provisional description — pending artist approval.</p>}{artwork.description.map((paragraph,index) => <p key={index}>{paragraph}</p>)}</div><nav className="private-artwork-next" aria-label="Other paintings">{data.artworks.filter(a => a.id !== artwork.id).map(a => <Link key={a.id} to={`${base}/${a.slug}`}>{a.title}</Link>)}</nav></article> : <div><h1>Painting not found</h1><Link to={base}>View the collection</Link></div> : <>
        <header className="private-forest-intro"><p className="eyebrow">Private collection preview</p><h1>{data.title}</h1>{data.introduction.map((p,index) => <p key={index}>{p}</p>)}<button className="text-link" onClick={() => setSequence(n => n + 1)}>A moment in the forest</button>{sequence > 0 && <BotanicalFall key={sequence} particles={[{ assetId:'leaf-green', left:'6%', duration:3.2, delay:0, displayWidth:25 },{ assetId:'petal-tiger-lily', left:'92%', drift:-30, duration:3.4, delay:.4, displayWidth:26 }]} distance="280px"/>}</header>
        <div className="private-forest-gallery">{data.artworks.map(art => <article key={art.id} className={art.id === 'mother-nature' ? 'forest-featured-work' : undefined}><Link className="forest-overview-image" to={`${base}/${art.slug}`} aria-label={`View ${art.title}`}><Photograph image={primaryForestImage(art)} sizes={art.id === 'mother-nature' ? '(max-width:800px) 90vw, 52vw' : '(max-width:700px) 90vw, (max-width:1100px) 42vw, 28vw'}/></Link><div className="forest-overview-copy"><Link to={`${base}/${art.slug}`}><h2>{art.title}</h2></Link><p>{art.dimensions ?? 'Dimensions to be confirmed'}</p>{art.id === 'mother-nature' && <p className="forest-featured-excerpt">{art.description[0]}</p>}<Inquiry artwork={art}/><Link className="text-link forest-artwork-link" to={`${base}/${art.slug}`}>View painting</Link></div></article>)}</div>
      </>}
      <p role="status">{message}</p>
    </>}
  </section>;
}
