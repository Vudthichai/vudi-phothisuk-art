import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FlowerBloom } from '../components/FlowerBloom';
import type { FlowerSequence } from '../botanical/bloom';
import candidate from './flowers/white-lily-rejected.webp';
import './flower-preview.css';

const whiteLily: FlowerSequence = {
  id: 'white-lily', species: 'White lily visual study', width: 400, height: 400,
  duration: 4, status: 'needs-assets', frames: [],
  reason: 'Generated states change petal structure and contain transparency artifacts. A registered, continuous opening sequence is required.',
};
function Preview() {
  const [replay, setReplay] = useState(0);
  return <main><p>Private local development · Phase 2</p><h1>Living white flower</h1>
    <p role="status">Awaiting approved imagery. {whiteLily.status === 'needs-assets' && whiteLily.reason}</p>
    <div className="review-stage"><FlowerBloom asset={whiteLily} replayKey={replay} /><span>No approved bloom loaded</span></div>
    <button disabled={whiteLily.status !== 'approved'} onClick={() => setReplay(value => value + 1)}>Replay bloom</button>
    <p>Playback stays disabled until a coherent sequence passes visual review. Reduced motion displays only the final poster.</p>
    <h2>Rejected generation study</h2><p>Sixteen generated snapshots, not an animation. Inspect petal continuity and edges on both backgrounds. Not approved for playback or public use.</p>
    <div className="candidate ivory"><img src={candidate} alt="Rejected sixteen-state white lily study, progressing from bud to open flower" /></div>
    <div className="candidate dark"><img src={candidate} alt="Same rejected study against dark green for edge inspection" /></div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Preview /></React.StrictMode>);
