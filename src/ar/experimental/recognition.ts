import { Group, BufferGeometry, Float32BufferAttribute, LineSegments, LineBasicMaterial } from 'three';
import type { ARExperience } from '../config';
import type { ARMetrics, SculptureFactory } from '../engine';
import { createTigerLilyFactory } from './tigerLily';
import { createBotanicalComposition } from './botanicalComposition';
import { StableImagePose } from './stablePose';

/** Recognition-only marker in the target's own XY plane. No GLB, scale animation or camera lock. */
export function createRecognitionMarker(aspect:number) {
 const root=new Group();root.name='Certificate image recognition anchor';
 const x=.5,y=.5/aspect,l=.12,z=.004,points:number[]=[];
 for(const sx of [-1,1])for(const sy of [-1,1])points.push(sx*x,sy*y,z,sx*(x-l),sy*y,z,sx*x,sy*y,z,sx*x,sy*(y-l),z);
 points.push(-.025,0,z,.025,0,z,0,-.025,z,0,.025,z);
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(points,3));
 const material=new LineBasicMaterial({color:0xc8a75e,transparent:true,opacity:.9,depthTest:true,depthWrite:false});root.add(new LineSegments(geometry,material));
 let disposed=false;
 return {root,update(_time:number,_reduced:boolean,tracked:boolean){root.visible=tracked;},dispose(){if(disposed)return;disposed=true;geometry.dispose();material.dispose();root.clear();}};
}
export function setupRecognition(host:HTMLElement,experience:ARExperience,flower=false,hub=false){
 if(!hub&&((!experience.recognitionOnly&&!experience.modelAsset&&!experience.composition)||!experience.previewOnly||!experience.targetAspect))throw new Error('A verified recognition-only target is required.');
 const debug=new URLSearchParams(location.search).get('debug')==='1',samples:ARMetrics[]=[];
 const panel=document.createElement('pre');panel.dataset.recognitionMetrics='true';panel.style.cssText='position:fixed;z-index:8;top:75px;left:12px;max-width:calc(100vw - 24px);max-height:35vh;overflow:auto;background:#f7f5ef;color:#12351d;padding:10px;font:11px Arial;white-space:pre-wrap;';
 if(debug)host.append(panel);
 const factory:SculptureFactory=flower?(experience.composition?createBotanicalComposition(experience.composition,experience.title):createTigerLilyFactory(host,experience.modelAsset,experience.title,experience.entrance)):({onState})=>{const marker=createRecognitionMarker(experience.targetAspect??680/1024);onState('ready');host.dataset.recognitionOnly='true';return marker;};
 return {factory,poseFilter:new StableImagePose(true),trackingTolerance:{warmup:3,miss:3},onMetrics:(metrics:ARMetrics)=>{samples.push(metrics);if(samples.length>180)samples.shift();if(debug)panel.textContent=JSON.stringify({experience:experience.id,samples},null,2);},attachSession:()=>{},dispose(){panel.remove();}};
}
