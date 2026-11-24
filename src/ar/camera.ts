import { arById } from './config';
import { beginRecording, recordingMimeType, CLIP_SECONDS } from './recording';
import type { LocalRecording } from './recording';
import type { ARSession } from './engine';
import './camera.css';
const root=document.getElementById('ar-root')!;
const rainforestAtmosphere=location.pathname==='/rainforest-v5.html';
const rainforestSculpture=rainforestAtmosphere||(__VPA_AR_EXPERIMENTS__&&location.pathname==='/rainforest-v4.html');
const rainforestLiving=rainforestSculpture||(__VPA_AR_EXPERIMENTS__&&location.pathname==='/rainforest-v3.html');
const rainforestCinematic=rainforestLiving||(__VPA_AR_EXPERIMENTS__&&location.pathname==='/rainforest-v2.html');
const rainforestExperiment=rainforestCinematic||(__VPA_AR_EXPERIMENTS__&&location.pathname==='/rainforest-ar.html');
const experience=arById(rainforestExperiment?'mother-nature-original':new URLSearchParams(location.search).get('experience'));
root.innerHTML=`<button id="ar-exit" class="ar-exit" type="button" aria-label="Exit AR">Exit <span aria-hidden="true">×</span></button>
<section class="ar-intro"><p class="ar-eyebrow">Forest &amp; Flowers</p><h1>Nature, in another dimension.</h1><p>Turn your certificate artwork-side up, allow camera access, and point your phone at the artwork.</p><p>Use the Mother Nature original certificate or match the artwork image shown below.</p><img id="ar-target-preview" width="680" height="1024" alt="Mother Nature tracking image"><button id="ar-start" type="button">Start camera</button><p class="ar-privacy">Camera stays on your device. Recording is optional, silent and saved only by you.</p><p id="ar-support" role="status"></p></section>
<p id="ar-model-note" class="ar-model-note" role="status" hidden></p>
<div class="ar-surface" hidden><video muted autoplay playsinline aria-label="Live rear camera"></video></div>
<div class="ar-guidance" hidden><p id="ar-status" role="status" aria-live="polite"></p><button id="ar-retry" type="button" hidden>Try again</button></div>
<div class="ar-controls" hidden><span id="ar-timer" role="status"></span><button id="ar-record" type="button" aria-label="Record video"><span class="ar-record-dot" aria-hidden="true"></span><span id="ar-record-label">Record</span></button><button id="ar-capture-help" type="button">Recording help</button></div>
<section id="ar-review" class="ar-panel" role="dialog" aria-modal="true" aria-labelledby="ar-review-title" hidden><h2 id="ar-review-title">Keep the moment.</h2><p>Preview your clip before saving. Nothing is uploaded.</p><video id="ar-clip" controls playsinline aria-label="Recorded AR clip"></video><p id="ar-share-status" role="status"></p><div class="ar-actions"><button id="ar-share" type="button" hidden>Share video</button><a id="ar-save" download>Save video</a><button id="ar-dismiss" type="button">Return to AR</button></div></section>
<section id="ar-fallback" class="ar-panel" role="dialog" aria-modal="true" aria-labelledby="ar-fallback-title" hidden><h2 id="ar-fallback-title">Capture with your phone.</h2><p id="ar-fallback-reason">If browser recording is unavailable or the preview looks wrong, use your phone’s screen recorder.</p><ol><li>On iPhone, open Control Center and tap Screen Recording. Keep the microphone off.</li><li>Return here, tap Continue, then point at Mother Nature for 10–15 seconds.</li><li>Stop using the red recording indicator. Find your clip in Photos to save or share.</li></ol><p class="ar-privacy">If Screen Recording is missing, add it in Control Center. On Android, use Screen record in Quick Settings. Returning from Control Center may pause the camera; tap Restart camera if prompted.</p><button id="ar-fallback-close" type="button">Continue</button></section>`;
if(rainforestExperiment){root.querySelector('h1')!.textContent=rainforestSculpture?'The Living Sculpture':rainforestLiving?'The Living Rainforest':rainforestCinematic?'Ancient Rainforest':'Ancient Rainforest · AR lab';root.querySelector('.ar-intro>p:not(.ar-eyebrow)')!.textContent=rainforestLiving?'Hold the certificate steady with the artwork facing up, then point your camera at its Mother Nature image. Let the rainforest appear.':rainforestCinematic?'Point at the Mother Nature image below. Move back gently to see the ancient tree. Pinch with two fingers to adjust its scale.':'Experimental static tree. Point at the Mother Nature image below, then move back to inspect the canopy. Camera and recordings stay local.';}
let experimentCleanup:(()=>void)|undefined;
const el=<T extends HTMLElement>(id:string)=>root.querySelector<T>(`#${id}`)!;
const intro=root.querySelector<HTMLElement>('.ar-intro')!,surface=root.querySelector<HTMLElement>('.ar-surface')!,guidance=root.querySelector<HTMLElement>('.ar-guidance')!,controls=root.querySelector<HTMLElement>('.ar-controls')!;
const start=el<HTMLButtonElement>('ar-start'),retry=el<HTMLButtonElement>('ar-retry'),status=el('ar-status'),video=surface.querySelector('video')!;
const record=el<HTMLButtonElement>('ar-record'),review=el('ar-review'),fallback=el('ar-fallback'),clip=el<HTMLVideoElement>('ar-clip');
let generation=0,stream:MediaStream|undefined,session:ARSession|undefined,abort:AbortController|undefined,searchTimer=0,prepareTimer=0,statusTimer=0,modelNoteTimer=0;
let recording:LocalRecording|undefined,clipUrl:string|undefined,clipFile:File|undefined,tick=0,recordStart=0,manualRecordStop=false,lastFocus:HTMLElement|undefined;
function clearClip(){clip.pause();clip.removeAttribute('src');clip.load();if(clipUrl)URL.revokeObjectURL(clipUrl);clipUrl=undefined;clipFile=undefined;}
function resetRecording(){recording?.cancel();recording=undefined;session?.onFrame(undefined);clearInterval(tick);el('ar-timer').textContent='';record.classList.remove('is-recording');record.setAttribute('aria-label','Record video');el('ar-record-label').textContent='Record';}
function stop(){experimentCleanup?.();generation++;clearTimeout(modelNoteTimer);el('ar-model-note').hidden=true;clearTimeout(searchTimer);clearTimeout(prepareTimer);clearTimeout(statusTimer);resetRecording();clearClip();abort?.abort();session?.dispose();session=undefined;stream?.getTracks().forEach(t=>t.stop());stream=undefined;video.pause();video.srcObject=null;controls.hidden=true;}
function notice(message:string,transient=false){clearTimeout(statusTimer);status.textContent=message;guidance.hidden=false;if(transient)statusTimer=window.setTimeout(()=>{guidance.hidden=true;},3000);}
function fail(message:string){stop();el('ar-exit').hidden=false;surface.hidden=true;intro.hidden=true;review.hidden=true;fallback.hidden=true;root.dataset.state='error';root.dataset.tracking='none';notice(message);retry.hidden=false;retry.textContent='Restart camera';}
function exit(){stop();if(window.parent!==window)window.parent.postMessage({type:'vpa-ar-exit'},location.origin);else location.href=experience?.certificatePaths[0]??'/collections/forest-and-flowers/';}
function searching(){root.dataset.tracking='searching';record.disabled=!recording;notice('Keep the complete Mother Nature image in view. Move slowly.');clearTimeout(searchTimer);searchTimer=window.setTimeout(()=>{notice('Try even lighting, less glare, and move closer to the artwork image.');retry.hidden=false;},15000);}
function openPanel(panel:HTMLElement){session?.setPresentationPaused(true);lastFocus=document.activeElement as HTMLElement;panel.hidden=false;controls.hidden=true;el('ar-exit').hidden=true;panel.querySelector<HTMLElement>('button,a')?.focus();}
function closePanel(panel:HTMLElement){session?.setPresentationPaused(false);panel.hidden=true;el('ar-exit').hidden=false;controls.hidden=root.dataset.state!=='tracking';lastFocus?.focus();}
function nativeFallback(reason?:string){resetRecording();if(reason)el('ar-fallback-reason').textContent=reason;openPanel(fallback);}
if(!experience){start.disabled=true;el('ar-support').textContent='This AR experience is unavailable. Return to your certificate.';}
else{
 el<HTMLImageElement>('ar-target-preview').src=experience.targetImage;
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){start.disabled=true;el('ar-support').textContent='AR needs HTTPS and camera access. Open this certificate in Safari or Chrome, or continue without AR.';}
}
async function launch(){
 if(!experience||start.disabled)return;
 const request=++generation;abort=new AbortController();start.disabled=true;intro.hidden=true;root.dataset.state='permission';notice('Allow camera access when your browser asks.');retry.hidden=true;
 try{
  const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}}});
  if(request!==generation){acquired.getTracks().forEach(t=>t.stop());return;}
  stream=acquired;video.srcObject=stream;video.muted=true;video.playsInline=true;surface.hidden=false;
  await video.play();if(request!==generation)return;video.width=video.videoWidth;video.height=video.videoHeight;
  root.dataset.state='preparing';notice('Preparing your sculpture…');prepareTimer=window.setTimeout(()=>fail('AR took too long to start. Please try again.'),30000);
  const {startTracking}=await import('./engine');if(request!==generation)return;
  const lab=rainforestExperiment?(await import('./experimental/rainforest')).setupRainforestLab(root,{cinematic:rainforestCinematic,living:rainforestLiving,sculpture:rainforestSculpture,atmosphere:rainforestAtmosphere,flowersEnabled:new URLSearchParams(location.search).get('flowers')!=='0',leafEnabled:new URLSearchParams(location.search).get('leaf')!=='0',diagnostics:!rainforestCinematic||new URLSearchParams(location.search).get('debug')==='1',mistEnabled:new URLSearchParams(location.search).get('mist')!=='0',stabilize:new URLSearchParams(location.search).get('stability')!=='0',rotateReveal:new URLSearchParams(location.search).has('revealRotation')?new URLSearchParams(location.search).get('revealRotation')!=='0':undefined}):undefined;experimentCleanup=lab?.dispose;if(request!==generation){lab?.dispose();return;}
  session=await startTracking({surface,video,experience,signal:abort.signal,sceneFactory:lab?.factory,onMetrics:lab?.onMetrics,poseFilter:lab?.poseFilter,trackingTolerance:lab?.trackingTolerance,onSculptureState:state=>{if(request!==generation)return;const note=el('ar-model-note');clearTimeout(modelNoteTimer);note.hidden=rainforestCinematic&&state==='ready';note.textContent=state==='loading'?'Loading detailed sculpture…':state==='ready'?'Tree ready. Step back to see the full canopy.':'Using the lightweight sculpture. Detailed model unavailable.';if(state!=='loading')modelNoteTimer=window.setTimeout(()=>{note.hidden=true;},6000);},onTracking:found=>{
   if(request!==generation)return;
   if(found){clearTimeout(searchTimer);retry.hidden=true;root.dataset.tracking='found';record.disabled=false;notice(rainforestLiving?'Hold the certificate steady. Move gently to explore.':rainforestCinematic?'Move gently. Pinch to adjust the scale.':'Move gently around the sculpture.',true);}else searching();
  },onError:error=>{if(request===generation)fail(error.message);}});
  if(request!==generation){session.dispose();return;}lab?.attachSession(session);clearTimeout(prepareTimer);root.dataset.state='tracking';controls.hidden=false;searching();
 }catch(error){if(request!==generation)return;const name=(error as Error)?.name;fail(name==='NotAllowedError'?'Camera permission was not granted. Enable camera access in your browser’s site settings and try again.':name==='NotFoundError'?'No camera was found on this device.':name==='NotReadableError'?'The camera is busy. Close other camera apps and try again.':'AR could not start. Check your connection and try Safari or Chrome.');}
}
start.addEventListener('click',launch);
retry.addEventListener('click',()=>{stop();location.reload();});
record.addEventListener('click',()=>{
 if(recording){manualRecordStop=true;record.disabled=true;recording.stop();return;}
 if(!session||root.dataset.tracking!=='found')return;
 if(!recordingMimeType()){nativeFallback('Direct AR recording is unavailable in this browser. Use your phone’s screen recorder instead.');return;}
 clearClip();manualRecordStop=false;
 try{
  recording=beginRecording({video,fps:rainforestExperiment?30:24,width:surface.clientWidth,height:surface.clientHeight,onStarted:()=>{recordStart=performance.now();},onComplete:blob=>{
   resetRecording();record.disabled=root.dataset.tracking!=='found';clipUrl=URL.createObjectURL(blob);clipFile=new File([blob],`Mother-Nature-AR.${blob.type.includes('mp4')?'mp4':'webm'}`,{type:blob.type});const completedClipUrl=clipUrl;if(rainforestExperiment)clip.addEventListener('loadedmetadata',()=>{if(clip.src!==completedClipUrl)return;const duration=clip.duration,usable=Number.isFinite(duration)?duration>=.5&&(manualRecordStop||duration>=8):null;root.dispatchEvent(new CustomEvent('rainforest-recording-result',{detail:{duration:Number.isFinite(duration)?duration:null,usable,manualStop:manualRecordStop}}));if(usable===false){closePanel(review);clearClip();nativeFallback('This browser could not sustain a usable rainforest recording. Use native screen recording instead, and compare a lower render pixel ratio.');}},{once:true});clip.src=clipUrl;
   el<HTMLAnchorElement>('ar-save').href=clipUrl;el<HTMLAnchorElement>('ar-save').download=clipFile.name;
   let canShare=false;try{canShare=Boolean(typeof navigator.share==='function'&&navigator.canShare?.({files:[clipFile]}));}catch{/* file sharing unavailable */}el('ar-share').hidden=!canShare;el('ar-share-status').textContent='If the preview is blank or incomplete, use Recording help for native screen recording.';openPanel(review);
  },onError:()=>nativeFallback('This browser could not record the AR composition. Use native screen recording instead.')});
  session.onFrame(canvas=>recording?.draw(canvas));recordStart=0;record.classList.add('is-recording');record.setAttribute('aria-label','Stop recording');el('ar-record-label').textContent='Stop';
  const update=()=>{el('ar-timer').textContent=recordStart===0?'Preparing clip…':`${Math.min(CLIP_SECONDS,Math.floor((performance.now()-recordStart)/1000))} / ${CLIP_SECONDS}s`;};update();tick=window.setInterval(update,250);
 }catch{nativeFallback('This browser could not start a composited recording. Use native screen recording instead.');}
});
el('ar-share').addEventListener('click',async()=>{
 if(!clipFile)return;try{await navigator.share({files:[clipFile],title:'Mother Nature · Forest & Flowers'});}catch(error){if((error as Error).name!=='AbortError')el('ar-share-status').textContent='Sharing is unavailable here. Use Save video, or native screen recording.';}
});
el('ar-dismiss').addEventListener('click',()=>{closePanel(review);clearClip();});
el('ar-capture-help').addEventListener('click',()=>nativeFallback());
el('ar-fallback-close').addEventListener('click',()=>closePanel(fallback));
el('ar-exit').addEventListener('click',exit);
root.addEventListener('keydown',event=>{
 const panel=!review.hidden?review:!fallback.hidden?fallback:undefined;
 if(panel&&event.key==='Tab'){const items=Array.from(panel.querySelectorAll<HTMLElement>('button:not([hidden]),a[href],video[controls]'));const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
 if(event.key==='Escape'){if(panel){closePanel(panel);if(panel===review)clearClip();}else exit();}
});
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===window.parent&&event.data?.type==='vpa-ar-stop')stop();});
window.addEventListener('pagehide',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&stream)fail('Camera paused while this page was in the background. Restart camera to continue.');});
window.addEventListener('unhandledrejection',event=>{if(stream){event.preventDefault();fail('Image tracking was interrupted. Restart camera to continue.');}});
