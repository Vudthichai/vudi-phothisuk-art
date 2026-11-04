import { useCallback, useRef } from 'react';
import { forestPlacement, type ForestControls } from '../botanical/forest';
import { useForestMotion } from '../botanical/useForestMotion';
import candidate from './forest/mushroom-rejected.webp';
import '../components/ForestEnvironment.css';

const transform = (frame: number) => `translate(-${frame % 4 * 25}%, -${Math.floor(frame / 4) * 25}%)`;
/** DEV ONLY: diagnostic stepped playback. Never changes the asset's rejected status. */
export function MushroomStoryboard(controls: ForestControls) {
  const stage = useRef<HTMLDivElement>(null);
  const build = useCallback((element: HTMLElement, duration: number) => [element.querySelector('[data-storyboard-sheet]')!.animate(
    Array.from({ length: 16 }, (_, index) => ({ transform: transform(index), offset: index / 15, easing: 'steps(1, end)' })),
    { duration, fill: 'both' },
  )], []);
  const status = useForestMotion(stage, controls, build);
  return <div ref={stage} className="forest-environment mushroom-storyboard" data-status={status} aria-hidden="true" style={{ aspectRatio: '960 / 949' }}>
    <div className="forest-placement" style={forestPlacement(controls)}><div className="mushroom-storyboard-window">
      <img data-storyboard-sheet src={candidate} alt="" draggable={false} />
    </div></div>
    <span className="mushroom-study-watermark">UNAPPROVED · storyboard frames</span>
  </div>;
}
