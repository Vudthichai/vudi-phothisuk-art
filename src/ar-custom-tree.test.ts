// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { BoxGeometry, Box3, Group, Mesh, MeshStandardMaterial, Texture, Vector3, Matrix4, Quaternion } from 'three';
import { createCustomTree, fitTree, TREE_HEIGHT } from './ar/customTree';
import { createPetalRain, PETAL_COUNT } from './ar/petalRain';
afterEach(()=>vi.restoreAllMocks());
function model(){const group=new Group();group.add(new Mesh(new BoxGeometry(2,4,1),new MeshStandardMaterial({metalness:.8,roughness:.4})));return group;}
it('normalizes the complete model from root to canopy at 1.8 times the previous height without changing material or aspect ratio',()=>{
 const source=model(),material=(source.children[0] as Mesh).material,tree=fitTree(source),bounds=new Box3().setFromObject(tree),size=bounds.getSize(new Vector3());
 expect(size.y).toBeCloseTo(TREE_HEIGHT);expect(bounds.min.y).toBeCloseTo(0);expect(size.x/size.y).toBeCloseTo(.5);expect((source.children[0] as Mesh).material).toBe(material);
});
it('shows the procedural fallback while loading, replaces it, respects reduced motion and frees textures and geometry',async()=>{
 let resolve!:(asset:Group)=>void;const asset=model(),mesh=asset.children[0] as Mesh,texture=new Texture();(mesh.material as MeshStandardMaterial).map=texture;
 const close=vi.fn();texture.source.data={close};
 const dispose=vi.spyOn(texture,'dispose'),geometryDispose=vi.spyOn(mesh.geometry,'dispose'),states:string[]=[];
 const sculpture=createCustomTree({signal:new AbortController().signal,onState:s=>states.push(s),loadModel:()=>new Promise(r=>resolve=r)});
 expect(sculpture.root.getObjectByName('Golden botanical sculpture')).toBeTruthy();resolve(asset);await sculpture.ready;
 expect(states).toEqual(['loading','ready']);expect(sculpture.root.getObjectByName('Meshy golden tree')).toBeTruthy();expect(sculpture.root.getObjectByName('Golden botanical sculpture')).toBeUndefined();
 sculpture.update(0,true,true);expect(sculpture.root.getObjectByName('Continuous golden petal rain')!.visible).toBe(false);
 sculpture.dispose();sculpture.dispose();expect(dispose).toHaveBeenCalledOnce();expect(geometryDispose).toHaveBeenCalledOnce();expect(close).toHaveBeenCalledOnce();
});
it('keeps a functional fallback on load/decode failure',async()=>{
 const states:string[]=[];const sculpture=createCustomTree({signal:new AbortController().signal,onState:s=>states.push(s),loadModel:async()=>{throw new Error('bad GLB');}});
 await sculpture.ready;expect(states).toEqual(['loading','fallback']);sculpture.update(0,false,true);sculpture.update(2,false,true);expect(sculpture.root.getObjectByName('Golden botanical sculpture')).toBeTruthy();sculpture.dispose();
});
it('disposes late assets after exit and never attaches or announces them',async()=>{
 let resolve!:(asset:Group)=>void;const asset=model(),dispose=vi.spyOn((asset.children[0] as Mesh).geometry,'dispose'),states:string[]=[];
 const sculpture=createCustomTree({signal:new AbortController().signal,onState:s=>states.push(s),loadModel:()=>new Promise(r=>resolve=r)});sculpture.dispose();resolve(asset);await sculpture.ready;expect(dispose).toHaveBeenCalledOnce();expect(states).toEqual(['loading']);
});
it('renders 64 varied, continuously moving petals in one instanced draw call',()=>{
 const rain=createPetalRain();expect(PETAL_COUNT).toBe(64);expect(rain.mesh.count).toBe(64);rain.update(0,false);const first=Array.from(rain.mesh.instanceMatrix.array);rain.update(1,false);expect(Array.from(rain.mesh.instanceMatrix.array)).not.toEqual(first);rain.update(2,true);expect(rain.mesh.visible).toBe(false);rain.dispose();
});

it('stands on the certificate normal with a fixed root pivot through reveal and spin, including a tilted tracked plane',async()=>{
 const sculpture=createCustomTree({signal:new AbortController().signal,onState:()=>{},loadModel:async()=>model()});await sculpture.ready;
 const tracked=new Group();tracked.position.set(.2,.3,-3);tracked.rotation.set(-.6,.25,.1);tracked.add(sculpture.root);
 const expectedNormal=new Vector3(0,0,1).applyQuaternion(tracked.quaternion);
 const expectedRoot=tracked.localToWorld(new Vector3(0,-.55,0));let tangent:Vector3|undefined;
 for(const time of [0,.5,2,10]){
  sculpture.update(time,false,true);tracked.updateMatrixWorld(true);
  const tree=sculpture.root.getObjectByName('Meshy golden tree')!;
  const pivot=tree.localToWorld(new Vector3());expect(pivot.distanceTo(expectedRoot)).toBeLessThan(1e-6);
  const axis=tree.localToWorld(new Vector3(0,1,0)).sub(pivot).normalize();expect(axis.dot(expectedNormal)).toBeCloseTo(1);
  const radial=tree.localToWorld(new Vector3(1,0,0)).sub(pivot).normalize();if(time===2)tangent=radial;if(time===10)expect(radial.dot(tangent!)).toBeCloseTo(Math.cos(8*.12));
 }
 // Normalization and source mesh rotation remain unchanged; only the shared root is tilted.
 expect(sculpture.root.getObjectByName('Meshy golden tree')!.rotation.x).toBe(0);
 sculpture.dispose();
});
it('keeps petals descending toward the root plane instead of camera-down or through the certificate',async()=>{
 const sculpture=createCustomTree({signal:new AbortController().signal,onState:()=>{},loadModel:async()=>model()});await sculpture.ready;
 const particle=sculpture.root.getObjectByName('Continuous golden petal rain')! as ReturnType<typeof createPetalRain>['mesh'];
 const a=new Matrix4(),b=new Matrix4(),position=new Vector3(),rotation=new Quaternion(),scale=new Vector3();
 sculpture.update(2,false,true);particle.getMatrixAt(0,a);sculpture.root.updateMatrixWorld(true);const first=new Vector3().setFromMatrixPosition(a).applyMatrix4(particle.matrixWorld);
 sculpture.update(2.01,false,true);particle.getMatrixAt(0,b);const next=new Vector3().setFromMatrixPosition(b).applyMatrix4(particle.matrixWorld);
 expect(next.z).toBeLessThan(first.z);
 for(let i=0;i<particle.count;i++){particle.getMatrixAt(i,a);a.decompose(position,rotation,scale);expect(position.y).toBeGreaterThanOrEqual(0);}
 sculpture.dispose();
});
