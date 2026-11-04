import { useEffect, useState } from 'react';
import { BotanicalFall } from '../../components/BotanicalFall';
import { BarkReveal, ForestFoliage } from '../../components/ForestEnvironment';
import { FlowerBloom } from '../../components/FlowerBloom';
import { MushroomGrowth } from '../../components/MushroomGrowth';
import { getBotanicalAsset } from '../../botanical/registry';
import { playableSteps, type ArtworkExperience as Configuration, type ExperienceStep } from './model';
import './experience.css';

function assetUrls(step: ExperienceStep): readonly string[] {
  switch (step.family) {
    case 'fall': return step.particles.map(p => getBotanicalAsset(p.assetId).image);
    case 'foliage': return step.pieces.map(p => p.image);
    case 'bark': return [step.asset.image, ...step.asset.ridgeMasks];
    default: return step.asset.status === 'approved' ? [...step.asset.frames, step.asset.poster] : [];
  }
}
function Effect({ step, experience, run }: { step: ExperienceStep; experience: Configuration; run: number }) {
  // Defensive gate: experimental opt-in never overrides rejected asset readiness.
  if (step.readiness === 'asset-blocked') return null;
  switch (step.family) {
    case 'fall': return <BotanicalFall scene="reveal" particles={step.particles} distance={step.distance} />;
    case 'foliage': return <ForestFoliage pieces={step.pieces} duration={step.duration} intensity={step.intensity} trigger="mount" />;
    case 'bark': return <BarkReveal asset={step.asset} artwork={experience.photograph} duration={step.duration} trigger="mount" />;
    case 'flower': return <FlowerBloom asset={step.asset} duration={step.duration} replayKey={run} />;
    case 'mushroom': return <MushroomGrowth asset={step.asset} duration={step.duration} replayKey={run} />;
  }
}

/** Private configuration-driven orchestration; existing effect renderers own their motion. */
export function ArtworkExperience({ experience }: { experience: Configuration }) {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [forceReduced, setForceReduced] = useState(false);
  const [experimental, setExperimental] = useState(false);
  const [run, setRun] = useState(0);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('Ready');
  const [active, setActive] = useState<ExperienceStep[]>([]);
  const [revealed, setRevealed] = useState(true);
  const [photoError, setPhotoError] = useState(false);
  const still = reduced || forceReduced;
  const selected = playableSteps(experience, experimental);
  const canPlay = selected.length > 0 && !photoError;
  function skip() { setRunning(false); setActive([]); setRevealed(true); setPhase('Skipped — artwork remains available'); }
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const stop = () => { if (document.hidden) skip(); };
    document.addEventListener('visibilitychange', stop);
    return () => document.removeEventListener('visibilitychange', stop);
  }, []);
  useEffect(() => {
    setActive([]); setRevealed(true);
    if (!running) return;
    if (still) { setRunning(false); setPhase('Reduced motion — static artwork'); return; }
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const steps = playableSteps(experience, experimental);
    setPhase('Loading scene assets');
    const urls = new Set([experience.photograph.src, ...(experience.detail ? [experience.detail.src] : []), ...steps.flatMap(assetUrls)]);
    Promise.all([...urls].map(src => { const image = new Image(); image.src = src; return image.decode(); })).then(() => {
      if (cancelled) return;
      setPhase('Playing'); setRevealed(!experience.detail);
      for (const step of steps) {
        timers.push(setTimeout(() => setActive(items => [...items, step]), step.at * 1000));
        timers.push(setTimeout(() => setActive(items => items.filter(item => item.id !== step.id)), (step.at + step.duration) * 1000));
      }
      timers.push(setTimeout(() => setRevealed(true), experience.revealAt * 1000));
      const end = Math.max(experience.revealAt, ...steps.map(step => step.at + step.duration));
      timers.push(setTimeout(() => { setActive([]); setRevealed(true); setRunning(false); setPhase('Complete'); }, end * 1000 + 150));
    }).catch(() => {
      if (!cancelled) { setRunning(false); setPhase('Scene assets failed to load — artwork remains available'); }
    });
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [experience, experimental, run, running, still]);

  return <article className="artwork-experience" data-experience={experience.artworkId}>
    <header><p className="experience-quality">{experience.readiness}</p><h2>{experience.title}</h2><p className="experience-direction">{experience.experienceTitle}</p><p>{experience.introduction}</p></header>
    <div className="experience-stage" style={{ aspectRatio: `${experience.photograph.width}/${experience.photograph.height}` }}>
      <img className="experience-artwork" src={experience.photograph.src} width={experience.photograph.width} height={experience.photograph.height} alt={experience.photograph.alt} onError={() => { setPhotoError(true); skip(); }} />
      {experience.detail && !still && <img className={`experience-detail ${revealed ? 'is-revealed' : ''}`} src={experience.detail.src} width={experience.detail.width} height={experience.detail.height} alt="" aria-hidden="true" />}
      {!still && running && <div className="experience-effects" aria-hidden="true">{active.map(step => <div className={`experience-layer experience-${step.family}`} key={`${run}:${step.id}`} data-step={step.id}><Effect step={step} experience={experience} run={run} /></div>)}</div>}
    </div>
    {experience.photograph.status === 'missing' && <p className="experience-placeholder-note">Development placeholder — {experience.title} photograph missing. No replacement artwork was generated.</p>}
    {photoError && <p role="alert">Artwork image could not load.</p>}
    <div className="experience-controls">
      <button disabled={!canPlay} onClick={() => { setRun(value => value + 1); setRunning(true); }}>{run ? 'Replay experience' : 'Start experience'}</button>
      <button onClick={skip}>Skip animation / show artwork</button>
      <label><input type="checkbox" checked={forceReduced} onChange={event => setForceReduced(event.target.checked)} /> Preview reduced motion</label>
      {experience.steps.some(step => step.readiness === 'experimental') && <label><input type="checkbox" checked={experimental} onChange={event => { skip(); setExperimental(event.target.checked); }} /> Include experimental effects (private only)</label>}
    </div>
    <p role="status">{still ? 'Reduced motion — static artwork; no effects' : !canPlay ? experience.steps.length === 0 ? 'Static experience — no animation assigned' : 'Asset-blocked — no approved playable sequence selected' : phase}</p>
    <h3>Assigned animation families</h3><ul>{experience.steps.map(step => <li key={step.id}><strong>{step.family}</strong> · {step.readiness} · {step.at}s–{step.at + step.duration}s. {step.note}</li>)}</ul>
    {experience.missing.length > 0 && <><h3>Required before activation</h3><ul>{experience.missing.map(item => <li key={item}>{item}</li>)}</ul></>}
    <p>No public activation is approved by this preview. Passing tests does not establish visual readiness.</p>
  </article>;
}
