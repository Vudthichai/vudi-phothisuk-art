import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { forestPlacement, type ForestControls, type VineLeaf } from '../botanical/forest';
import { useForestMotion } from '../botanical/useForestMotion';
import './ForestEnvironment.css';

// Invert the stem's nonuniform progress so a leaf never appears before its attachment.
function arrival(at: number) {
  const progress = Math.max(0, Math.min(1, at));
  if (progress <= .21) return progress / .21 * .24;
  if (progress <= .57) return .24 + (progress - .21) / .36 * .4;
  return .64 + (progress - .57) / .43 * .36;
}

/** Illustrated textured stem + existing photographic leaves. Not a photographic growth sequence. */
export function PathVine({ path, leaves, ...controls }: ForestControls & { path: string; leaves: readonly VineLeaf[] }) {
  return <PathVineScene key={`${path}:${leaves.map(leaf => leaf.image).join('|')}`} path={path} leaves={leaves} {...controls} />;
}
function PathVineScene({ path, leaves, ...controls }: ForestControls & { path: string; leaves: readonly VineLeaf[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const guide = useRef<SVGPathElement>(null);
  const gradient = useId().replace(/:/g, '');
  const [attachments, setAttachments] = useState<{ x: number; y: number; angle: number }[]>([]);
  useLayoutEffect(() => {
    if (!guide.current) return;
    const curve = guide.current;
    const length = curve.getTotalLength();
    setAttachments(leaves.map(leaf => {
      const distance = Math.max(0, Math.min(1, leaf.at)) * length;
      const point = curve.getPointAtLength(distance);
      const before = curve.getPointAtLength(Math.max(0, distance - .1));
      const after = curve.getPointAtLength(Math.min(length, distance + .1));
      return { x: point.x, y: point.y, angle: Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI + 90 + leaf.angle };
    }));
  }, [path, leaves]);
  const build = useCallback((element: HTMLElement, duration: number) => {
    const stems = [...element.querySelectorAll('[data-growing-stem]')].map(stem => stem.animate([
      { strokeDashoffset: '100' }, { strokeDashoffset: '79', offset: .24 },
      { strokeDashoffset: '43', offset: .64 }, { strokeDashoffset: '0' },
    ], { duration: duration * .85, fill: 'both', easing: 'linear' }));
    const growth = [...element.querySelectorAll('[data-vine-leaf]')].map((leaf, index) => leaf.animate([
      { opacity: 0, transform: 'rotateY(65deg)' },
      { opacity: 1, transform: 'rotateY(-4deg)', offset: .8 },
      { opacity: 1, transform: 'rotateY(0deg)' },
    ], { duration: duration * .15, delay: duration * arrival(leaves[index].at) * .85, fill: 'both', easing: 'ease-out' }));
    return [...stems, ...growth];
  }, [leaves]);
  const status = useForestMotion(stage, controls, build);
  return <div ref={stage} className="forest-environment forest-path-vine" data-status={status} aria-hidden="true">
    {leaves.map(leaf => <img key={leaf.id} className="forest-preload" src={leaf.image} alt="" />)}
    <svg className="forest-placement" viewBox="0 0 100 100" style={forestPlacement(controls)}>
      <defs><linearGradient id={gradient} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#374e29"/><stop offset=".48" stopColor="#83904a"/><stop offset="1" stopColor="#456d38"/></linearGradient></defs>
      <path ref={guide} d={path} fill="none" stroke="none" />
      <path data-growing-stem d={path} pathLength="100" strokeDasharray="100" strokeWidth=".65" strokeLinecap="round" fill="none" stroke={`url(#${gradient})`}/>
      <path data-growing-stem d={path} pathLength="100" strokeDasharray="100" strokeWidth=".12" opacity=".45" fill="none" stroke="#d4c58a"/>
      {leaves.map((leaf, index) => {
        const attachment = attachments[index];
        const height = leaf.size * leaf.height / leaf.width;
        return attachment && <g key={leaf.id} transform={`translate(${attachment.x} ${attachment.y}) rotate(${attachment.angle})`}>
          <g data-vine-leaf><image href={leaf.image} x={-leaf.size / 2} y={-height * .95} width={leaf.size} height={height} /></g>
        </g>;
      })}
    </svg>
  </div>;
}
