import React, { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MushroomGrowth } from '../components/MushroomGrowth';
import { BarkReveal, ForestFoliage, VineGrowth } from '../components/ForestEnvironment';
import type { ForestControls } from '../botanical/forest';
import { bark, foliage, mushroom, vine } from './forest/assets';
import candidate from './forest/mushroom-rejected.webp';
import './flower-preview.css';
import './forest-preview.css';
function Study({ id, title, note, blocked = false, hasIntensity = false, children }: { id: string; title: string; note: string; blocked?: boolean; hasIntensity?: boolean; children: (controls: ForestControls) => ReactNode }) {
  const [replayKey, setReplay] = useState(0);
  const [duration, setDuration] = useState(6);
  const [intensity, setIntensity] = useState(.7);
  const [scale, setScale] = useState(.9);
  const [cue, setCue] = useState('idle');
  return <section id={id} className="forest-study"><h2>{title}</h2><p>{note}</p>
    <div className="forest-review-stage">{children({ replayKey, duration, intensity, scale, onCue: setCue })}</div>
    <div className="forest-review-controls">
      <label>Duration: {duration}s <input aria-label={`${title} duration`} type="range" min="3" max="10" value={duration} onChange={event => setDuration(+event.target.value)} /></label>
      {hasIntensity && <label>Intensity: {intensity}<input aria-label={`${title} intensity`} type="range" min="0" max="1.5" step=".1" value={intensity} onChange={event => setIntensity(+event.target.value)} /></label>}
      <label>Scale: {scale}<input aria-label={`${title} scale`} type="range" min=".5" max="1" step=".1" value={scale} onChange={event => setScale(+event.target.value)} /></label>
      <button disabled={blocked} onClick={() => setReplay(value => value + 1)}>Replay {title.toLowerCase()}</button>
    </div><p className="forest-review-status" role="status">{blocked ? 'Blocked: missing approved sequence.' : `Cue: ${cue}. Reduced motion shows the static final state.`}</p>
  </section>;
}
function Preview() {
  return <main><p>Local development only · Phase 3</p><h1>Living forest environments</h1>
    <p>Asset and motion studies, not production-ready effects. Nothing here is assigned to a painting. <a href="/dev/flower-bloom.html">Phase 2 flower review</a></p>
    <nav aria-label="Prototype review"><a href="#mushroom">Mushroom</a> · <a href="#vine">Vine</a> · <a href="#foliage">Foliage</a> · <a href="#bark">Bark</a></nav>
    <Study id="mushroom" title="Mushroom growth" blocked note={mushroom.status === 'needs-assets' ? mushroom.reason : ''}>
      {controls => <MushroomGrowth asset={mushroom} duration={controls.duration} scale={controls.scale} replayKey={controls.replayKey} />}
    </Study>
    <details><summary>Inspect rejected mushroom sequence study</summary><p>Sixteen independent generated states, not a playable growth sequence. Compare moss, stem anchor and cap continuity; the edges also fail review.</p>
      <div className="candidate ivory"><img src={candidate} alt="Rejected mushroom growth storyboard against ivory" /></div>
      <div className="candidate dark"><img src={candidate} alt="Rejected mushroom growth storyboard against dark green" /></div>
    </details>
    <Study id="vine" title="Vine growth" note="Experimental photographic path reveal. The stem follows a registered curved mask; existing leaves emerge as the path passes. This is not biological leaf unfurling. Edges need refinement before public use. Intensity has no role in growth geometry.">
      {controls => <VineGrowth asset={vine} {...controls} />}
    </Study>
    <Study id="foliage" title="Foliage motion" hasIntensity note="Existing realistic Phase 1 cutouts with independent, irregular one-shot breeze envelopes. Credible restrained cutout motion, not a connected branch simulation.">
      {controls => <ForestFoliage pieces={foliage} {...controls} />}
    </Study>
    <Study id="bark" title="Bark reveal" note="Experimental ridge-driven dissolve: tonal bands of this exact generated bark clear at staggered times. The existing artwork below remains untouched. This is a local technical test, not an assignment to Mother Nature. Intensity is unused.">
      {controls => <BarkReveal asset={bark} artwork={{ src: "/artworks/forest/mother-nature-900.webp", width: 900, height: 1351 }} {...controls} />}
    </Study>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Preview /></React.StrictMode>);
