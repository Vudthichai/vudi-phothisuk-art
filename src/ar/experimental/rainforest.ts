import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeModel } from '../customTree';
import type { ARMetrics, ARSession, SculptureFactory } from '../engine';
import modelUrl from './assets/ancient-rainforest.glb?url';
import './rainforest.css';
import { createCinematicMist } from './mist';
import { installAnchoredPinch } from './pinch';
import { StableImagePose } from './stablePose';
import { createSculptureTimeline } from './sculptureTimeline';
import { createAtmosphereMist } from './atmosphereMist';
import { createAttachedFlowers } from './flowers';
import { createForegroundLeaf } from './foregroundLeaf';
import { LIVING_CONFIG, createLivingReveal, createMaterialFade, createRootBotanicals } from './living';
export type Placement={height:number;x:number;y:number;yaw:number};
export const DEFAULT_PLACEMENT:Placement={height:3,x:0,y:-.55,yaw:0};
export function placeRainforest(asset:Group,placement:Placement){
 const bounds=new Box3().setFromObject(asset),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Invalid tree dimensions');
 const normalized=new Group();normalized.name='Ancient rainforest model';asset.position.sub(new Vector3(center.x,bounds.min.y,center.z));normalized.add(asset);
 const root=new Group();root.name='Upright rainforest root';root.rotation.x=Math.PI/2;root.add(normalized);
 function setPlacement(value:Placement){root.position.set(value.x,value.y,0);normalized.scale.setScalar(value.height/size.y);normalized.rotation.y=value.yaw*Math.PI/180;}
 setPlacement(placement);return {root,setPlacement};
}
export const CINEMATIC_PLACEMENT:Placement={height:2.6,x:0,y:-.55,yaw:-12};
export const LIVING_PLACEMENT:Placement={...CINEMATIC_PLACEMENT,height:LIVING_CONFIG.previousHeight*LIVING_CONFIG.settled};
export type RainforestOptions={cinematic?:boolean;diagnostics?:boolean;mistEnabled?:boolean;stabilize?:boolean;living?:boolean;sculpture?:boolean;atmosphere?:boolean;flowersEnabled?:boolean;leafEnabled?:boolean;rotateReveal?:boolean};
export function setupRainforestLab(host:HTMLElement,options:RainforestOptions={}){
 const atmosphere=options.atmosphere===true,sculpture=options.sculpture===true||atmosphere,living=options.living===true||sculpture,cinematic=options.cinematic===true||living,diagnostics=options.diagnostics??!cinematic,defaults=living?LIVING_PLACEMENT:cinematic?CINEMATIC_PLACEMENT:DEFAULT_PLACEMENT;
 const panel=document.createElement('details');panel.className='rainforest-lab';panel.innerHTML=`<summary>Rainforest lab · controls &amp; metrics</summary><p>Experimental · Mother Nature image target. No growth animation or automatic spin. Move back to frame the canopy.</p><label>Tree height (target widths)<input data-setting="height" type="range" min=".75" max="6" step=".05" value="3"><output data-value="height">3</output></label><label>Across artwork<input data-setting="x" type="range" min="-1" max="1" step=".01" value="0"><output data-value="x">0</output></label><label>Along artwork<input data-setting="y" type="range" min="-.7" max=".7" step=".01" value="-.55"><output data-value="y">-.55</output></label><label>Manual trunk angle<input data-setting="yaw" type="range" min="-180" max="180" step="1" value="0"><output data-value="yaw">0</output></label><label>Render pixel ratio (quality / performance)<input data-quality type="range" min=".5" max="1.25" step=".25" value="1"><output data-quality-value>1</output></label><button data-reset type="button">Reset placement</button><pre data-metrics aria-live="off">Waiting for model and tracking…</pre><button data-copy type="button">Copy diagnostics</button><p data-copy-status role="status"></p><p><a href="${modelUrl}" download="Ancient-Rainforest-Mobile.glb">Download optimized GLB</a></p><p>FPS is submitted browser render frames, not a GPU or physical iPhone benchmark. Pose steps include phone motion. JS heap is unavailable in Safari; GPU counts are not bytes.</p>`;if(living){panel.querySelector('p')!.textContent=atmosphere?'V5 atmospheric review: approved fixed-size tree, unchanged fade/rotation. Effects use independent query flags.':sculpture?'V4 internal review: fixed scale, 0.7-second fade and continuous 11-second rotation.':'V3 internal review: 50% to 60% materialization, one optional turn, then rest.';panel.querySelector<HTMLInputElement>('input[data-setting=height]')!.step='.01';}if(diagnostics)host.append(panel);
 let session:ARSession|undefined;let activePlacement:((p:Placement)=>void)|undefined;const placement={...defaults};let mistEnabled=cinematic&&options.mistEnabled!==false;let activeMist:((enabled:boolean)=>void)|undefined;let disposed=false;
 const report:Record<string,unknown>={experiment:atmosphere?'ancient-rainforest-v5':sculpture?'ancient-rainforest-v4':living?'ancient-rainforest-v3':cinematic?'ancient-rainforest-v2':'ancient-rainforest',sampledAt:new Date().toISOString(),userAgent:navigator.userAgent,placement,mistEnabled,flowersEnabled:atmosphere&&options.flowersEnabled!==false,leafEnabled:atmosphere&&options.leafEnabled!==false,collectorScale:1,renderPixelRatio:1,load:{state:'waiting'},samples:[]};
 const print=()=>{if(!diagnostics)return;panel.querySelector('[data-metrics]')!.textContent=JSON.stringify({...report,samples:(report.samples as unknown[]).slice(-1)},null,2);};
 panel.addEventListener('input',event=>{const input=event.target as HTMLInputElement,key=input.dataset.setting as keyof Placement;if(input.hasAttribute('data-mist')){mistEnabled=input.checked;report.mistEnabled=mistEnabled;activeMist?.(mistEnabled);print();return;}if(input.hasAttribute('data-quality')){const value=Number(input.value);report.renderPixelRatio=value;panel.querySelector('[data-quality-value]')!.textContent=input.value;session?.setRenderPixelRatio(value);print();return;}if(!(key in placement))return;placement[key]=Number(input.value);panel.querySelector(`[data-value="${key}"]`)!.textContent=input.value;activePlacement?.({...placement});print();});
 panel.querySelector('[data-reset]')!.addEventListener('click',()=>{Object.assign(placement,defaults);for(const input of panel.querySelectorAll<HTMLInputElement>('input[data-setting]')){const key=input.dataset.setting as keyof Placement;input.value=String(placement[key]);panel.querySelector(`[data-value="${key}"]`)!.textContent=input.value;}activePlacement?.({...placement});print();});
 panel.querySelector('[data-copy]')!.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(report,null,2));panel.querySelector('[data-copy-status]')!.textContent='Diagnostics copied. No camera images or video included.';}catch{panel.querySelector('[data-copy-status]')!.textContent='Clipboard unavailable. Select and copy the visible metrics.';}});
 for(const input of panel.querySelectorAll<HTMLInputElement>('input[data-setting]')){const key=input.dataset.setting as keyof Placement;input.value=String(placement[key]);panel.querySelector(`[data-value="${key}"]`)!.textContent=input.value;}
 if(cinematic&&diagnostics){const label=document.createElement('label');label.innerHTML='<input type="checkbox" data-mist> Cinematic mist';label.querySelector<HTMLInputElement>('input')!.checked=mistEnabled;panel.insertBefore(label,panel.querySelector('[data-reset]'));}
 let pinch:ReturnType<typeof installAnchoredPinch>|undefined,resetButton:HTMLButtonElement|undefined,reviewHelp:HTMLButtonElement|undefined;
 const resetView=()=>{pinch?.reset();Object.assign(placement,defaults);report.collectorScale=1;activePlacement?.({...placement});print();};
 if(cinematic){
  host.dataset.rainforestV2='true';
  const surface=host.querySelector<HTMLElement>('.ar-surface');
  if(surface)pinch=installAnchoredPinch(surface,factor=>{report.collectorScale=factor;Object.assign(placement,defaults,{height:defaults.height*factor});activePlacement?.({...placement});print();},()=>!disposed&&Boolean(activePlacement)&&host.dataset.tracking==='found'&&host.querySelector<HTMLElement>('.ar-controls')?.hidden===false);
  resetButton=document.createElement('button');resetButton.type='button';resetButton.className='rainforest-reset';resetButton.textContent='Reset';resetButton.setAttribute('aria-label','Reset view');resetButton.addEventListener('click',resetView);host.querySelector('.ar-controls')?.append(resetButton);
  reviewHelp=document.createElement('button');reviewHelp.type='button';reviewHelp.textContent='Use screen recording';reviewHelp.addEventListener('click',()=>{host.querySelector<HTMLButtonElement>('#ar-dismiss')?.click();host.querySelector<HTMLButtonElement>('#ar-capture-help')?.click();});host.querySelector('.ar-actions')?.append(reviewHelp);
  const fallback=host.querySelector<HTMLAnchorElement>('.rainforest-v1-fallback')??document.createElement('a');fallback.className='rainforest-v1-fallback';fallback.href=atmosphere?(__VPA_AR_EXPERIMENTS__?'/rainforest-v4.html':'/ar-camera.html?experience=mother-nature-original'):sculpture?'/rainforest-v3.html':living?'/rainforest-v2.html':'/rainforest-ar.html';fallback.textContent=living?'Try the previous rainforest preview':'Try the original rainforest preview';host.querySelector('.ar-guidance')?.append(fallback);
 }
 const recordingResult=(event:Event)=>{report.lastRecording=(event as CustomEvent).detail;print();};host.addEventListener('rainforest-recording-result',recordingResult);
 const contextLost=()=>{report.gpuContextLossEvents=Number(report.gpuContextLossEvents??0)+1;print();};host.addEventListener('webglcontextlost',contextLost,true);
 const collectMetrics=(metrics:ARMetrics)=>{const heap=(performance as unknown as {memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize??null;const sample={...metrics,jsHeapBytes:heap,recording:Boolean(host.querySelector('#ar-record.is-recording')),elapsedMs:performance.now()};const samples=report.samples as unknown[];samples.push(sample);if(samples.length>180)samples.shift();print();};
 const factory:SculptureFactory=({signal,onState,onError,view})=>{
  const root=new Group();let model:Group|undefined,placed:ReturnType<typeof placeRainforest>|undefined,disposed=false,mist:ReturnType<typeof createCinematicMist>|undefined,botanicals:ReturnType<typeof createRootBotanicals>|undefined,fade:ReturnType<typeof createMaterialFade>|undefined;
  let flowers:ReturnType<typeof createAttachedFlowers>|undefined,leaf:ReturnType<typeof createForegroundLeaf>|undefined,decorationFrame:Group|undefined;
  const reveal=sculpture?createSculptureTimeline():living?createLivingReveal(options.rotateReveal??LIVING_CONFIG.rotate):undefined;let revealState=reveal?.update(0,false,false);const download=new AbortController(),started=performance.now();
  const abort=()=>download.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();const timeout=window.setTimeout(abort,60000);onState('loading');report.load={state:'loading',startedMs:started};print();
  void(async()=>{try{
   const response=await fetch(modelUrl,{signal:download.signal});if(!response.ok)throw new Error('Rainforest model download failed');const bytes=await response.arrayBuffer(),fetched=performance.now();if(bytes.byteLength>25_000_000)throw new Error('Rainforest asset exceeds prototype budget');download.signal.throwIfAborted();
   await MeshoptDecoder.ready;const asset=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes,'');model=asset.scene;
   if(disposed||download.signal.aborted){disposeModel(model);model=undefined;if(!disposed&&!signal.aborted)throw new Error('Model loading timed out');return;}
   placed=placeRainforest(model,placement);root.add(placed.root);
   if(living){
    if(!sculpture){botanicals=createRootBotanicals();placed.root.add(botanicals.root);}
    if(atmosphere){
     decorationFrame=new Group();decorationFrame.name='Rotating botanical attachment frame';decorationFrame.scale.setScalar(placement.height);decorationFrame.rotation.y=placement.yaw*Math.PI/180;placed.root.add(decorationFrame);
     if(options.flowersEnabled!==false)flowers=createAttachedFlowers(model,decorationFrame);
     if(options.leafEnabled!==false&&view)leaf=createForegroundLeaf(decorationFrame,view.camera,view.scene);
     report.flowerCount=flowers?.count??0;report.flowerAnchors=flowers?.anchors.map(a=>a.position.toArray())??[];report.leafReady=Boolean(leaf);host.dataset.flowerCount=String(flowers?.count??0);
    }
    fade=createMaterialFade(root);fade(0);root.visible=false;
   }
   const applyPlacement=(value:Placement)=>{
    const height=value.height*(revealState?.heightFactor??1),turn=revealState?.turn??0;
    placed!.setPlacement({...value,height,yaw:value.yaw+turn*180/Math.PI});
    mist?.root.scale.setScalar(height);
    if(decorationFrame){decorationFrame.scale.setScalar(height);decorationFrame.rotation.y=value.yaw*Math.PI/180+turn;}
    if(botanicals){botanicals.root.scale.setScalar(height);botanicals.root.rotation.y=value.yaw*Math.PI/180+turn;}
   };
   const setMist=(enabled:boolean)=>{if(enabled&&!mist){mist=atmosphere?createAtmosphereMist():createCinematicMist(living,sculpture);placed!.root.add(mist.root);mist.root.scale.setScalar(placement.height*(revealState?.heightFactor??1));}mist?.setEnabled(enabled);};
   activePlacement=applyPlacement;activeMist=setMist;if(cinematic)setMist(mistEnabled);applyPlacement(placement);
   report.load={state:'ready',bytes:bytes.byteLength,fetchMs:fetched-started,decodeAndParseMs:performance.now()-fetched,totalMs:performance.now()-started};onState('ready');print();
  }catch(error){if(!disposed&&!signal.aborted){report.load={state:'error',error:(error as Error).message,elapsedMs:performance.now()-started};print();onError(new Error('The experimental rainforest tree could not load. Restart camera to retry.'));}}
  finally{clearTimeout(timeout);}})();
  return {root,uprightRoot:()=>placed?.root,update(_time,_reduced,tracked){
   if(model&&tracked&&report.firstTrackedRenderSubmittedMs===undefined){report.firstTrackedRenderSubmittedMs=performance.now()-started;print();}
   if(reveal&&placed){revealState=reveal.update(_time,_reduced,tracked);root.visible=revealState.started;activePlacement?.(placement);fade?.(revealState.opacity);
    host.dataset.reveal=!revealState.started?'waiting':revealState.progress<1?'revealing':'settled';host.dataset.revealHeight=String(placement.height*revealState.heightFactor);host.dataset.revealTurn=String(revealState.turn);if('elapsedSeconds' in revealState)host.dataset.presentationSeconds=String(revealState.elapsedSeconds);
   }
   mist?.update(_time,_reduced,revealState?.opacity??1);
   if(leaf){const seconds=revealState&&'elapsedSeconds' in revealState?Number(revealState.elapsedSeconds):_time;leaf.update(seconds,_reduced,tracked,revealState?.opacity??1);if(diagnostics)report.foregroundLeaf=leaf.state();if(host.dataset.leafActive!==String(leaf.mesh.visible))host.dataset.leafActive=String(leaf.mesh.visible);if(host.dataset.leafLaunches!==String(leaf.launches))host.dataset.leafLaunches=String(leaf.launches);}

  },dispose(){if(disposed)return;disposed=true;download.abort();clearTimeout(timeout);signal.removeEventListener('abort',abort);mist?.dispose();flowers?.dispose();leaf?.dispose();botanicals?.dispose();if(model)disposeModel(model);activePlacement=undefined;activeMist=undefined;root.clear();}};
 };
 return {factory,trackingTolerance:living?{warmup:3,miss:3}:undefined,poseFilter:cinematic&&options.stabilize!==false?new StableImagePose(living):undefined,onMetrics:diagnostics?collectMetrics:undefined,attachSession:(value:ARSession)=>{session=value;session.setRenderPixelRatio(Number(report.renderPixelRatio));},dispose(){disposed=true;pinch?.dispose();resetButton?.removeEventListener('click',resetView);resetButton?.remove();reviewHelp?.remove();host.removeEventListener('rainforest-recording-result',recordingResult);host.removeEventListener('webglcontextlost',contextLost,true);for(const input of panel.querySelectorAll<HTMLInputElement>('input,button[data-reset]'))input.disabled=true;report.endedAt=new Date().toISOString();print();}};
}
