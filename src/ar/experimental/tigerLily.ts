import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeModel } from '../customTree';
import type { SculptureFactory } from '../engine';
import { createSculptureTimeline } from './sculptureTimeline';

export const TIGER_LILY_MODEL='/ar/models/tiger-lily-orange.glb';
export const TIGER_LILY_HEIGHT=.95;
export const TIGER_LILY_BLOSSOM_TILT=-Math.PI/6; // Fixed 30° opening tilt; rotates with the flower, never faces the camera.
/** Source Y becomes the tracked plane's +Z; placement never depends on the camera. */
export function placeTigerLily(model:Group, tilt=TIGER_LILY_BLOSSOM_TILT){
 const bounds=new Box3().setFromObject(model),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());
 if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Invalid Tiger Lily model bounds');
 const sheet=new Group(),turn=new Group(),sway=new Group(),fit=new Group();
 sheet.name='Tiger Lily authentic orange blossom';sheet.position.set(0,-.18,.035);sheet.rotation.x=Math.PI/2;
 fit.rotation.x=tilt;fit.scale.setScalar(TIGER_LILY_HEIGHT/size.y);model.position.sub(new Vector3(center.x,bounds.min.y,center.z));fit.add(model);sway.add(fit);turn.add(sway);sheet.add(turn);
 return {root:sheet,turn,sway};
}
export function createTigerLilyFactory(host:HTMLElement, modelAsset=TIGER_LILY_MODEL, title='Tiger Lily'):SculptureFactory{return ({signal,onState,onError})=>{
 const root=new Group();let model:Group|undefined,placed:ReturnType<typeof placeTigerLily>|undefined,disposed=false,elapsed=0,last:number|undefined;
 const timeline=createSculptureTimeline();
 const download=new AbortController(),abort=()=>download.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 const timer=window.setTimeout(abort,30000);onState('loading');host.dataset.tigerModel='loading';
 async function load(){
  try{
   const response=await fetch(modelAsset,{signal:download.signal});if(!response.ok)throw new Error('Tiger Lily model download failed');
   const bytes=await response.arrayBuffer();download.signal.throwIfAborted();await MeshoptDecoder.ready;
   const asset=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes,'');model=asset.scene;
   if(disposed||download.signal.aborted){disposeModel(model);model=undefined;if(!disposed&&!signal.aborted)throw new Error('Tiger Lily loading timed out');return;}
   placed=placeTigerLily(model,modelAsset===TIGER_LILY_MODEL?TIGER_LILY_BLOSSOM_TILT:0);root.add(placed.root);host.dataset.tigerModel='ready';onState('ready');
  }catch(error){if(!disposed&&!signal.aborted){host.dataset.tigerModel='error';onError(new Error(`${title} could not load. Check your connection and restart the camera, or use the recognition-only test.`));}}
  finally{clearTimeout(timer);}
 }
 void load();
 return {root,uprightRoot:()=>placed?.root,update(time,reduced,tracked){root.visible=tracked;const {turn}=timeline.update(time,reduced,tracked&&Boolean(placed));
  const dt=last===undefined?0:Math.min(.1,Math.max(0,time-last));last=time;
  if(!placed||!tracked)return;if(!reduced)elapsed+=dt;
  placed.turn.rotation.y=turn;
  placed.sway.rotation.z=reduced?0:Math.sin(elapsed*.75)*.025;
  placed.sway.rotation.x=reduced?0:Math.sin(elapsed*.52)*.018;
 },dispose(){if(disposed)return;disposed=true;download.abort();clearTimeout(timer);signal.removeEventListener('abort',abort);if(model)disposeModel(model);root.clear();host.dataset.tigerModel='stopped';}};
};}
