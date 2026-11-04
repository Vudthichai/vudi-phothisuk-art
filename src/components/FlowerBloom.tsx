import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { FlowerSequence } from '../botanical/bloom';
import './FlowerBloom.css';

type Props = {
  asset: FlowerSequence;
  duration?: number;
  scale?: number;
  placement?: CSSProperties['objectPosition'];
  trigger?: 'mount' | 'visible' | 'manual';
  /** Change to request a replay, including when trigger is manual. */
  replayKey?: number;
  gentleMotion?: boolean;
};

export function FlowerBloom({ asset, duration = asset.duration, scale = 1,
  placement = 'center', trigger = 'manual', replayKey = 0, gentleMotion = false }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [frame, setFrame] = useState(0);
  const [settled, setSettled] = useState(false);
  const approved = asset.status === 'approved';

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false); setFailed(false);
    if (asset.status !== 'approved') return;
    // Decode the entire small sequence before playback to prevent flashing.
    Promise.all([...asset.frames, asset.poster].map(src => {
      const image = new Image(); image.src = src; return image.decode();
    })).then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [asset]);

  useEffect(() => {
    setVisible(false);
    if (trigger !== 'visible' || !stage.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true); observer.disconnect();
      }
    }, { threshold: .25 });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [trigger, asset]);

  useEffect(() => {
    setFrame(0); setSettled(false);
    if (!approved || !ready || reduced || !(replayKey > 0 || trigger === 'mount' || (trigger === 'visible' && visible))) return;
    const milliseconds = Math.max(100, duration * 1000);
    let request = 0;
    let start: number | undefined;
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min(1, (time - start) / milliseconds);
      setFrame(Math.min(asset.frames.length - 1, Math.floor(progress * asset.frames.length)));
      if (progress < 1) request = requestAnimationFrame(tick);
      else setSettled(true);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [asset, approved, ready, reduced, duration, trigger, visible, replayKey]);

  const style = { aspectRatio: `${asset.width} / ${asset.height}`, '--flower-size': `${Math.max(.1, Math.min(1, scale)) * 100}%`, '--flower-placement': placement } as CSSProperties;
  return <div ref={stage} className="flower-bloom" style={style} aria-hidden="true"
    data-status={!approved ? 'needs-assets' : failed ? 'error' : !ready ? 'loading' : reduced ? 'reduced-motion' : settled ? 'settled' : 'ready'}>
    {asset.status === 'approved' && ready && <img alt="" draggable={false}
      className={settled && gentleMotion && !reduced ? 'flower-bloom__settled' : undefined}
      src={reduced ? asset.poster : asset.frames[frame]} width={asset.width} height={asset.height} />}
  </div>;
}
