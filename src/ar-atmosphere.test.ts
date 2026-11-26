// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Group, Scene, PerspectiveCamera, Mesh, MeshStandardMaterial, CylinderGeometry, Vector3, Matrix4, InstancedMesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createAtmosphereMist } from './ar/experimental/atmosphereMist';
import { createAttachedFlowers } from './ar/experimental/flowers';
import { createForegroundLeaf } from './ar/experimental/foregroundLeaf';
import { setupRainforestLab } from './ar/experimental/rainforest';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});
function terrain(){const model=new Group();const trunk=new Mesh(new CylinderGeometry(.10,.13,1,12),new MeshStandardMaterial());trunk.position.y=.5;const roots=new Mesh(new CylinderGeometry(.38,.42,.06,16),new MeshStandardMaterial());roots.position.y=.03;model.add(trunk,roots);return model;}
it('uses six contrasting depth-tested wisps with one small reusable texture and static reduced motion',()=>{
 const mist=createAtmosphereMist();expect(mist.root.children).toHaveLength(6);expect(mist.texture.image.data.byteLength).toBe(65536);
 const materials=mist.root.children.map(s=>(s as import('three').Sprite).material);expect(new Set(materials.map(m=>m.map)).size).toBe(1);expect(new Set(materials.map(m=>m.color.getHex())).size).toBeGreaterThan(1);expect(materials.every(m=>m.depthTest&&!m.depthWrite)).toBe(true);
 const positions=mist.root.children.map(s=>s.position.toArray()),version=mist.texture.version;mist.update(5,false);expect(mist.root.children.map(s=>s.position.toArray())).not.toEqual(positions);expect(mist.texture.version).toBe(version);
 mist.update(8,true);const still=mist.root.children.map(s=>s.position.toArray());mist.update(200,true);expect(mist.root.children.map(s=>s.position.toArray())).toEqual(still);mist.setEnabled(false);mist.update(2,false);expect(mist.root.visible).toBe(false);const dispose=vi.spyOn(mist.texture,'dispose');mist.dispose();mist.dispose();expect(dispose).toHaveBeenCalledOnce();
});
it('grounds ten small flowers on the actual mesh and inherits every rotation and pinch transform',()=>{
 const scene=new Scene(),model=terrain(),frame=new Group();scene.add(model,frame);const flowers=createAttachedFlowers(model,frame);expect(flowers.count).toBe(10);expect((flowers.root.children[0] as InstancedMesh).count).toBe(50);
 expect(flowers.anchors.slice(0,3).every(a=>a.position.y<.08)).toBe(true);expect(flowers.anchors.slice(6).every(a=>a.position.y>=.47)).toBe(true);
 for(const a of flowers.anchors)expect(a.normal.length()).toBeCloseTo(1);
 const origin=flowers.anchors[0].position.clone();frame.scale.setScalar(1.5);frame.rotation.y=Math.PI/2;frame.updateMatrixWorld(true);const transformed=frame.localToWorld(origin.clone());expect(transformed.distanceTo(origin)).toBeGreaterThan(.1);
 const petal=flowers.root.children[0] as InstancedMesh,dispose=vi.spyOn(petal.geometry,'dispose');flowers.dispose();expect(dispose).toHaveBeenCalledOnce();
});
it('launches one leaf from the current canopy pose every 8–15 seconds, approaching the camera then fading',()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(50,.5,.01,100),source=new Group();source.position.z=-4;source.scale.setScalar(1.56);scene.add(source,camera);const leaf=createForegroundLeaf(source,camera,scene,()=>.5);
 leaf.update(0,false,true);expect(leaf.state().nextLaunch).toBe(11.5);leaf.update(11.49,false,true);expect(leaf.mesh.visible).toBe(false);leaf.update(11.5,false,true);expect(leaf.state().launches).toBe(1);
 const start=new Vector3(...leaf.state().origin!);expect(start.distanceTo(source.localToWorld(new Vector3(0,.735,.36)))).toBeLessThan(.001);expect(leaf.state().nextLaunch).toBe(23);const size=leaf.mesh.scale.x;
 leaf.update(14,false,true);expect(leaf.mesh.position.distanceTo(camera.position)).toBeLessThan(start.distanceTo(camera.position));expect(leaf.mesh.scale.x).toBe(size);expect((leaf.mesh.material as MeshStandardMaterial).opacity).toBeGreaterThan(.8);
 leaf.update(16.5,false,true);expect((leaf.mesh.material as MeshStandardMaterial).opacity).toBeLessThan(.3);leaf.update(17,false,true);expect(leaf.mesh.visible).toBe(false);expect(leaf.state().launches).toBe(1);
 leaf.update(23,false,true);expect(leaf.state().launches).toBe(2);leaf.update(24,false,false);expect(leaf.mesh.visible).toBe(false);leaf.update(30,false,true);expect(leaf.state().nextLaunch).toBe(41.5);leaf.update(45,true,true);expect(leaf.mesh.visible).toBe(false);leaf.dispose();expect(scene.children).not.toContain(leaf.mesh);
});
it('keeps all additions independently disabled without changing approved size, fade or rotation',async()=>{
 const model=terrain();vi.spyOn(GLTFLoader.prototype,'parseAsync').mockResolvedValue({scene:model} as never);vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})));
 const host=document.createElement('main');host.innerHTML='<div class="ar-surface"></div><div class="ar-controls"></div><div class="ar-actions"></div><div class="ar-guidance"></div>';document.body.append(host);
 const scene=new Scene(),camera=new PerspectiveCamera(),view=setupRainforestLab(host,{atmosphere:true,flowersEnabled:false,leafEnabled:false,mistEnabled:false});const states:string[]=[];const sculpture=view.factory({signal:new AbortController().signal,onState:s=>states.push(s),onError:e=>{throw e;},view:{camera,scene}});
 await vi.waitFor(()=>expect(states).toContain('ready'));sculpture.update(0,false,true);sculpture.update(.7,false,true);sculpture.update(11,false,true);expect(host.dataset.revealHeight).toBe('1.56');expect(Number(host.dataset.revealTurn)).toBeCloseTo(2*Math.PI);expect(host.dataset.flowerCount).toBe('0');expect(scene.getObjectByName('Occasional foreground rainforest leaf')).toBeUndefined();expect(sculpture.root.getObjectByName('Layered rainforest atmosphere')).toBeUndefined();expect(view.trackingTolerance).toEqual({warmup:3,miss:3});expect(host.querySelector('input')).toBeNull();sculpture.dispose();view.dispose();
});

