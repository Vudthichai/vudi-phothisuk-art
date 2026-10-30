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
  const detail = artwork.images?.find(image => image.role === 'detail');
  if (artwork.image.src.startsWith('/artworks/regal/') && detail) return <section className="regal-detail-texture" aria-label={`${artwork.title} texture detail`}><div><p className="eyebrow">A closer look</p><h2>The surface,<br/><em>up close.</em></h2><p>Raised contours, layered color, and the marks that give {artwork.title} its texture.</p></div><img src={detail.src} srcSet={detail.srcSet} sizes="(max-width:700px) 86vw, 55vw" alt={detail.alt} width={detail.width} height={detail.height} loading="lazy" decoding="async"/></section>;
  return <RoomStudy artwork={artwork}/>;
}
