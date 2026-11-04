import { useCallback, useId, useRef, type CSSProperties } from 'react';
import type { BarkAsset, FoliagePiece, ForestControls, VineAsset } from '../botanical/forest';
import { useForestMotion } from '../botanical/useForestMotion';
import './ForestEnvironment.css';
const fit = (controls: ForestControls): CSSProperties => {
  const x = Math.max(0, Math.min(100, controls.placement?.x ?? 50));
  const y = Math.max(0, Math.min(100, controls.placement?.y ?? 50));
  const size = `${Math.max(.1, Math.min(1, controls.scale ?? 1)) * 100}%`;
  return { width: size, height: size, left: `${x}%`, top: `${y}%`, transform: `translate(-${x}%, -${y}%)` };
};

export function VineGrowth({ asset, ...controls }: ForestControls & { asset: VineAsset }) {
  return <VineScene key={`${asset.id}:${asset.image}:${asset.path}`} asset={asset} {...controls} />;
}
function VineScene({ asset, ...controls }: ForestControls & { asset: VineAsset }) {
  const stage = useRef<HTMLDivElement>(null);
  const maskId = useId().replace(/:/g, '');
  const build = useCallback((element: HTMLElement, duration: number) => [element.querySelector('[data-vine-path]')!.animate([
    { strokeDashoffset: '100' }, { strokeDashoffset: '80', offset: .24 },
    { strokeDashoffset: '40', offset: .64 }, { strokeDashoffset: '0' },
  ], { duration, easing: 'cubic-bezier(.3,0,.25,1)', fill: 'both' })], []);
  const status = useForestMotion(stage, controls, build);
  return <div ref={stage} className="forest-environment forest-vine" data-status={status} aria-hidden="true" style={{ aspectRatio: `${asset.width}/${asset.height}` }}>
    <img className="forest-preload" src={asset.image} alt="" />
    <svg viewBox="0 0 100 100" style={fit(controls)} preserveAspectRatio="xMidYMid meet">
      <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <path data-vine-path d={asset.path} pathLength="100" stroke="white" strokeWidth={asset.revealWidth} strokeLinecap="round" fill="none" strokeDasharray="100" />
      </mask></defs>
      <image href={asset.image} width="100" height="100" preserveAspectRatio="none" mask={`url(#${maskId})`} />
    </svg>
  </div>;
}

export function ForestFoliage({ pieces, ...controls }: ForestControls & { pieces: readonly FoliagePiece[] }) {
  return <FoliageScene key={pieces.map(p => `${p.id}:${p.image}`).join('|')} pieces={pieces} {...controls} />;
}
function FoliageScene({ pieces, ...controls }: ForestControls & { pieces: readonly FoliagePiece[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const build = useCallback((element: HTMLElement, duration: number, intensity: number) => Array.from(element.querySelectorAll('[data-foliage]')).map((leaf, index) => {
    const amplitude = (1.1 + (index % 3) * .42) * intensity;
    return leaf.animate([
      { transform: 'rotate(0deg)', offset: 0 },
      { transform: `rotate(${amplitude * .35}deg)`, offset: .16 + index % 3 * .018 },
      { transform: `rotate(${-amplitude}deg)`, offset: .39 + index % 3 * .025 },
      { transform: `rotate(${amplitude * .68}deg)`, offset: .73 - index % 3 * .02 },
      { transform: 'rotate(0deg)', offset: 1 },
    ], { duration: duration * (1 - index % 3 * .045), delay: index % 4 * duration * .028, easing: 'ease-in-out', fill: 'both' });
  }), []);
  const status = useForestMotion(stage, controls, build);
  return <div ref={stage} className="forest-environment forest-foliage" data-status={status} aria-hidden="true">
    <div className="forest-placement" style={fit(controls)}>
      {pieces.map(piece => <div key={piece.id} className="forest-foliage-piece" style={{ left: `${piece.x}%`, top: `${piece.y}%`, width: `${piece.size}%`, transform: `rotate(${piece.angle ?? 0}deg)` }}>
        <img data-foliage src={piece.image} width={piece.width} height={piece.height} alt="" draggable={false} style={{ transformOrigin: piece.origin ?? '50% 95%' }} />
      </div>)}
    </div>
  </div>;
}

type ArtworkUnderlay = { src: string; width: number; height: number };
export function BarkReveal({ asset, artwork, ...controls }: ForestControls & { asset: BarkAsset; artwork: ArtworkUnderlay }) {
  return <BarkScene key={`${asset.id}:${artwork.src}`} asset={asset} artwork={artwork} {...controls} />;
}
function BarkScene({ asset, artwork, ...controls }: ForestControls & { asset: BarkAsset; artwork: ArtworkUnderlay }) {
  const stage = useRef<HTMLDivElement>(null);
  const build = useCallback((element: HTMLElement, duration: number) => Array.from(element.querySelectorAll('[data-bark-band]')).map((band, index, bands) => band.animate([
    { opacity: 1 }, { opacity: 0 },
  ], { duration: duration * .6, delay: duration * .4 * index / Math.max(1, bands.length - 1), easing: 'ease-in-out', fill: 'both' })), []);
  const status = useForestMotion(stage, controls, build);
  return <div ref={stage} className="forest-environment forest-bark" data-status={status} aria-hidden="true" style={{ aspectRatio: `${artwork.width}/${artwork.height}` }}>
    <div className="forest-placement" style={fit(controls)}>
      <img className="forest-artwork" src={artwork.src} width={artwork.width} height={artwork.height} alt="" />
      <img className="forest-preload" src={asset.image} alt="" />
      {asset.ridgeMasks.map((mask, index) => <div className="forest-bark-band" data-bark-band key={mask} style={{ backgroundImage: `url("${asset.image}")`, maskImage: `url("${mask}")`, WebkitMaskImage: `url("${mask}")`, zIndex: index + 1 }}><img className="forest-preload" src={mask} alt="" /></div>)}
    </div>
  </div>;
}
