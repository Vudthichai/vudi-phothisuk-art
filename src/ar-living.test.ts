// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Group, BoxGeometry, Mesh, MeshStandardMaterial, Box3, Vector3, Quaternion, Matrix4 } from 'three';
import { LIVING_CONFIG, createLivingReveal, createMaterialFade, createRootBotanicals } from './ar/experimental/living';
import { CINEMATIC_PLACEMENT, LIVING_PLACEMENT, placeRainforest, setupRainforestLab } from './ar/experimental/rainforest';
import { createCinematicMist } from './ar/experimental/mist';
import { StableImagePose } from './ar/experimental/stablePose';
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();});
it('materializes once from 50% to 60% of V2 with one full turn, then stays still',()=>{
 const reveal=createLivingReveal();expect(reveal.update(100,false,false).opacity).toBe(0);
 const start=reveal.update(105,false,true);expect(start.opacity).toBe(0);expect(LIVING_PLACEMENT.height*start.heightFactor).toBeCloseTo(CINEMATIC_PLACEMENT.height*.5);
 const middle=reveal.update(106.3,false,true);expect(middle.opacity).toBeGreaterThan(0);expect(middle.turn).toBeGreaterThan(0);expect(middle.turn).toBeLessThan(2*Math.PI);
 const end=reveal.update(107.6,false,true);expect(end.progress).toBeCloseTo(1);expect(end.opacity).toBeCloseTo(1);expect(end.turn).toBeCloseTo(2*Math.PI);expect(LIVING_PLACEMENT.height*end.heightFactor).toBeCloseTo(2.6*.6);
 expect(reveal.update(200,false,true)).toEqual({...end,progress:1,opacity:1,heightFactor:1,turn:2*Math.PI});
});
it('pauses while lost and resumes without replaying, including after settling',()=>{
 const reveal=createLivingReveal();reveal.update(0,false,true);const before=reveal.update(1,false,true);reveal.update(1.1,false,false);
 expect(reveal.update(10,false,true)).toEqual(before);const settled=reveal.update(12,false,true);expect(settled.progress).toBe(1);
 reveal.update(13,false,false);expect(reveal.update(40,false,true)).toEqual(settled);
});
it('supports stationary reveal and reduced motion without hidden continuous spin',()=>{
 const still=createLivingReveal(false);still.update(0,false,true);expect(still.update(2.6,false,true).turn).toBe(0);
 const reduced=createLivingReveal();const state=reduced.update(5,true,true);expect(state).toMatchObject({progress:1,opacity:1,heightFactor:1,turn:0});expect(LIVING_CONFIG.seconds).toBeGreaterThanOrEqual(2);expect(LIVING_CONFIG.seconds).toBeLessThanOrEqual(3);
});
it('keeps the root pivot on the image and mist unrotated during growth, spin and pinch',()=>{
 const model=new Group();model.add(new Mesh(new BoxGeometry(2,4,1),new MeshStandardMaterial()));const tree=placeRainforest(model,LIVING_PLACEMENT),mist=createCinematicMist(true);tree.root.add(mist.root);const reveal=createLivingReveal();reveal.update(0,false,true);
 for(const t of [.1,1,2.6,10])for(const pinch of [.75,1,1.5]) {const frame=reveal.update(t,false,true);tree.setPlacement({...LIVING_PLACEMENT,height:LIVING_PLACEMENT.height*frame.heightFactor*pinch,yaw:LIVING_PLACEMENT.yaw+frame.turn*180/Math.PI});tree.root.updateMatrixWorld(true);expect(tree.root.position.toArray()).toEqual([0,-.55,0]);const bounds=new Box3().setFromObject(tree.root.children[0]);expect(bounds.min.z).toBeCloseTo(0);expect(mist.root.rotation.toArray().slice(0,3)).toEqual([0,0,0]);}
 mist.dispose();
});
it('restores original opaque PBR rendering after fade without replacing material maps',()=>{
 const material=new MeshStandardMaterial({roughness:.72,metalness:.12}),root=new Group();root.add(new Mesh(new BoxGeometry(),material));const fade=createMaterialFade(root);
 fade(0);expect(material.opacity).toBe(0);expect(material.transparent).toBe(true);expect(material.depthWrite).toBe(false);
 fade(.5);expect(material.opacity).toBe(.5);fade(1);expect(material.opacity).toBe(1);expect(material.transparent).toBe(false);expect(material.depthWrite).toBe(true);expect(material.roughness).toBe(.72);
});
it('adds exactly five tiny red mushrooms and three warm flowers with shared geometry and cleanup',()=>{
 const scene=createRootBotanicals();expect(scene.root.children.map(o=>o.name)).toEqual(['Five red mushroom caps','Five mushroom stems','Three warm five-petal flowers','Three flower centres']);
 const caps=scene.root.children[0] as import('three').InstancedMesh;expect(caps.count).toBe(5);expect((caps.material as MeshStandardMaterial).color.getHex()).toBe(0x9d2920);
 const flowers=scene.root.children[2] as import('three').InstancedMesh;expect(flowers.count).toBe(15);const dispose=vi.spyOn(caps.geometry,'dispose');scene.dispose();expect(dispose).toHaveBeenCalledOnce();
});
it('uses curated smaller placement and handheld tolerances without exposing sliders',()=>{
 const host=document.createElement('main');host.innerHTML='<div class="ar-surface"></div><div class="ar-controls"></div><div class="ar-actions"></div><div class="ar-guidance"></div>';document.body.append(host);
 const v3=setupRainforestLab(host,{living:true});expect(host.querySelector('input')).toBeNull();expect(v3.trackingTolerance).toEqual({warmup:3,miss:3});expect(host.querySelector('[aria-label="Reset view"]')).toBeTruthy();v3.dispose();
});
it('follows synthetic handheld certificate translation and tilt rather than pinning to the camera',()=>{
 const filter=new StableImagePose(true),width=680;let maxError=0;let out=new Matrix4();
 for(let i=0;i<180;i++){const t=i/30,x=Math.sin(t*.9)*width*.14,y=Math.sin(t*.6)*width*.04,angle=Math.sin(t*.7)*.18;
 const target=new Matrix4().compose(new Vector3(x,y,-width*3),new Quaternion().setFromAxisAngle(new Vector3(1,0,0),angle),new Vector3(width,width,width));out=filter.update(target,1/30);maxError=Math.max(maxError,Math.abs(out.elements[12]-x)/width);}
 expect(maxError).toBeLessThan(.03);expect(Math.abs(out.elements[12])).toBeGreaterThan(30);
 filter.reset();expect(filter.update(new Matrix4().makeTranslation(150,20,-1000),1/30).elements[12]).toBe(150);
});
