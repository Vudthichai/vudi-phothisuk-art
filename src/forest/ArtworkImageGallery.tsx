import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { ForestImage } from './types';
import { ForestPhotograph, imageRoleLabel } from './ForestPhotograph';
import './ArtworkImageGallery.css';

type Props = { title: string; images: readonly ForestImage[]; initialImageId?: string; editorialHero?: boolean; /** Reserved for a future approved, pointer-transparent overlay. No effect is activated. */ overlay?: ReactNode };
export function ArtworkImageGallery({ title, images, initialImageId, editorialHero, overlay }: Props) {
  return <Gallery key={`${title}:${initialImageId}:${images.map(image => image.id).join('|')}`} title={title} images={images} initialImageId={initialImageId} editorialHero={editorialHero} overlay={overlay}/>;
}
function Gallery({ title, images, initialImageId, editorialHero, overlay }: Props) {
  const [selected, setSelected] = useState(() => Math.max(0, images.findIndex(image => image.id === initialImageId)));
  const [displayed, setDisplayed] = useState(selected);
  const [loading, setLoading] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const pointer = useRef<{x:number;y:number} | null>(null);
  const swipeTime = useRef(0);
  const stageId = useId();
  useEffect(() => {
    if (selected === displayed) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const next = images[selected];
    const photo = new Image();
    photo.srcset = next.variants.map(v => `${v.src} ${v.width}w`).join(', ');
    photo.sizes = '(max-width:800px) 90vw, 62vw';
    photo.src = next.variants[next.variants.length - 1].src;
    const decoded = typeof photo.decode === 'function' ? photo.decode() : new Promise<void>((resolve,reject) => { photo.onload = () => resolve(); photo.onerror = reject; });
    decoded.then(() => { if (!cancelled) { setDisplayed(selected); setLoading(false); } }).catch(() => { if (!cancelled) { setLoadError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [selected, displayed, images]);
  const image = images[displayed];
  if (!image) return <p>Artwork photography is being prepared.</p>;
  const label = image.caption ?? imageRoleLabel[image.role];
  function enlarge() {
    dialog.current?.showModal();
    setEnlarged(true);
  }
  function choose(index: number, focus = false) {
    const next = (index + images.length) % images.length;
    setSelected(next); setLoadError(false);
    if (focus) (thumbnails.current?.querySelectorAll('button')[next] as HTMLButtonElement | undefined)?.focus();
  }
  function keyboard(event: KeyboardEvent, focus = false) {
    let next: number;
    if (event.key === 'ArrowRight') next = selected + 1;
    else if (event.key === 'ArrowLeft') next = selected - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = images.length - 1;
    else return;
    event.preventDefault(); choose(next, focus);
  }
  function swipeEnd(event: PointerEvent) {
    const start = pointer.current; pointer.current = null;
    if (!start || images.length < 2) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.5) { choose(selected + (dx < 0 ? 1 : -1)); swipeTime.current = Date.now(); }
  }
  return <div className="forest-image-gallery">
    <figure className="forest-selected-photo">
      <div className="forest-photo-stage" id={stageId} aria-busy={loading} onPointerDown={event => { if (event.pointerType === 'touch') pointer.current = {x:event.clientX,y:event.clientY}; }} onPointerUp={swipeEnd} onPointerCancel={() => { pointer.current = null; }}>
        <button type="button" className="forest-enlarge" aria-label={`Enlarge ${title}: ${label}`} onKeyDown={event => keyboard(event)} onClick={() => { if (Date.now() - swipeTime.current > 350) enlarge(); }}>
          <span key={image.id} className="forest-photo-swap" onError={() => setLoadError(true)}><ForestPhotograph image={image} eager sizes="(max-width:800px) 90vw, 62vw"/></span>
        </button>
        {overlay && <div className="forest-photo-overlay" aria-hidden="true">{overlay}</div>}
      </div>
      <figcaption>{label}{editorialHero ? <button className="text-link forest-enlarge-link" type="button" onClick={enlarge}>Enlarge artwork</button> : <span>{displayed + 1} / {images.length}</span>}</figcaption>
    </figure>
    {loadError && <p role="alert">This photograph could not load. Please select another view.</p>}
    {images.length > 1 && <>
      <div className="forest-photo-controls"><button type="button" onClick={() => choose(selected - 1)} aria-label="Previous photograph">Previous</button><p aria-live="polite">{loading ? `Loading ${imageRoleLabel[images[selected].role]}…` : `${label}, ${displayed + 1} of ${images.length}`}</p><button type="button" onClick={() => choose(selected + 1)} aria-label="Next photograph">Next</button></div>
      <div ref={thumbnails} className="forest-photo-thumbnails" role="group" aria-label={`${title} photograph views`} onKeyDown={event => keyboard(event,true)}>
        {images.map((photo,index) => <button type="button" key={photo.id} aria-label={`View ${photo.caption ?? imageRoleLabel[photo.role]}`} aria-pressed={index === selected} aria-controls={stageId} onClick={() => choose(index)}><ForestPhotograph image={{...photo,alt:''}} sizes="76px"/><span>{photo.caption ?? imageRoleLabel[photo.role]}</span></button>)}
      </div>
    </>}
    <dialog ref={dialog} className="forest-photo-dialog" aria-label={`${title} enlarged photograph`} onClose={() => setEnlarged(false)} onKeyDown={event => keyboard(event)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="forest-dialog-content"><button type="button" className="forest-dialog-close" autoFocus onClick={() => dialog.current?.close()}>Close enlarged view</button><EnlargedPhotograph key={`${image.id}:${enlarged}`} image={image} active={enlarged}/><p>{label}</p>{images.length > 1 && <div className="forest-photo-controls"><button type="button" onClick={() => choose(selected-1)}>Previous photograph</button><button type="button" onClick={() => choose(selected+1)}>Next photograph</button></div>}</div>
    </dialog>
  </div>;
}


function EnlargedPhotograph({ image, active }: { image: ForestImage; active: boolean }) {
  const [ready, setReady] = useState(false);
  const large = image.enlargement;
  return <div className="forest-dialog-photo">
    <ForestPhotograph image={image} eager sizes="90vw"/>
    {active && large && <img
      className={ready ? 'forest-hires is-ready' : 'forest-hires'}
      src={large.src} width={large.width} height={large.height} alt=""
      aria-hidden="true" decoding="async" onLoad={() => setReady(true)}
    />}
  </div>;
}
