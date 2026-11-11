import { useState } from 'react';
import { ForestDecorations } from './ForestDecorations';
import { forestCollection } from '../forest/collection';
import { primaryForestImage } from '../forest/types';
import './MotherNature.css';

const motherNature = forestCollection.artworks.find(artwork => artwork.id === 'mother-nature')!;
const hero = primaryForestImage(motherNature);
const fullImage = hero.variants[hero.variants.length - 1];
const fullImageSrcSet = hero.variants.map(({ src, width }) => `${src} ${width}w`).join(', ');

export function MotherNature() {
  const [whole, setWhole] = useState(false);
  const [fullReady, setFullReady] = useState(false);
  const [sequence, setSequence] = useState(0);
  const fullVisible = whole && fullReady;
  function show(next: boolean) {
    if (next === whole) return;
    setWhole(next);
    setSequence(value => value + 1);
  }
  return <figure className="forest-feature mother-nature">
    <button type="button" className={`mother-nature-view ${fullVisible ? 'is-whole' : ''}`} aria-label={whole ? 'Return to Mother Nature detail' : 'View Mother Nature, complete painting'} aria-pressed={whole} aria-busy={whole && !fullReady} onClick={() => show(!whole)}>
      <span className="mother-nature-stage">
        <img className="mother-nature-detail" src="/artworks/forest/mother-nature-home-intro-img-7873-1800.webp" srcSet="/artworks/forest/mother-nature-home-intro-img-7873-900.webp 900w, /artworks/forest/mother-nature-home-intro-img-7873-1800.webp 1800w, /artworks/forest/mother-nature-home-intro-img-7873-2800.webp 2800w" sizes="(max-width:1915px) 94vw, 1800px" width="6026" height="3390" alt={fullVisible ? '' : 'Detail of Mother Nature: sculpted pink and orange flowers, green leaves, and a pale waterfall.'} aria-hidden={fullVisible} fetchPriority="high"/>
        <img className="mother-nature-full" src={fullImage.src} srcSet={fullImageSrcSet} sizes="(max-width:700px) 80vw, 65vw" width={fullImage.width} height={fullImage.height} alt={fullVisible ? 'Mother Nature, complete painting: a forest goddess beside a winding river, with sculpted leaves and flowers.' : ''} aria-hidden={!fullVisible} fetchPriority="low" onLoad={() => setFullReady(true)}/>
        {sequence > 0 && fullReady && <ForestDecorations scene="reveal" key={sequence}/>}
      </span>
    </button>
    <figcaption><span aria-live="polite"><em>Mother Nature — {fullVisible ? 'Full painting' : 'Detail'}</em><small>Forest &amp; Flowers{whole && !fullReady ? ' · Loading full painting…' : ''}</small></span><button type="button" aria-pressed={whole} onClick={() => show(!whole)}>{whole ? 'Return to detail' : 'View full painting'}</button></figcaption>
  </figure>;
}
