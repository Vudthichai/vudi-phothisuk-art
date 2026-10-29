import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Collection } from '../data';
import { Gallery } from './Gallery';
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
  const [paused, setPaused] = useState(false);
  const [stillPreferred, setStillPreferred] = useState(prefersStill);
  const moving = !paused && !stillPreferred;

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
      element?.style.removeProperty('--shore-y');
      element?.style.removeProperty('--shore-opacity');
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
      element.style.setProperty('--shore-y', `${(1 - progress) * 85}%`);
      element.style.setProperty('--shore-opacity', `${progress}`);
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

  return <div className="ocean-experience" data-motion={moving ? 'on' : 'off'}>
    <div ref={scene} className="ocean-scene" data-in-view="true">
      <section className="ocean-stage" aria-labelledby="ocean-title">
        <div className="ocean-atmosphere" aria-hidden="true">
          <picture className="ocean-media">
            <source media="(max-width: 700px)" srcSet="/atmosphere/oceans/portrait-480.webp 480w, /atmosphere/oceans/portrait-768.webp 768w, /atmosphere/oceans/portrait-1024.webp 1024w" sizes="100vw"/>
            <img src="/atmosphere/oceans/wide-1440.webp" srcSet="/atmosphere/oceans/wide-960.webp 960w, /atmosphere/oceans/wide-1440.webp 1440w, /atmosphere/oceans/wide-1774.webp 1774w" sizes="100vw" width="1774" height="887" alt="" fetchPriority="high" loading="eager" decoding="async"/>
          </picture>
          <div className="ocean-shade"/>
          <div className="ocean-mist ocean-mist-near"/>
          <div className="ocean-mist ocean-mist-far"/>
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
        <div className="ocean-bottom-bar"><span className="ocean-scroll-note" aria-hidden="true">Scroll toward the shore <span>↓</span></span><button className="ocean-motion-toggle" type="button" aria-pressed={moving} disabled={stillPreferred} onClick={() => setPaused(value => !value)}>{stillPreferred ? 'Still view' : paused ? 'Enable motion' : 'Pause motion'}</button></div>
        <svg className="ocean-shore" viewBox="0 0 1440 180" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100 C220 50 360 145 620 90 S1060 42 1440 95 V180 H0Z"/></svg>
      </section>
    </div>
    <section ref={gallery} id="oceans-gallery" className="section ocean-gallery" aria-labelledby="ocean-gallery-title" tabIndex={-1}>
      <div className="ocean-gallery-intro"><div><Link className="text-link" to="/collections">← All collections</Link><p className="eyebrow">The collection</p><h2 id="ocean-gallery-title">The sea,<br/><em>held in texture.</em></h2></div><p className="page-intro">{collection.summary}</p></div>
      <Gallery artworks={collection.artworks}/>
    </section>
  </div>;
}
