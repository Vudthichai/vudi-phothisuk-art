import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { getBotanicalAsset, type BotanicalAssetId } from '../botanical/registry';
import './ForestDecorations.css';

export type BotanicalScene = 'menu' | 'reveal';
export type BotanicalParticle = {
  assetId: BotanicalAssetId;
  delay?: number;
  duration?: number;
  drift?: number;
  sway?: number;
  rotation?: number;
  scale?: number;
  left?: string;
  displayWidth?: number;
};
export type BotanicalFallProps = {
  scene?: BotanicalScene;
  particles?: readonly BotanicalParticle[];
  count?: number;
  duration?: number;
  distance?: string;
};
const presets: Record<BotanicalScene, readonly BotanicalParticle[]> = {
  menu: [{assetId:'leaf-green'}, {assetId:'petal-rose-pink'}, {assetId:'leaf-dark'}, {assetId:'petal-tiger-lily'}, {assetId:'leaf-gold'}, {assetId:'petal-rose-red'}],
  reveal: [{assetId:'leaf-curled'}, {assetId:'petal-carnation-pink'}, {assetId:'leaf-orange'}, {assetId:'petal-cream'}, {assetId:'leaf-green'}, {assetId:'petal-carnation-peach'}],
};

/** One CSS-driven sequence per mount. Change its key to replay an unchanged scene. */
export function BotanicalFall(props: BotanicalFallProps) {
  return <BotanicalSequence key={JSON.stringify(props)} {...props}/>;
}

function BotanicalSequence({ scene = 'menu', particles, count, duration, distance }: BotanicalFallProps) {
  const items = useMemo(() => {
    const source = particles ?? presets[scene];
    const size = source.length ? Math.max(0, Math.min(12, Math.floor(count ?? (particles ? source.length : 5)))) : 0;
    let leaves = 0, petals = 0;
    return Array.from({ length: size }, (_, index) => {
      const particle = source[index % source.length];
      const asset = getBotanicalAsset(particle.assetId);
      const variant = asset.type === 'leaf' ? `leaf-${leaves++ % 3}` : `petal-${petals++ % 2}`;
      const style: CSSProperties & Record<string, string | number | undefined> = {
        '--duration': particle.duration !== undefined ? `${Math.max(.1, particle.duration)}s` : duration !== undefined ? `${Math.max(.1, duration)}s` : undefined,
        '--delay': particle.delay !== undefined ? `${Math.max(0, particle.delay)}s` : index >= 5 ? `${index * .3}s` : undefined,
        '--drift-x': particle.drift !== undefined ? `${particle.drift}px` : undefined,
        '--sway': particle.sway !== undefined ? `${particle.sway}px` : undefined,
        '--turn': particle.rotation !== undefined ? `${particle.rotation}deg` : undefined,
        '--scale': particle.scale,
        left: particle.left,
        width: particle.displayWidth ?? asset.displayWidth,
      };
      return { asset, variant, style };
    });
  }, [scene, particles, count, duration]);
  const completed = useRef(new Set<string>());
  const [finished, setFinished] = useState(false);
  if (finished || !items.length) return null;
  return <span className="botanical-fall forest-drift" data-botanical-scene={scene} aria-hidden="true" style={distance ? { '--fall-distance': distance } as CSSProperties : undefined} onAnimationEnd={event => {
    if (event.animationName !== 'forest-fall') return;
    const index = (event.target as HTMLElement).dataset.botanicalPiece;
    if (index === undefined) return;
    completed.current.add(index);
    if (completed.current.size === items.length) setFinished(true);
  }}>
    {items.map(({ asset, variant, style }, index) => <span key={`${asset.id}-${index}`} className={`forest-drift-piece forest-${asset.type} ${variant}`} data-botanical-piece={index} data-botanical-id={asset.id} style={style}>
      <img src={asset.image} width={asset.width} height={asset.height} alt="" draggable={false} decoding="async"/>
    </span>)}
  </span>;
}
