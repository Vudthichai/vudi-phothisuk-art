import type { Artwork } from '../data';
import { Link } from 'react-router-dom';
import { RoomStudy } from './RoomStudy';
export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  const picture = <img src={artwork.image.src} alt={artwork.image.alt} width={artwork.image.width} height={artwork.image.height} srcSet={artwork.image.srcSet} sizes="(max-width: 700px) 86vw, 28vw" loading="lazy" decoding="async"/>;
  return <figure className="artwork-card">{artwork.slug ? <Link to={artwork.slug} aria-label={`View ${artwork.title}`}>{picture}</Link> : picture}<figcaption>{artwork.slug ? <Link to={artwork.slug}>{artwork.title}</Link> : artwork.title}{artwork.availability === 'sold' && <span className="artwork-status">Sold</span>}</figcaption></figure>;
}
export function Gallery({ artworks }: { artworks: Artwork[] }) {
  if (!artworks.length) return <div className="gallery-empty"><span className="eyebrow">Portfolio in preparation</span><h2>Space for the artwork.</h2><p>Verified images and artwork details will appear here. No artwork is shown in this prototype.</p></div>;
  return <div className="gallery">{artworks.map(artwork => <ArtworkCard key={artwork.id} artwork={artwork}/>)}</div>;
}

export function ArtworkViews({ artwork }: { artwork: Artwork }) {
  const details = artwork.images?.filter(image => image.role === 'detail' && image.src !== artwork.image.src) ?? [];
  return <><RoomStudy artwork={artwork}/>{details.length > 0 && <section className="craftsmanship-study" aria-label="Craftsmanship"><div className="craftsmanship-heading"><p className="eyebrow">A closer look</p><h2>Craftsmanship</h2></div><div className="craftsmanship-images">{details.map(image => <figure key={image.src}><a href={image.src} target="_blank" rel="noreferrer" aria-label={`Open ${artwork.title} detail image`}><img src={image.src} srcSet={image.srcSet} sizes="(max-width: 700px) 86vw, 45vw" alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async"/></a><figcaption>{image.caption}<a className="detail-open" href={image.src} target="_blank" rel="noreferrer">View image ↗</a></figcaption></figure>)}</div></section>}</>;
}
