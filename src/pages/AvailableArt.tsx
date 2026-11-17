import { OriginalPrice } from '../components/OriginalPrice';
import { Link } from 'react-router-dom';
import { collections, type Artwork, type Collection } from '../data';
import './AvailableArt.css';
import { forestCollection } from '../forest/collection';
import { ForestPhotograph } from '../forest/ForestPhotograph';
import { primaryForestImage } from '../forest/types';
import { StudioEditions } from '../studio/StudioEditions';

function AvailablePainting({ artwork, collection, featured = false }: { artwork: Artwork; collection: Collection; featured?: boolean }) {
  const path = `/collections/${collection.slug}/${artwork.slug}`;
  return <article className={`available-painting${featured ? ' available-featured' : ''}`} aria-labelledby={`available-${artwork.id}`}>
    <Link className="available-image" to={path} aria-label={`View ${artwork.title}`}><img src={artwork.image.src} srcSet={artwork.image.srcSet} sizes={featured ? '(max-width: 700px) 86vw, 55vw' : '(max-width: 700px) 86vw, (max-width: 1000px) 40vw, 27vw'} width={artwork.image.width} height={artwork.image.height} alt={artwork.image.alt} loading="lazy" decoding="async"/></Link>
    <div className="available-copy">
      <p className="eyebrow">{collection.name}</p>
      <h4 id={`available-${artwork.id}`}><Link to={path}>{artwork.title}</Link></h4>
      {artwork.dimensions && <p className="available-dimensions">{artwork.dimensions}</p>}
      <OriginalPrice artwork={artwork}/>
      {artwork.description?.[0] && <p className="available-description">{artwork.description[0]}</p>}
      <a className="text-link" aria-label={`Inquire about ${artwork.title}`} data-analytics-artwork={path} href={`mailto:vudiphothisukart@gmail.com?subject=${encodeURIComponent(`Artwork inquiry: ${artwork.title}`)}`}>Inquire about this painting</a>
    </div>
  </article>;
}

export function AvailableArt() {
  return <section className="section page available-art" aria-labelledby="available-title">
    <p className="eyebrow">Original artworks &amp; prints</p>
    <h1 id="available-title">Available Art</h1>
    <p className="page-intro">Explore Forest & Flowers originals and Studio Edition prints, alongside available paintings from earlier collections.</p>
    <section className="available-forest-originals" aria-labelledby="available-forest-title"><h2 id="available-forest-title" className="available-collection-title">Forest &amp; Flowers — Original Artworks</h2><p className="page-intro">Original artwork availability by inquiry.</p><div className="available-grid">{forestCollection.artworks.filter(art => art.availability !== 'not-for-sale').map(art => <article key={art.id} className="available-forest-painting"><Link className="available-image" to={`/collections/forest-and-flowers/${art.slug}/`} aria-label={`Explore original ${art.title}`}><ForestPhotograph image={primaryForestImage(art)} sizes="(max-width:700px) 86vw, 27vw"/></Link><h3><Link to={`/collections/forest-and-flowers/${art.slug}/`}>{art.title}</Link></h3><p>Inquire about the original</p></article>)}</div><Link className="text-link" to="/collections/forest-and-flowers">View Forest &amp; Flowers</Link></section>
    <StudioEditions title="Forest & Flowers — Studio Editions"/>
    <section className="available-earlier" aria-labelledby="available-earlier-title"><h2 id="available-earlier-title">Earlier Collections</h2>
    {collections.map(collection => {
      const available = collection.artworks.filter(artwork => artwork.availability === 'available');
      if (!available.length) return null;
      const featured = available.find(artwork => artwork.slug === 'the-oceans');
      return <section className="available-collection" key={collection.slug} aria-labelledby={`available-collection-${collection.slug}`}>
        <h3 id={`available-collection-${collection.slug}`} className="available-collection-title">{collection.slug === 'oceans' ? 'The Oceans Collection' : collection.name}</h3>
        <div className="available-grid">{available.filter(artwork => artwork !== featured).map(artwork => <AvailablePainting key={artwork.id} artwork={artwork} collection={collection}/>)}</div>
        {featured && <AvailablePainting artwork={featured} collection={collection} featured/>}
      </section>;
    })}
    </section>
  </section>;
}
