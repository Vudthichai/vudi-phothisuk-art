import type { Artwork } from '../data';
import { Link } from 'react-router-dom';
export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  const picture = <img src={artwork.image.src} alt={artwork.image.alt} width={artwork.image.width} height={artwork.image.height} srcSet={artwork.image.srcSet} sizes="(max-width: 700px) 86vw, 28vw" loading="lazy" decoding="async"/>;
  return <figure className="artwork-card">{artwork.slug ? <Link to={artwork.slug} aria-label={`View ${artwork.title}`}>{picture}</Link> : picture}<figcaption>{artwork.slug ? <Link to={artwork.slug}>{artwork.title}</Link> : artwork.title}{artwork.availability === 'sold' && <span className="artwork-status">Sold</span>}</figcaption></figure>;
}
export function Gallery({ artworks }: { artworks: Artwork[] }) {
  if (!artworks.length) return <div className="gallery-empty"><span className="eyebrow">Portfolio in preparation</span><h2>Space for the artwork.</h2><p>Verified images and artwork details will appear here. No artwork is shown in this prototype.</p></div>;
  return <div className="gallery">{artworks.map(artwork => <ArtworkCard key={artwork.id} artwork={artwork}/>)}</div>;
}

export function ArtworkViews({ artwork }: { artwork: Artwork }) {
  const additional = artwork.images?.filter(image => image.src !== artwork.image.src) ?? [];
  const groups = [
    { title: 'Details', images: additional.filter(image => image.role === 'detail') },
    { title: 'In a room', images: additional.filter(image => image.role === 'room-visualization') },
  ];
  const visible = groups.filter(group => group.images.length);
  if (!visible.length) return null;
  return <div className={`artwork-view-groups${visible.length === 1 ? ' single' : ''}`}>{visible.map(group => <section className="artwork-more" key={group.title} aria-label={group.title}><h2>{group.title}</h2><div className="artwork-views">{group.images.map(image => <figure key={image.src}><a href={image.src} target="_blank" rel="noreferrer" aria-label={`Open ${artwork.title} ${image.role === 'detail' ? 'detail' : 'room study'} image`}><img src={image.src} srcSet={image.srcSet} sizes="(max-width: 700px) 86vw, 40vw" alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async"/></a><figcaption>{image.role === 'room-visualization' ? 'Room study · illustrative scale' : image.caption}<a className="detail-open" href={image.src} target="_blank" rel="noreferrer">View image ↗</a></figcaption></figure>)}</div></section>)}</div>;
}
