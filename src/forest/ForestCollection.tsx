import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { ForestArtwork } from './types';
import { forestCollection as data } from './collection';
import { BotanicalFall } from '../components/BotanicalFall';
import './PrivateForest.css';
import { ArtworkImageGallery } from './ArtworkImageGallery';
import { ForestPhotograph as Photograph } from './ForestPhotograph';
import { primaryForestImage } from './types';
const base = '/collections/forest-and-flowers';
function Inquiry({ artwork }: { artwork: ForestArtwork }) {
  return artwork.availability === 'not-for-sale' ? <p className="private-availability">{artwork.availabilityNote}</p> : <div><p className="private-availability">{artwork.availabilityNote}</p><a className="text-link" href={`mailto:vudiphothisukart@gmail.com?subject=${encodeURIComponent('Artwork inquiry — ' + artwork.title)}`}>Inquire for Pricing</a></div>;
}
export function ForestCollection() {
  const { artworkSlug } = useParams();
  const location = useLocation();
  const [sequence, setSequence] = useState(0);
  const artwork = data.artworks.find(a => a.slug === artworkSlug);
  const title = artwork ? `${artwork.title} | Forest & Flowers` : artworkSlug ? 'Painting not found' : data.title;
  const summary = artwork?.description[0] ?? data.introduction[0];

  useEffect(() => {
    const oldTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const oldDescription = description?.getAttribute('content');
    document.title = `${title} | Vudi Phothisuk Art`;
    description?.setAttribute('content', summary);
    return () => {
      document.title = oldTitle;
      if (oldDescription != null) description?.setAttribute('content', oldDescription);
      else description?.removeAttribute('content');
    };
  }, [title, summary]);
  useEffect(() => { setSequence(0); }, [location.pathname]);

  return <section className="private-forest section page">
      <div className="forest-private-toolbar"><Link className="text-link" to={artworkSlug ? base : '/collections'}>{artworkSlug ? 'Back to collection' : 'All collections'}</Link></div>
      {artworkSlug ? artwork?.slug === 'mother-nature' ? <MotherNatureEditorial artwork={artwork}/> : artwork ? <article className="private-artwork"><div className="private-artwork-presentation"><ArtworkImageGallery title={artwork.title} images={artwork.images} initialImageId={primaryForestImage(artwork).id}/><header><p className="eyebrow">Forest &amp; Flowers</p><h1>{artwork.title}</h1><p>{artwork.dimensions ?? 'Dimensions to be confirmed'}</p><p>{artwork.medium ?? 'Medium to be confirmed'}</p><Inquiry artwork={artwork}/></header></div><div className="private-artwork-story">{artwork.copyStatus === 'provisional' && <p className="private-copy-note">Provisional description — pending artist approval.</p>}{artwork.description.map((paragraph,index) => <p key={index}>{paragraph}</p>)}</div><nav className="private-artwork-next" aria-label="Other paintings">{data.artworks.filter(a => a.id !== artwork.id).map(a => <Link key={a.id} to={`${base}/${a.slug}`}>{a.title}</Link>)}</nav></article> : <div><h1>Painting not found</h1><Link to={base}>View the collection</Link></div> : <>
        <header className="private-forest-intro"><p className="eyebrow">Collection</p><h1>{data.title}</h1>{data.introduction.map((p,index) => <p key={index}>{p}</p>)}<button className="text-link" onClick={() => setSequence(n => n + 1)}>A moment in the forest</button>{sequence > 0 && <BotanicalFall key={sequence} particles={[{ assetId:'leaf-green', left:'6%', duration:3.2, delay:0, displayWidth:25 },{ assetId:'petal-tiger-lily', left:'92%', drift:-30, duration:3.4, delay:.4, displayWidth:26 }]} distance="280px"/>}</header>
        <div className="private-forest-gallery">
          {data.artworks.map(art => (
            <article key={art.id} className="forest-exhibit" aria-labelledby={`forest-exhibit-${art.id}`}>
              <Link className="forest-overview-image" to={`${base}/${art.slug}`} aria-label={`View ${art.title}`}>
                <Photograph image={primaryForestImage(art)} sizes="(max-width: 800px) 90vw, 55vw"/>
              </Link>
              <div className="forest-overview-copy">
                <Link to={`${base}/${art.slug}`}><h2 id={`forest-exhibit-${art.id}`}>{art.title}</h2></Link>
                <p>{art.dimensions ?? 'Dimensions to be confirmed'}</p>
                {art.id === 'mother-nature' && <p className="forest-featured-excerpt">{art.description[0]}</p>}
                <Inquiry artwork={art}/>
                <Link className="text-link forest-artwork-link" to={`${base}/${art.slug}`}>View painting</Link>
              </div>
            </article>
          ))}
        </div>
      </>}
  </section>;
}


function MotherNatureEditorial({ artwork }: { artwork: ForestArtwork }) {
  const hero = primaryForestImage(artwork);
  const next = data.artworks[data.artworks.indexOf(artwork) + 1];

  return <article className="forest-editorial">
    <div className="forest-editorial-opening">
      <header className="forest-editorial-title">
        <p className="eyebrow">Forest &amp; Flowers</p>
        <h1>{artwork.title}</h1>
        <p>{artwork.dimensions}</p>
      </header>
      <div className="forest-editorial-hero">
        <ArtworkImageGallery title={artwork.title} images={[hero]} editorialHero/>
      </div>
      <div className="forest-editorial-facts">
        <p>{artwork.medium}</p>
        <Inquiry artwork={artwork}/>
      </div>
    </div>
    <section className="forest-editorial-story" aria-labelledby="mother-nature-story">
      <h2 id="mother-nature-story">About the painting</h2>
      {artwork.description.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    </section>
    <section className="forest-editorial-details" aria-labelledby="mother-nature-details">
      <h2 id="mother-nature-details">Closer look</h2>
      <ArtworkImageGallery title={artwork.title} images={artwork.images.filter(image => image.id !== hero.id)}/>
    </section>
    <nav className="private-artwork-next" aria-label="More paintings">
      <Link className="text-link" to={base}>All Forest &amp; Flowers paintings</Link>
      {next && <Link className="text-link" to={`${base}/${next.slug}`}>Next painting · {next.title}</Link>}
    </nav>
  </article>;
}
