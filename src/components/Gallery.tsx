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

export function ArtworkTexture({ artwork }: { artwork: Artwork }) {
  const detail = artwork.images?.find(image => image.role === 'detail');
  if (!artwork.image.src.startsWith('/artworks/regal/') || !detail) return null;
  return <section className="regal-inline-detail" aria-label={`${artwork.title} texture detail`}><p className="eyebrow">A closer look</p><img src={detail.src} srcSet={detail.srcSet} sizes="(max-width:700px) 86vw, 40vw" alt={detail.alt} width={detail.width} height={detail.height} loading="lazy" decoding="async"/></section>;
}

export function ArtworkViews({ artwork }: { artwork: Artwork }) {
  return <RoomStudy artwork={artwork}/>;
}
