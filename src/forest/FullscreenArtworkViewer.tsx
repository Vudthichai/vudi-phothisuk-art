import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { ForestPhotograph, imageRoleLabel } from './ForestPhotograph';
import type { ForestImage } from './types';
import './FullscreenArtworkViewer.css';

type Point = { x: number; y: number };
type View = Point & { scale: number };
const fitted: View = { x: 0, y: 0, scale: 1 };
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

const icons = {
  close: 'M6 6l12 12M18 6L6 18',
  previous: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  minus: 'M5 12h14',
  plus: 'M5 12h14M12 5v14',
  fit: 'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5',
};

function ViewerControl({ icon, label, onClick, disabled, autoFocus, placement }: {
  icon: keyof typeof icons;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  placement?: string;
}) {
  return <button type="button" className={`forest-viewer-control ${placement ?? ''}`}
    aria-label={label} title={label} onClick={onClick} disabled={disabled} autoFocus={autoFocus}>
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[icon]}/>
    </svg>
  </button>;
}

export function FullscreenArtworkViewer({ title, images, initialIndex, onClose }: {
  title: string;
  images: ForestImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function revealControls() {
    clearTimeout(idleTimer.current);
    setIdle(false);
    idleTimer.current = setTimeout(() => setIdle(true), 2400);
  }
  useEffect(() => {
    revealControls();
    return () => clearTimeout(idleTimer.current);
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  function move(by: number) {
    setIndex(current => (current + by + images.length) % images.length);
  }

  const image = images[index];
  return <dialog className="forest-fullscreen" ref={dialog} data-idle={idle} onPointerMove={revealControls} onPointerDown={revealControls} aria-label={`${title} photograph viewer`}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      revealControls();
      if (event.key === 'Tab') {
        const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(control => control.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (document.activeElement?.closest('.forest-fullscreen-zoom')) {
          event.currentTarget.querySelector<HTMLButtonElement>('.forest-viewer-close')?.focus();
        }
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }}>
    <ViewerControl icon="close" label="Close viewer" autoFocus onClick={onClose} placement="forest-viewer-close"/>
    <ZoomablePhotograph key={image.id} image={image} move={move}/>
    <ViewerControl icon="previous" label="Previous photograph" onClick={() => move(-1)} placement="forest-viewer-previous"/>
    <ViewerControl icon="next" label="Next photograph" onClick={() => move(1)} placement="forest-viewer-next"/>
    <p className="forest-viewer-caption" aria-live="polite">
      <span className="forest-viewer-photo-label">{image.caption ?? imageRoleLabel[image.role]}</span>
      <span className="forest-viewer-count">{index + 1} / {images.length}</span>
    </p>
    <div className="forest-viewer-pagination" role="group" aria-label="Choose a photograph">
      {images.map((photo, position) => (
        <button type="button" key={photo.id}
          aria-label={`Photograph ${position + 1}: ${photo.caption ?? imageRoleLabel[photo.role]}`}
          aria-current={position === index ? 'true' : undefined} onClick={() => setIndex(position)}/>
      ))}
    </div>
  </dialog>;
}

function ZoomablePhotograph({ image, move }: { image: ForestImage; move: (by: number) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(fitted);
  const current = useRef(fitted);
  const [loaded, setLoaded] = useState(false);
  const pointers = useRef(new Map<number, Point>());
  const start = useRef<Point | null>(null);
  const moved = useRef(false);
  const lastTap = useRef<{ point: Point; time: number } | null>(null);
  const large = image.enlargement;

  function apply(next: View) {
    const bounds = stage.current;
    const photo = frame.current;
    if (!bounds || !photo) return;
    const maxX = Math.max(0, (photo.offsetWidth * next.scale - bounds.clientWidth) / 2);
    const maxY = Math.max(0, (photo.offsetHeight * next.scale - bounds.clientHeight) / 2);
    const bounded = {
      scale: next.scale,
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
    current.current = bounded;
    setView(bounded);
  }

  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => apply(current.current));
    if (stage.current) observer.observe(stage.current);
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  function zoom(scale: number, at?: Point, previous = at) {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return;
    const old = current.current;
    const target = Math.max(1, Math.min(4, scale));
    if (target === 1) { apply(fitted); return; }
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const from = previous ?? center;
    const to = at ?? center;
    const ratio = target / old.scale;
    apply({
      scale: target,
      x: to.x - center.x - (from.x - center.x - old.x) * ratio,
      y: to.y - center.y - (from.y - center.y - old.y) * ratio,
    });
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const point = { x: event.clientX, y: event.clientY };
    if (!pointers.current.size) {
      start.current = point;
      moved.current = false;
    } else moved.current = true;
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const point = { x: event.clientX, y: event.clientY };
    const other = [...pointers.current].find(([id]) => id !== event.pointerId)?.[1];
    pointers.current.set(event.pointerId, point);
    if (other) {
      const before = distance(previous, other);
      if (before > 0) zoom(current.current.scale * distance(point, other) / before,
        { x: (point.x + other.x) / 2, y: (point.y + other.y) / 2 },
        { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 });
      return;
    }
    if (start.current && distance(start.current, point) > 6) moved.current = true;
    const old = current.current;
    if (old.scale > 1 && moved.current) apply({ ...old, x: old.x + point.x - previous.x, y: old.y + point.y - previous.y });
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(event.pointerId) || pointers.current.size) return;
    const point = { x: event.clientX, y: event.clientY };
    const origin = start.current;
    const old = current.current;
    if (moved.current) {
      lastTap.current = null;
      if (event.pointerType === 'touch' && old.scale === 1 && origin) {
        const dx = point.x - origin.x;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(point.y - origin.y) * 1.5) move(dx < 0 ? 1 : -1);
      }
    } else {
      const time = Date.now();
      const previous = lastTap.current;
      if (previous && time - previous.time < 330 && distance(point, previous.point) < 34) {
        zoom(old.scale > 1 ? 1 : 2, point);
        lastTap.current = null;
      } else lastTap.current = { time, point };
    }
  }

  return <>
    <div className="forest-fullscreen-stage" ref={stage} data-zoomed={view.scale > 1}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
      onPointerCancel={event => { pointers.current.delete(event.pointerId); start.current = null; }}
      onLostPointerCapture={event => { pointers.current.delete(event.pointerId); }}>
      <div className="forest-fullscreen-photo" ref={frame}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
        <ForestPhotograph image={image} eager sizes="100vw"/>
        {large && <img className="forest-fullscreen-hires" src={large.src} width={large.width} height={large.height}
          alt="" aria-hidden="true" data-ready={loaded} decoding="async" onLoad={() => setLoaded(true)}/>}
      </div>
    </div>
    <div className="forest-fullscreen-zoom" role="group" aria-label="Zoom controls">
      <ViewerControl icon="minus" label="Zoom out" onClick={() => zoom(view.scale / 1.5)} disabled={view.scale <= 1}/>
      <ViewerControl icon="plus" label="Zoom in" onClick={() => zoom(view.scale * 1.5)} disabled={view.scale >= 4}/>
      <ViewerControl icon="fit" label="Fit photograph" onClick={() => zoom(1)} disabled={view.scale === 1}/>
    </div>
  </>;
}
