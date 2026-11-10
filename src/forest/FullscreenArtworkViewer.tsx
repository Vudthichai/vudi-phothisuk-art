import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { ForestPhotograph, imageRoleLabel } from './ForestPhotograph';
import type { ForestImage } from './types';
import './FullscreenArtworkViewer.css';

type Point = { x: number; y: number };
type View = Point & { scale: number };
const fitted: View = { x: 0, y: 0, scale: 1 };
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

export function FullscreenArtworkViewer({ images, initialIndex, onClose }: {
  images: ForestImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
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
  return <dialog className="forest-fullscreen" ref={dialog} aria-label="Mother Nature photograph viewer"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }}>
    <div className="forest-fullscreen-bar">
      <p aria-live="polite">{image.caption ?? imageRoleLabel[image.role]} · {index + 1} / {images.length}</p>
      <button type="button" autoFocus onClick={onClose}>Close</button>
    </div>
    <ZoomablePhotograph key={image.id} image={image} move={move}/>
    <div className="forest-fullscreen-navigation">
      <button type="button" onClick={() => move(-1)}>Previous photograph</button>
      <button type="button" onClick={() => move(1)}>Next photograph</button>
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
    } else if (event.pointerType === 'mouse') {
      zoom(old.scale > 1 ? 1 : 2, point);
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
    <div className="forest-fullscreen-zoom" aria-label="Zoom controls">
      <button type="button" onClick={() => zoom(view.scale / 1.5)} disabled={view.scale <= 1}>Zoom out</button>
      <button type="button" onClick={() => zoom(view.scale * 1.5)} disabled={view.scale >= 4}>Zoom in</button>
      <button type="button" onClick={() => zoom(1)} disabled={view.scale === 1}>Fit</button>
    </div>
  </>;
}
