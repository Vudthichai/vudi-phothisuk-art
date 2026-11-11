import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { findCollection } from '../data';

export function RegalPreview() {
  const gallery = useRef<HTMLDivElement>(null);
  const artworks = ['navy', 'carnations', 'sahara'].map(slug => findCollection('regal-collection')!.artworks.find(art => art.slug === slug)!);
  return <section className="home-regal-row" aria-labelledby="home-regal-title">
    <div className="forest-section-heading">
      <div className="home-regal-intro">
        <p className="eyebrow">Selected Works</p>
        <h2 id="home-regal-title">The Regal Collection</h2>
        <p>Expressive movement, layered color, and sculptural texture.</p>
      </div>
      <Link className="text-link" to="/collections/regal-collection" aria-label="Explore The Regal Collection">Explore the collection</Link>
    </div>
    <p className="regal-swipe-hint" id="regal-swipe-hint">Swipe to explore · Use arrow keys when the gallery is focused</p>
    <div ref={gallery} className="home-regal-grid" role="region" aria-label="Regal paintings" aria-describedby="regal-swipe-hint" tabIndex={0} onKeyDown={event => {
      if (event.target !== event.currentTarget || !window.matchMedia?.('(max-width:700px)').matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gallery.current?.scrollBy({ left: gallery.current.clientWidth * .86 * (event.key === 'ArrowRight' ? 1 : -1), behavior: reduced ? 'auto' : 'smooth' });
    }}>{artworks.map(art => <Link key={art.slug} to={`/collections/regal-collection/${art.slug}`}><img src={art.image.src} srcSet={art.image.srcSet} sizes="(max-width:700px) 80vw, 26vw" width={art.image.width} height={art.image.height} alt={art.image.alt} loading="lazy"/><h3>{art.title}</h3>{art.dimensions && <p className="home-regal-dimensions">{art.dimensions}</p>}</Link>)}</div>
  </section>;
}
