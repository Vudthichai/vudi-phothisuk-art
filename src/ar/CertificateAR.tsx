import { useEffect, useRef } from 'react';
import type { ARExperience } from './config';
import './CertificateAR.css';
export default function CertificateAR({ experience, onClose }: { experience:ARExperience; onClose:()=>void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement|null;
    const previousOverflow = document.body.style.overflow;
    const element = dialog.current!;
    element.showModal(); document.body.style.overflow = 'hidden';
    element.querySelector<HTMLButtonElement>('button')?.focus();
    const message = (event:MessageEvent) => {
      if (event.origin === location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'vpa-ar-exit') onClose();
    };
    window.addEventListener('message',message);
    return () => {
      window.removeEventListener('message',message);
      frame.current?.contentWindow?.postMessage({type:'vpa-ar-stop'},location.origin);
      if (element.open) element.close();
      document.body.style.overflow = previousOverflow; previousFocus?.focus();
    };
  },[onClose]);
  return <dialog ref={dialog} className="certificate-ar-modal" aria-labelledby="certificate-ar-title" onCancel={event=>{event.preventDefault();onClose();}}>
    <header><h2 id="certificate-ar-title">{experience.title} · AR prototype</h2><button type="button" onClick={onClose}>Exit AR</button></header>
    <iframe ref={frame} src={`/ar-camera.html?experience=${encodeURIComponent(experience.id)}`} title={`${experience.title} augmented reality camera`} allow="camera" referrerPolicy="same-origin"/>
  </dialog>;
}