it('opt-in Ancient Tree sunlight shares the approved asset and pauses its upright petal drift',async()=>{
 const models=[terrain(),terrain()];
 const parse=vi.spyOn(GLTFLoader.prototype,'parseAsync');
 models.forEach(model=>parse.mockResolvedValueOnce({scene:model} as never));
 const fetchModel=vi.fn(async(_url:string)=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}));
 vi.stubGlobal('fetch',fetchModel);
 const scenes=[];
 for(const ancientSunlight of [false,true]){
  const host=document.createElement('main');
  host.innerHTML='<div class="ar-surface"></div><div class="ar-controls"></div><div class="ar-actions"></div><div class="ar-guidance"></div>';
  const lab=setupRainforestLab(host,{atmosphere:true,flowersEnabled:false,leafEnabled:false,ancientSunlight});
  const states:string[]=[];
  const instance=lab.factory({signal:new AbortController().signal,onState:s=>states.push(s),onError:error=>{throw error;}});
  await vi.waitFor(()=>expect(states).toContain('ready'));
  instance.update(0,false,true);
  instance.update(4.7,false,true);
  scenes.push({host,instance,lab});
 }
 const [approved,preview]=scenes;
 expect(fetchModel.mock.calls).toHaveLength(2);
 expect(fetchModel.mock.calls[0][0]).toEqual(fetchModel.mock.calls[1][0]);
 expect(approved.instance.root.getObjectByName('Ancient Tree breeze')).toBeUndefined();
 expect(approved.instance.pausePresentation).toBeUndefined();
 expect(preview.host.dataset.revealHeight).toBe(approved.host.dataset.revealHeight);
 expect(preview.host.dataset.revealTurn).toBe(approved.host.dataset.revealTurn);
 expect(preview.instance.uprightRoot?.()?.position.toArray()).toEqual(approved.instance.uprightRoot?.()?.position.toArray());
 const petals=preview.instance.root.getObjectByName('Occasional Ancient Tree petals') as InstancedMesh;
 const material=(models[1].children[0] as Mesh).material as MeshStandardMaterial;
 expect(material.customProgramCacheKey()).toContain('ancient-sunlight');
 expect(((models[0].children[0] as Mesh).material as MeshStandardMaterial).customProgramCacheKey()).not.toContain('ancient-sunlight');
 expect(petals.visible).toBe(true);
 expect(petals.count).toBe(1);
 const before=new Matrix4();
 petals.getMatrixAt(0,before);
 preview.instance.update(6,false,false);
 expect(petals.visible).toBe(false);
 preview.instance.update(30,false,true);
 const resumed=new Matrix4();
 petals.getMatrixAt(0,resumed);
 expect(resumed.equals(before)).toBe(true);
 preview.instance.pausePresentation?.();
 preview.instance.update(120,false,true);
 petals.getMatrixAt(0,resumed);
 expect(resumed.equals(before)).toBe(true);
 preview.instance.update(120,true,true);
 expect(petals.visible).toBe(false);
 expect(preview.host.dataset.revealTurn).toBe('0');
 const disposal=vi.spyOn(petals.geometry,'dispose');
 for(const {instance,lab} of scenes){instance.dispose();lab.dispose();}
 expect(disposal).toHaveBeenCalledOnce();
});
