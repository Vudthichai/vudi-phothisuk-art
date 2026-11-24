// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { BoxGeometry, Box3, Group, Mesh, MeshStandardMaterial, Texture, Vector3 } from 'three';
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
 const dispose=vi.spyOn(texture,'dispose'),geometryDispose=vi.spyOn(mesh.geometry,'dispose'),states:string[]=[];
 const sculpture=createCustomTree({signal:new AbortController().signal,onState:s=>states.push(s),loadModel:()=>new Promise(r=>resolve=r)});
 expect(sculpture.root.getObjectByName('Golden botanical sculpture')).toBeTruthy();resolve(asset);await sculpture.ready;
 expect(states).toEqual(['loading','ready']);expect(sculpture.root.getObjectByName('Meshy golden tree')).toBeTruthy();expect(sculpture.root.getObjectByName('Golden botanical sculpture')).toBeUndefined();
 sculpture.update(0,true,true);expect(sculpture.root.getObjectByName('Continuous golden petal rain')!.visible).toBe(false);
 sculpture.dispose();sculpture.dispose();expect(dispose).toHaveBeenCalledOnce();expect(geometryDispose).toHaveBeenCalledOnce();
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
