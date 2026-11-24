import { Box3, Group, Mesh, Vector3, Texture, BufferGeometry, Material } from 'three';
import { createBotanicalSculpture } from './botanical';
import { createPetalRain } from './petalRain';
export const TREE_MODEL_URL='/ar/models/mother-nature-golden-tree.glb';
export const TREE_HEIGHT=1.5; // Previous tree: ~0.83 target widths; imported tree: 1.81× height.
export type SculptureState='loading'|'ready'|'fallback';
export function disposeModel(root:Group) {
  const geometries=new Set<BufferGeometry>(),materials=new Set<Material>(),textures=new Set<Texture>(),images=new Set<{close:()=>void}>();
  root.traverse(object=>{if(object instanceof Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof Texture)textures.add(value);}}});
  for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
  for(const texture of textures){const image=texture.source?.data;if(image&&typeof image.close==='function')images.add(image);texture.dispose();}for(const image of images)image.close();
}
export function fitTree(model:Group) {
  const bounds=new Box3().setFromObject(model),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());
  if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Invalid sculpture bounds');
  const normalized=new Group();normalized.name='Meshy golden tree';normalized.scale.setScalar(TREE_HEIGHT/size.y);
  model.position.sub(new Vector3(center.x,bounds.min.y,center.z));normalized.add(model);return normalized;
}
export async function loadTreeModel(signal:AbortSignal):Promise<Group> {
  const response=await fetch(TREE_MODEL_URL,{signal});if(!response.ok)throw new Error('Sculpture download failed');
  if(Number(response.headers.get('content-length'))>15_000_000)throw new Error('Sculpture download exceeds mobile budget');
  const buffer=await response.arrayBuffer();signal.throwIfAborted();if(buffer.byteLength>15_000_000)throw new Error('Sculpture exceeds mobile budget');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');signal.throwIfAborted();
  const gltf=await new GLTFLoader().parseAsync(buffer,'');
  if(signal.aborted){disposeModel(gltf.scene);signal.throwIfAborted();}return gltf.scene;
}
export function createCustomTree({signal,onState,loadModel=loadTreeModel}:{signal:AbortSignal;onState:(state:SculptureState)=>void;loadModel?:(signal:AbortSignal)=>Promise<Group>}) {
  const root=new Group();root.name='Mother Nature custom sculpture';root.position.set(0,-.55,0);
  // MindAR's image lies in local XY. Map sculpture +Y (trunk) to image +Z (outward normal).
  // Keep the root pivot on the paper; the child Y spin remains around the upright trunk.
  root.rotation.x=Math.PI/2;
  const reveal=new Group(),turning=new Group();root.add(reveal);reveal.add(turning);
  const fallback=createBotanicalSculpture();fallback.root.position.set(0,0,0);turning.add(fallback.root);
  const rain=createPetalRain();root.add(rain.mesh);
  const download=new AbortController();let disposed=false,model:Group|undefined,firstTracked:number|undefined,modelReveal:number|undefined;
  const abort=()=>download.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  const timer=window.setTimeout(abort,30000);onState('loading');
  const ready=loadModel(download.signal).then(asset=>{
    if(disposed||download.signal.aborted){disposeModel(asset);return;}
    try{model=fitTree(asset);turning.add(model);turning.remove(fallback.root);fallback.dispose();onState('ready');}
    catch(error){disposeModel(asset);throw error;}
  }).catch(()=>{if(!disposed&&!signal.aborted)onState('fallback');}).finally(()=>clearTimeout(timer));
  function update(time:number,reduced:boolean,tracked:boolean) {
    if(tracked&&firstTracked===undefined)firstTracked=time;
    if(model&&tracked&&modelReveal===undefined)modelReveal=time;
    const start=model?modelReveal:firstTracked,progress=reduced?1:Math.min(1,Math.max(0,(time-(start??time))/1.8)),ease=1-(1-progress)**3;
    reveal.scale.setScalar(Math.max(.001,ease));turning.rotation.y=reduced?.3:.3+time*.12;
    if(!model){fallback.update(time,true,tracked);fallback.root.rotation.y=0;fallback.root.getObjectByName('Falling gold petals')!.visible=false;}
    rain.update(time,reduced);rain.mesh.visible=tracked&&!reduced;
  }
  function dispose(){if(disposed)return;disposed=true;download.abort();clearTimeout(timer);signal.removeEventListener('abort',abort);if(model)disposeModel(model);else fallback.dispose();rain.dispose();root.clear();}
  return {root,ready,update,dispose};
}
