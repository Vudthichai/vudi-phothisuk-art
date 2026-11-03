import { Link } from 'react-router-dom';
import { collections, type Artwork, type Collection } from '../data';
import './AvailableArt.css';

function AvailablePainting({ artwork, collection, featured = false }: { artwork: Artwork; collection: Collection; featured?: boolean }) {
  const path = `/collections/${collection.slug}/${artwork.slug}`;
  return <article className={`available-painting${featured ? ' available-featured' : ''}`} aria-labelledby={`available-${artwork.id}`}>
    <Link className="available-image" to={path} aria-label={`View ${artwork.title}`}><img src={artwork.image.src} srcSet={artwork.image.srcSet} sizes={featured ? '(max-width: 700px) 86vw, 55vw' : '(max-width: 700px) 86vw, (max-width: 1000px) 40vw, 27vw'} width={artwork.image.width} height={artwork.image.height} alt={artwork.image.alt} loading="lazy" decoding="async"/></Link>
    <div className="available-copy">
      <p className="eyebrow">{collection.name}</p>
      <h3 id={`available-${artwork.id}`}><Link to={path}>{artwork.title}</Link></h3>
      {artwork.dimensions && <p className="available-dimensions">{artwork.dimensions}</p>}
      {artwork.description?.[0] && <p className="available-description">{artwork.description[0]}</p>}
      <a className="text-link" aria-label={`Inquire about ${artwork.title}`} href={`mailto:vudiphothisukart@gmail.com?subject=${encodeURIComponent(`Artwork inquiry: ${artwork.title}`)}`}>Inquire about this painting</a>
    </div>
  </article>;
}

export function AvailableArt() {
  return <section className="section page available-art" aria-labelledby="available-title">
    <p className="eyebrow">Original paintings</p>
    <h1 id="available-title">Available Art</h1>
    <p className="page-intro">Explore available paintings from The Oceans and The Regal Collection. For pricing and inquiries, get in touch.</p>
    {collections.map(collection => {
      const available = collection.artworks.filter(artwork => artwork.availability === 'available');
      if (!available.length) return null;
      const featured = available.find(artwork => artwork.slug === 'the-oceans');
      return <section className="available-collection" key={collection.slug} aria-labelledby={`available-collection-${collection.slug}`}>
        <h2 id={`available-collection-${collection.slug}`} className="available-collection-title">{collection.slug === 'oceans' ? 'The Oceans Collection' : collection.name}</h2>
        <div className="available-grid">{available.filter(artwork => artwork !== featured).map(artwork => <AvailablePainting key={artwork.id} artwork={artwork} collection={collection}/>)}</div>
        {featured && <AvailablePainting artwork={featured} collection={collection} featured/>}
      </section>;
    })}
  </section>;
}
