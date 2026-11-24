// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSculptureTimeline, SCULPTURE_TIMING } from './ar/experimental/sculptureTimeline';
import { setupRainforestLab } from './ar/experimental/rainforest';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
it('fades a fully formed, fixed-size tree over 0.7 seconds, with no growth at any time',()=>{
 const clock=createSculptureTimeline();expect(clock.update(0,false,false)).toMatchObject({started:false,opacity:0,heightFactor:1});
 expect(clock.update(10,false,true)).toMatchObject({opacity:0,heightFactor:1});expect(clock.update(10.35,false,true).opacity).toBeCloseTo(.5);
 expect(clock.update(10.7,false,true).opacity).toBeCloseTo(1);
 for(const t of [11,12,21,32,100])expect(clock.update(t,false,true).heightFactor).toBe(1);
});
it('rotates at constant speed through multiple 11-second boundaries without a wrapped-angle reset',()=>{
 const clock=createSculptureTimeline();clock.update(0,false,true);const velocity=Math.PI*2/SCULPTURE_TIMING.revolutionSeconds;
 let last=clock.update(10.9,false,true);for(const t of [10.99,11,11.01,12,21.99,22,22.01,33]) {const next=clock.update(t,false,true);expect((next.turn-last.turn)/(next.elapsedSeconds-last.elapsedSeconds)).toBeCloseTo(velocity,8);last=next;}
 expect(last.turn).toBeCloseTo(6*Math.PI);
});
it('retains fade and phase across loss; reduced motion uses a still, opaque sculpture',()=>{
 const clock=createSculptureTimeline();clock.update(0,false,true);const frame=clock.update(.35,false,true);clock.update(.4,false,false);expect(clock.update(10,false,true)).toEqual(frame);
 const full=clock.update(11,false,true);clock.update(12,false,false);expect(clock.update(40,false,true)).toEqual(full);expect(clock.update(41,false,true).opacity).toBe(1);
 expect(createSculptureTimeline().update(0,true,true)).toMatchObject({opacity:1,turn:0,heightFactor:1});
});
it('assembles only tree and independently oriented mist, preserving root contact while continuously turning',async()=>{
 const model=new Group();model.add(new Mesh(new BoxGeometry(2,4,1),new MeshStandardMaterial()));
 vi.spyOn(GLTFLoader.prototype,'parseAsync').mockResolvedValue({scene:model} as never);vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})));
 const host=document.createElement('main');host.innerHTML='<div class="ar-surface"></div><div class="ar-controls"></div><div class="ar-actions"></div><div class="ar-guidance"></div>';document.body.append(host);
 const view=setupRainforestLab(host,{sculpture:true}),states:string[]=[];const scene=view.factory({signal:new AbortController().signal,onState:s=>states.push(s),onError:e=>{throw e;}});
 await vi.waitFor(()=>expect(states).toContain('ready'));expect(host.querySelector('input')).toBeNull();expect(view.trackingTolerance).toEqual({warmup:3,miss:3});
 scene.update(0,false,true);scene.update(.7,false,true);const root=scene.root.children[0] as Group;expect(root.children).toHaveLength(2);expect(root.getObjectByName('Miniature root botanicals')).toBeUndefined();const mist=root.getObjectByName('Cinematic rainforest mist')!;
 for(const t of [1,11,22,33]){scene.update(t,false,true);root.updateMatrixWorld(true);expect(root.position.toArray()).toEqual([0,-.55,0]);const bounds=new Box3().setFromObject(root.children[0]);expect(bounds.min.z).toBeCloseTo(0);expect(bounds.max.z).toBeCloseTo(1.56);expect(mist.rotation.toArray().slice(0,3)).toEqual([0,0,0]);expect(host.dataset.revealHeight).toBe('1.56');}
 const material=(model.children[0] as Mesh).material as MeshStandardMaterial;expect(material.opacity).toBe(1);expect(material.transparent).toBe(false);scene.dispose();view.dispose();
});
