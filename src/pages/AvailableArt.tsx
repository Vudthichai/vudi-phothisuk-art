import { Link } from 'react-router-dom';
import { collections } from '../data';
import './AvailableArt.css';

export function AvailableArt() {
  const available = collections.flatMap(collection => collection.artworks
    .filter(artwork => artwork.availability === 'available')
    .map(artwork => ({ artwork, collection })));
  return <section className="section page available-art" aria-labelledby="available-title">
    <p className="eyebrow">Original paintings</p>
    <h1 id="available-title">Available Art</h1>
    <p className="page-intro">Explore available paintings from The Oceans and The Regal Collection. For pricing and inquiries, get in touch.</p>
    <div className="available-grid">{available.map(({ artwork, collection }) => {
      const path = `/collections/${collection.slug}/${artwork.slug}`;
      return <article className="available-painting" key={artwork.id} aria-labelledby={`available-${artwork.id}`}>
        <Link className="available-image" to={path} aria-label={`View ${artwork.title}`}><img src={artwork.image.src} srcSet={artwork.image.srcSet} sizes="(max-width: 700px) 86vw, (max-width: 1000px) 40vw, 27vw" width={artwork.image.width} height={artwork.image.height} alt={artwork.image.alt} loading="lazy" decoding="async"/></Link>
        <p className="eyebrow">{collection.name}</p>
        <h2 id={`available-${artwork.id}`}><Link to={path}>{artwork.title}</Link></h2>
        {artwork.dimensions && <p className="available-dimensions">{artwork.dimensions}</p>}
        {artwork.description?.[0] && <p className="available-description">{artwork.description[0]}</p>}
        <a className="text-link" aria-label={`Inquire about ${artwork.title}`} href={`mailto:vudiphothisukart@gmail.com?subject=${encodeURIComponent(`Artwork inquiry: ${artwork.title}`)}`}>Inquire about this painting</a>
      </article>;
    })}</div>
  </section>;
}
