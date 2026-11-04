import React, { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MushroomStoryboard } from './MushroomStoryboard';
import { PathVine } from '../components/PathVine';
import { BarkReveal, ForestFoliage, VineGrowth } from '../components/ForestEnvironment';
import type { ForestControls } from '../botanical/forest';
import { bark, foliage, mushroom, vine, vinePaths, vineLeaves } from './forest/assets';
import candidate from './forest/mushroom-rejected.webp';
import './flower-preview.css';
import './forest-preview.css';
function Study({ id, title, note, quality, replayLabel, blocked = false, hasIntensity = false, children }: { id: string; title: string; note: string; quality: 'approved prototype' | 'experimental' | 'asset-blocked'; replayLabel?: string; blocked?: boolean; hasIntensity?: boolean; children: (controls: ForestControls) => ReactNode }) {
  const [replayKey, setReplay] = useState(0);
  const [duration, setDuration] = useState(6);
  const [intensity, setIntensity] = useState(.7);
  const [scale, setScale] = useState(.9);
  const [cue, setCue] = useState('idle');
  return <section id={id} className="forest-study"><h2>{title}</h2><p className="forest-quality">{quality}</p><p>{note}</p>
    <div className="forest-review-stage">{children({ replayKey, duration, intensity, scale, onCue: setCue })}</div>
    <div className="forest-review-controls">
      <label>Duration: {duration}s <input aria-label={`${title} duration`} type="range" min="3" max="10" value={duration} onChange={event => setDuration(+event.target.value)} /></label>
      {hasIntensity && <label>Intensity: {intensity}<input aria-label={`${title} intensity`} type="range" min="0" max="1.5" step=".1" value={intensity} onChange={event => setIntensity(+event.target.value)} /></label>}
      <label>Scale: {scale}<input aria-label={`${title} scale`} type="range" min=".5" max="1" step=".1" value={scale} onChange={event => setScale(+event.target.value)} /></label>
      <button disabled={blocked} onClick={() => setReplay(value => value + 1)}>{replayLabel ?? `Replay ${title.toLowerCase()}`}</button>
    </div><p className="forest-review-status" role="status">{blocked ? 'Blocked: missing approved sequence.' : `Cue: ${cue}. Reduced motion shows the static final state. ${quality === 'asset-blocked' ? 'Only rejected storyboard frames play; approved growth is still blocked.' : ''}`}</p>
  </section>;
}
function Preview() {
  const [vinePath, setVinePath] = useState<keyof typeof vinePaths>('meander');
  return <main><p>Local development only · Phase 3</p><h1>Living forest environments</h1>
    <p>Asset and motion studies, not production-ready effects. Nothing here is assigned to a painting. <a href="/dev/flower-bloom.html">Phase 2 flower review</a></p>
    <nav aria-label="Prototype review"><a href="#mushroom">Mushroom</a> · <a href="#vine">Vine</a> · <a href="#foliage">Foliage</a> · <a href="#bark">Bark</a></nav>
    <Study id="mushroom" title="Mushroom growth study" quality="asset-blocked" replayLabel="Replay unapproved storyboard" note={`Visible diagnostic playback of sixteen rejected states, not a believable growth animation. ${mushroom.status === 'needs-assets' ? mushroom.reason : ''}`}>
      {controls => <MushroomStoryboard {...controls} />}
    </Study>
    <details><summary>Inspect full rejected mushroom sheet</summary><p>Stepped playback is a review aid. It does not approve these images or pass them into the gated growth player. Compare moss, stem anchor, cap continuity and contaminated edges.</p>
      <div className="candidate ivory"><img src={candidate} alt="Rejected mushroom growth storyboard against ivory" /></div>
      <div className="candidate dark"><img src={candidate} alt="Rejected mushroom growth storyboard against dark green" /></div>
    </details>
    <div className="forest-path-controls"><label htmlFor="vine-path">Vine path</label><select id="vine-path" value={vinePath} onChange={event => setVinePath(event.target.value as keyof typeof vinePaths)}><option value="meander">Woodland meander</option><option value="wrap">Frame edge wrap</option></select></div>
    <Study id="vine" title="Vine growth" quality="experimental" note="Working illustrated stem with photographic Phase 1 leaves, not a photorealistic growth sequence. The curved stem extends gradually; irregularly spaced leaves appear at its tip's passing. Change path to try an edge wrap. Leaf texture is photographic; stem shading and leaf unfolding are approximations.">
      {controls => <PathVine path={vinePaths[vinePath]} leaves={vineLeaves} {...controls} />}
    </Study>
    <details><summary>Compare the earlier photographic vine reveal</summary>
      <Study id="vine-photo" title="Photographic vine mask" quality="experimental" note="Earlier photograph revealed along its registered path. Leaf edges need refinement. The source cannot follow an arbitrary new curve without warping, which is why the configurable study above uses an illustrated stem.">
        {controls => <VineGrowth asset={vine} {...controls} />}
      </Study>
    </details>
    <Study id="foliage" title="Foliage motion" quality="approved prototype" hasIntensity note="Existing realistic Phase 1 cutouts with independent, irregular one-shot breeze envelopes and subtle depth pivoting. Approved here only as a cutout motion prototype, not a production environment. Credible restrained cutout motion, not a connected branch simulation.">
      {controls => <ForestFoliage pieces={foliage} {...controls} />}
    </Study>
    <Study id="bark" title="Bark reveal" quality="experimental" note="Experimental ridge-driven dissolve: tonal bands of this exact generated bark clear at staggered times. The existing artwork below remains untouched. This is a local technical test, not an assignment to Mother Nature. Intensity is unused.">
      {controls => <BarkReveal asset={bark} artwork={{ src: "/artworks/forest/mother-nature-900.webp", width: 900, height: 1351 }} {...controls} />}
    </Study>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Preview /></React.StrictMode>);
