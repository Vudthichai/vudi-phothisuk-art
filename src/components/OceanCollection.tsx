import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Collection } from '../data';
import './OceanCollection.css';

type Connection = { saveData?: boolean; effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void };
const reducedQuery = '(prefers-reduced-motion: reduce)';
function prefersStill() {
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  return Boolean(window.matchMedia?.(reducedQuery).matches || connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType ?? ''));
}

export function OceanCollection({ collection }: { collection: Collection }) {
  const scene = useRef<HTMLDivElement>(null);
  const gallery = useRef<HTMLElement>(null);
  const [stillPreferred, setStillPreferred] = useState(prefersStill);
  const moving = !stillPreferred;

  useEffect(() => {
    const preference = window.matchMedia?.(reducedQuery);
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => setStillPreferred(prefersStill());
    preference?.addEventListener('change', update);
    connection?.addEventListener?.('change', update);
    return () => { preference?.removeEventListener('change', update); connection?.removeEventListener?.('change', update); };
  }, []);

  useEffect(() => {
    const element = scene.current;
    const stage = element?.querySelector<HTMLElement>('.ocean-stage');
    if (!element || !stage || !moving) {
      element?.style.removeProperty('--image-y');
      element?.style.removeProperty('--image-scale');
      element?.style.removeProperty('--title-y');
      element?.style.removeProperty('--title-opacity');
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      element.dataset.inView = String(rect.bottom > 0 && rect.top < window.innerHeight);
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - stage.offsetHeight)));
      const compact = window.innerWidth <= 700;
      element.style.setProperty('--image-y', `${progress * (compact ? 18 : 50)}px`);
      element.style.setProperty('--image-scale', `${1.025 + progress * (compact ? .025 : .045)}`);
      element.style.setProperty('--title-y', `${-progress * (compact ? 32 : 85)}px`);
      element.style.setProperty('--title-opacity', `${1 - progress * .85}`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { if (frame) cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [moving]);

  useEffect(() => {
    const cards = gallery.current?.querySelectorAll<HTMLElement>('.artwork-card') ?? [];
    if (!moving || typeof IntersectionObserver === 'undefined') {
      cards.forEach(card => card.removeAttribute('data-reveal'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.reveal = 'visible'; observer.unobserve(entry.target); }
      });
    }, { threshold: .08 });
    cards.forEach(card => {
      if (card.getBoundingClientRect().top > window.innerHeight) card.dataset.reveal = 'waiting';
      observer.observe(card);
    });
    return () => { observer.disconnect(); cards.forEach(card => card.removeAttribute('data-reveal')); };
  }, [moving]);

  const featuredSlugs = ['the-oceans', ...collection.artworks.filter(artwork => artwork.slug !== 'the-oceans').map(artwork => artwork.slug!)];
  const featured = featuredSlugs.flatMap(slug => collection.artworks.filter(artwork => artwork.slug === slug));

  return <div className="ocean-experience" data-motion={moving ? 'on' : 'off'}>
    <div ref={scene} className="ocean-scene" data-in-view="true">
      <section className="ocean-stage" aria-labelledby="ocean-title">
        <div className="ocean-atmosphere" aria-hidden="true">
          <picture className="ocean-media">
            <source media="(max-width: 700px)" srcSet="/atmosphere/oceans/portrait-480.webp 480w, /atmosphere/oceans/portrait-768.webp 768w, /atmosphere/oceans/portrait-1024.webp 1024w" sizes="100vw"/>
            <img src="/atmosphere/oceans/wide-1440.webp" srcSet="/atmosphere/oceans/wide-960.webp 960w, /atmosphere/oceans/wide-1440.webp 1440w, /atmosphere/oceans/wide-1774.webp 1774w" sizes="100vw" width="1774" height="887" alt="" fetchPriority="high" loading="eager" decoding="async"/>
          </picture>
          <div className="ocean-shade"/>
        </div>
        <div className="ocean-title-block">
          <p className="ocean-eyebrow">A tribute to our deep blue waters</p>
          <h1 id="ocean-title">The Oceans</h1>
          <p className="ocean-deck">An encounter with texture, movement, and the sea.</p>
          <a className="ocean-explore" href="#oceans-gallery" onClick={event => {
            event.preventDefault();
            gallery.current?.scrollIntoView({ behavior: moving ? 'smooth' : 'auto', block: 'start' });
            gallery.current?.focus({ preventScroll: true });
          }}>Explore the collection <span aria-hidden="true">↓</span></a>
        </div>

      </section>
    </div>
    <section ref={gallery} id="oceans-gallery" className="section ocean-gallery" aria-labelledby="ocean-gallery-title" tabIndex={-1}>
      <div className="ocean-gallery-intro"><div><Link className="text-link" to="/collections">← All collections</Link><p className="eyebrow">The collection</p><h2 id="ocean-gallery-title">The sea,<br/><em>held in texture.</em></h2></div><p className="page-intro">{collection.summary}</p></div>
      <div className="ocean-exhibition">{featured.map((artwork, index) => <article key={artwork.id} className={`ocean-exhibit artwork-card ${index === 0 ? 'ocean-exhibit-wide' : 'ocean-exhibit-portrait'}`} aria-labelledby={`exhibit-${artwork.id}`}>
        <Link className="ocean-exhibit-image" to={artwork.slug!} aria-label={`View ${artwork.title}`}><img src={artwork.image.src} srcSet={artwork.image.srcSet} sizes={index === 0 ? '86vw' : '(max-width: 700px) 86vw, 55vw'} alt={artwork.image.alt} width={artwork.image.width} height={artwork.image.height} loading="lazy" decoding="async"/></Link>
        <div className="ocean-exhibit-caption"><div><p className="eyebrow">{String(index + 1).padStart(2, '0')} / The Oceans</p><h3 id={`exhibit-${artwork.id}`}><Link to={artwork.slug!}>{artwork.title}</Link></h3><p className="ocean-exhibit-meta">{artwork.dimensions}{artwork.availability === 'sold' && <span>Sold</span>}</p></div><div><p>{artwork.description?.[0]}</p><Link className="text-link" to={artwork.slug!}>Explore the painting <span aria-hidden="true">↗</span></Link></div></div>
      </article>)}</div>

    </section>
  </div>;
}
