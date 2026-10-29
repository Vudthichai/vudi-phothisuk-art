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
  if (artwork.slug === 'beach-day') return <section className="beach-room-study" aria-labelledby="beach-room-title"><div className="room-study-copy"><p className="eyebrow">A different perspective</p><h2 id="beach-room-title">Beach Day,<br/>at home.</h2><p>The painting’s blue water and warm sand sit alongside linen, woven textures, and pale wood in this boho room study.</p><p className="room-study-note">Room study · illustrative scale</p></div><div className="beach-room-scene" role="img" aria-label="Illustrative boho room study featuring the actual Beach Day photograph above an oak console"><img className="beach-room-background" src="/atmosphere/rooms/beach-day-boho-1440.webp" width="1536" height="1024" alt="" loading="lazy"/><img className="beach-room-art" src={artwork.image.src} alt="" width={artwork.image.width} height={artwork.image.height} loading="lazy"/></div></section>;
  const additional = artwork.images?.filter(image => image.src !== artwork.image.src) ?? [];
  const groups = [
    { title: 'Details', images: additional.filter(image => image.role === 'detail') },
    { title: 'In a room', images: additional.filter(image => image.role === 'room-visualization') },
  ];
  const visible = groups.filter(group => group.images.length);
  if (!visible.length) return null;
  return <div className={`artwork-view-groups${visible.length === 1 ? ' single' : ''}`}>{visible.map(group => <section className="artwork-more" key={group.title} aria-label={group.title}><div className="artwork-view-copy"><h2>{group.title}</h2>{artwork.slug === 'golden-sand-beach' && group.title === 'In a room' && <><p>The turquoise water, white surf, and metallic shoreline bring a coastal palette into this room study. Warm wood and a quiet wall give the painting space to stand out.</p><p className="room-study-note">An illustrative setting for considering the work in a space.</p></>}</div><div className="artwork-views">{group.images.map(image => <figure key={image.src}><a href={image.src} target="_blank" rel="noreferrer" aria-label={`Open ${artwork.title} ${image.role === 'detail' ? 'detail' : 'room study'} image`}><img src={image.src} srcSet={image.srcSet} sizes="(max-width: 700px) 86vw, 40vw" alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async"/></a><figcaption>{image.role === 'room-visualization' ? 'Room study · illustrative scale' : image.caption}<a className="detail-open" href={image.src} target="_blank" rel="noreferrer">View image ↗</a></figcaption></figure>)}</div></section>)}</div>;
}
