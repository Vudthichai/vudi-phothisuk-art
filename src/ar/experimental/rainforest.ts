import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeModel } from '../customTree';
import type { ARMetrics, ARSession, SculptureFactory } from '../engine';
import modelUrl from './assets/ancient-rainforest.glb?url';
import './rainforest.css';
export type Placement={height:number;x:number;y:number;yaw:number};
export const DEFAULT_PLACEMENT:Placement={height:3,x:0,y:-.55,yaw:0};
export function placeRainforest(asset:Group,placement:Placement){
 const bounds=new Box3().setFromObject(asset),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Invalid tree dimensions');
 const normalized=new Group();normalized.name='Ancient rainforest model';asset.position.sub(new Vector3(center.x,bounds.min.y,center.z));normalized.add(asset);
 const root=new Group();root.name='Upright rainforest root';root.rotation.x=Math.PI/2;root.add(normalized);
 function setPlacement(value:Placement){root.position.set(value.x,value.y,0);normalized.scale.setScalar(value.height/size.y);normalized.rotation.y=value.yaw*Math.PI/180;}
 setPlacement(placement);return {root,setPlacement};
}
export function setupRainforestLab(host:HTMLElement){
 const panel=document.createElement('details');panel.className='rainforest-lab';panel.innerHTML=`<summary>Rainforest lab · controls &amp; metrics</summary><p>Experimental · Mother Nature image target. No growth animation or automatic spin. Move back to frame the canopy.</p><label>Tree height (target widths)<input data-setting="height" type="range" min=".75" max="6" step=".05" value="3"><output data-value="height">3</output></label><label>Across artwork<input data-setting="x" type="range" min="-1" max="1" step=".01" value="0"><output data-value="x">0</output></label><label>Along artwork<input data-setting="y" type="range" min="-.7" max=".7" step=".01" value="-.55"><output data-value="y">-.55</output></label><label>Manual trunk angle<input data-setting="yaw" type="range" min="-180" max="180" step="1" value="0"><output data-value="yaw">0</output></label><label>Render pixel ratio (quality / performance)<input data-quality type="range" min=".5" max="1.25" step=".25" value="1"><output data-quality-value>1</output></label><button data-reset type="button">Reset placement</button><pre data-metrics aria-live="off">Waiting for model and tracking…</pre><button data-copy type="button">Copy diagnostics</button><p data-copy-status role="status"></p><p><a href="${modelUrl}" download="Ancient-Rainforest-Mobile.glb">Download optimized GLB</a></p><p>FPS is submitted browser render frames, not a GPU or physical iPhone benchmark. Pose steps include phone motion. JS heap is unavailable in Safari; GPU counts are not bytes.</p>`;host.append(panel);
 let session:ARSession|undefined;let activePlacement:((p:Placement)=>void)|undefined;const placement={...DEFAULT_PLACEMENT};
 const report:Record<string,unknown>={experiment:'ancient-rainforest',sampledAt:new Date().toISOString(),userAgent:navigator.userAgent,placement,renderPixelRatio:1,load:{state:'waiting'},samples:[]};
 const print=()=>{panel.querySelector('[data-metrics]')!.textContent=JSON.stringify({...report,samples:(report.samples as unknown[]).slice(-1)},null,2);};
 panel.addEventListener('input',event=>{const input=event.target as HTMLInputElement,key=input.dataset.setting as keyof Placement;if(input.hasAttribute('data-quality')){const value=Number(input.value);report.renderPixelRatio=value;panel.querySelector('[data-quality-value]')!.textContent=input.value;session?.setRenderPixelRatio(value);print();return;}if(!(key in placement))return;placement[key]=Number(input.value);panel.querySelector(`[data-value="${key}"]`)!.textContent=input.value;activePlacement?.({...placement});print();});
 panel.querySelector('[data-reset]')!.addEventListener('click',()=>{Object.assign(placement,DEFAULT_PLACEMENT);for(const input of panel.querySelectorAll<HTMLInputElement>('input[data-setting]')){const key=input.dataset.setting as keyof Placement;input.value=String(placement[key]);panel.querySelector(`[data-value="${key}"]`)!.textContent=input.value;}activePlacement?.({...placement});print();});
 panel.querySelector('[data-copy]')!.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(report,null,2));panel.querySelector('[data-copy-status]')!.textContent='Diagnostics copied. No camera images or video included.';}catch{panel.querySelector('[data-copy-status]')!.textContent='Clipboard unavailable. Select and copy the visible metrics.';}});
 const recordingResult=(event:Event)=>{report.lastRecording=(event as CustomEvent).detail;print();};host.addEventListener('rainforest-recording-result',recordingResult);
 const contextLost=()=>{report.gpuContextLossEvents=Number(report.gpuContextLossEvents??0)+1;print();};host.addEventListener('webglcontextlost',contextLost,true);
 const onMetrics=(metrics:ARMetrics)=>{const heap=(performance as unknown as {memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize??null;const sample={...metrics,jsHeapBytes:heap,recording:Boolean(host.querySelector('#ar-record.is-recording')),elapsedMs:performance.now()};const samples=report.samples as unknown[];samples.push(sample);if(samples.length>180)samples.shift();print();};
 const factory:SculptureFactory=({signal,onState,onError})=>{
  const root=new Group();let model:Group|undefined,placed:ReturnType<typeof placeRainforest>|undefined,disposed=false;const download=new AbortController(),started=performance.now();
  const abort=()=>download.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();const timeout=window.setTimeout(abort,60000);onState('loading');report.load={state:'loading',startedMs:started};print();
  void(async()=>{try{
   const response=await fetch(modelUrl,{signal:download.signal});if(!response.ok)throw new Error('Rainforest model download failed');const bytes=await response.arrayBuffer(),fetched=performance.now();if(bytes.byteLength>25_000_000)throw new Error('Rainforest asset exceeds prototype budget');download.signal.throwIfAborted();
   await MeshoptDecoder.ready;const asset=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes,'');model=asset.scene;
   if(disposed||download.signal.aborted){disposeModel(model);model=undefined;if(!disposed&&!signal.aborted)throw new Error('Model loading timed out');return;}
   placed=placeRainforest(model,placement);root.add(placed.root);activePlacement=placed.setPlacement;
   report.load={state:'ready',bytes:bytes.byteLength,fetchMs:fetched-started,decodeAndParseMs:performance.now()-fetched,totalMs:performance.now()-started};onState('ready');print();
  }catch(error){if(!disposed&&!signal.aborted){report.load={state:'error',error:(error as Error).message,elapsedMs:performance.now()-started};print();onError(new Error('The experimental rainforest tree could not load. Restart camera to retry.'));}}
  finally{clearTimeout(timeout);}})();
  return {root,update(_time,_reduced,tracked){if(model&&tracked&&report.firstTrackedRenderSubmittedMs===undefined){report.firstTrackedRenderSubmittedMs=performance.now()-started;print();}/* No reveal, particles or automatic rotation. */},dispose(){if(disposed)return;disposed=true;download.abort();clearTimeout(timeout);signal.removeEventListener('abort',abort);if(model)disposeModel(model);activePlacement=undefined;root.clear();}};
 };
 return {factory,onMetrics,attachSession:(value:ARSession)=>{session=value;session.setRenderPixelRatio(Number(report.renderPixelRatio));},dispose(){host.removeEventListener('rainforest-recording-result',recordingResult);host.removeEventListener('webglcontextlost',contextLost,true);for(const input of panel.querySelectorAll<HTMLInputElement>('input,button[data-reset]'))input.disabled=true;report.endedAt=new Date().toISOString();print();}};
}
