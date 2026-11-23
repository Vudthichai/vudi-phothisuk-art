import { arById } from './config';
import type { ARSession } from './engine';
import './camera.css';
const root=document.getElementById('ar-root')!;
const experience=arById(new URLSearchParams(location.search).get('experience'));
root.innerHTML=`<section class="ar-intro"><p class="ar-eyebrow">Forest &amp; Flowers · AR prototype</p><h1>A golden petal.</h1><p id="ar-instructions">Place your physical certificate on a flat surface in even light. Point the rear camera at the complete artwork image on its front, not the QR code.</p><img id="ar-target-preview" alt="The Mother Nature image to find on the front of the original certificate" width="680" height="1024"><p>This prototype supports the <strong id="ar-certificate-name"></strong>. Camera images stay on your device; nothing is recorded or uploaded.</p><button id="ar-start" type="button">Start camera</button><p id="ar-support" role="status"></p><button id="ar-intro-back" type="button">Back to certificate</button></section><div class="ar-surface" hidden><video muted autoplay playsinline aria-label="Live rear camera"></video></div><aside class="ar-hud" hidden><p id="ar-status" role="status" aria-live="polite"></p><p id="ar-help">Keep the full artwork image in view and move slowly.</p><button id="ar-retry" type="button" hidden>Try again</button><button id="ar-back" type="button">Back to certificate</button></aside>`;
const intro=root.querySelector<HTMLElement>('.ar-intro')!,surface=root.querySelector<HTMLElement>('.ar-surface')!,hud=root.querySelector<HTMLElement>('.ar-hud')!;
const start=root.querySelector<HTMLButtonElement>('#ar-start')!,retry=root.querySelector<HTMLButtonElement>('#ar-retry')!,status=root.querySelector<HTMLElement>('#ar-status')!,help=root.querySelector<HTMLElement>('#ar-help')!,video=root.querySelector<HTMLVideoElement>('video')!;
let generation=0,stream:MediaStream|undefined,session:ARSession|undefined,abort:AbortController|undefined,searchTimer=0,prepareTimer=0;
function stop() {generation++;clearTimeout(searchTimer);clearTimeout(prepareTimer);abort?.abort();session?.dispose();session=undefined;stream?.getTracks().forEach(track=>track.stop());stream=undefined;video.pause();video.srcObject=null;}
function fail(message:string) {stop();surface.hidden=true;hud.hidden=false;intro.hidden=true;root.dataset.state='error';root.dataset.tracking='none';status.textContent=message;help.textContent='Your certificate is still available without AR.';retry.hidden=false;}
function exit() {stop();if(window.parent!==window)window.parent.postMessage({type:'vpa-ar-exit'},location.origin);else location.href=experience?.certificatePaths[0]??'/collections/forest-and-flowers/';}
function searching() {
  root.dataset.tracking='searching';status.textContent='Find the artwork image on the front of your certificate.';
  clearTimeout(searchTimer);searchTimer=window.setTimeout(()=>{status.textContent='Not finding the image? Improve the lighting, reduce glare, and keep the full artwork image in view.';retry.hidden=false;},20000);
}
if(!experience) {start.disabled=true;root.querySelector('#ar-support')!.textContent='This AR experience is not available. Return to your certificate.';}
else {
  root.querySelector<HTMLImageElement>('#ar-target-preview')!.src=experience.targetImage;
  root.querySelector<HTMLImageElement>('#ar-target-preview')!.alt=`Artwork image on the front of the ${experience.certificateLabel}`;
  root.querySelector('#ar-certificate-name')!.textContent=experience.certificateLabel;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia) {start.disabled=true;root.querySelector('#ar-support')!.textContent='AR needs HTTPS and a browser with camera access. Open the certificate directly in Safari or Chrome, or continue without AR.';}
}
start.addEventListener('click',async()=>{
  if(!experience||start.disabled)return;
  const request=++generation;abort=new AbortController();start.disabled=true;intro.hidden=true;hud.hidden=false;root.dataset.state='permission';status.textContent='Allow camera access when your browser asks.';retry.hidden=true;
  try {
    const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}}});
    if(request!==generation){acquired.getTracks().forEach(track=>track.stop());return;}
    stream=acquired;video.srcObject=stream;video.muted=true;video.playsInline=true;surface.hidden=false;
    await video.play();if(request!==generation)return;
    video.width=video.videoWidth;video.height=video.videoHeight;
    root.dataset.state='preparing';status.textContent='Preparing image tracking…';
    prepareTimer=window.setTimeout(()=>fail('AR took too long to start. Please try again in a supported browser.'),30000);
    const {startTracking}=await import('./engine');if(request!==generation)return;
    session=await startTracking({surface,video,experience,signal:abort.signal,onTracking:found=>{
      if(request!==generation)return;
      if(found){clearTimeout(searchTimer);retry.hidden=true;root.dataset.tracking='found';status.textContent='Petal anchored. Move slowly around the printed image.';}else searching();
    },onError:error=>{if(request===generation)fail(error.message);}});
    if(request!==generation){session.dispose();return;}
    clearTimeout(prepareTimer);root.dataset.state='tracking';searching();
  }catch(error) {
    if(request!==generation)return;
    const name=(error as Error)?.name;
    fail(name==='NotAllowedError'?'Camera permission was not granted. You can enable it in your browser’s site settings and try again.':name==='NotFoundError'?'No camera was found on this device.':name==='NotReadableError'?'The camera is busy or unavailable. Close other camera apps and try again.':'AR could not start. Check your connection and try Safari or Chrome.');
  }
});
retry.addEventListener('click',()=>{stop();location.reload();});
root.querySelector('#ar-back')!.addEventListener('click',exit);
root.querySelector('#ar-intro-back')!.addEventListener('click',exit);
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===window.parent&&event.data?.type==='vpa-ar-stop')stop();});
window.addEventListener('pagehide',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&stream)fail('Camera paused while this page was in the background. Restart AR to continue.');});
window.addEventListener('keydown',event=>{if(event.key==='Escape')exit();});

window.addEventListener('unhandledrejection',event=>{if(stream){event.preventDefault();fail('Image tracking was interrupted. Restart AR to continue.');}});
