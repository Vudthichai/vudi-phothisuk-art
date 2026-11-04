import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ForestControls } from './forest';

type Build = (element: HTMLElement, milliseconds: number, intensity: number) => Animation[];
/** One-shot lifecycle for the new layered prototypes. Phase 1/2 playback is unchanged. */
export function useForestMotion(stage: RefObject<HTMLDivElement | null>, controls: ForestControls, build: Build) {
  const { duration = 5, trigger = 'manual', replayKey = 0, intensity = 1 } = controls;
  const cue = useRef(controls.onCue); cue.current = controls.onCue;
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState('loading');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  // Key components by asset identity; decode all scene images before motion begins.
  useEffect(() => {
    let cancelled = false;
    Promise.all(Array.from(stage.current?.querySelectorAll('img') ?? []).map(image => image.decode()))
      .then(() => { if (!cancelled) { setLoaded(true); setStatus('idle'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [stage]);
  useEffect(() => {
    setVisible(false);
    if (trigger !== 'visible' || !stage.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { threshold: .25 });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [trigger, stage]);
  useEffect(() => {
    if (!loaded || !stage.current) return;
    if (reduced) { setStatus('reduced-motion'); return; }
    if (!(replayKey > 0 || trigger === 'mount' || (trigger === 'visible' && visible))) { setStatus('idle'); return; }
    let cancelled = false;
    const animations = build(stage.current, Math.max(.1, Math.min(30, duration)) * 1000, Math.max(0, Math.min(2, intensity)));
    setStatus('playing'); cue.current?.('start');
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (!cancelled) { setStatus('settled'); cue.current?.('complete'); }
    }).catch(() => { /* Cancellation is expected on replay, reduced motion or unmount. */ });
    return () => { cancelled = true; animations.forEach(animation => animation.cancel()); };
  }, [loaded, reduced, duration, trigger, replayKey, visible, intensity, stage, build]);
  return status;
}
