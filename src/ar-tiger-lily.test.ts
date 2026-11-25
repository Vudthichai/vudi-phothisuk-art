// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { createTigerLilyFactory, placeTigerLily, TIGER_LILY_HEIGHT, TIGER_LILY_BLOSSOM_TILT } from './ar/experimental/tigerLily';
const loader=vi.hoisted(()=>({parse:vi.fn()}));
vi.mock('three/addons/loaders/GLTFLoader.js',()=>({GLTFLoader:class{setMeshoptDecoder(){return this;}parseAsync(...args:unknown[]){return loader.parse(...args);}}}));
function asset(){const model=new Group();model.add(new Mesh(new BoxGeometry(2,4,1),new MeshStandardMaterial()));return model;}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();loader.parse.mockReset();});
it('keeps size and anchor placement while tilting the opening 30 degrees toward the viewer in model space',()=>{
 const model=asset(),placed=placeTigerLily(model);placed.root.updateMatrixWorld(true);const fit=placed.sway.children[0];
 expect(placed.root.position.z).toBeCloseTo(.035);expect(fit.scale.y*4).toBeCloseTo(TIGER_LILY_HEIGHT);expect(fit.rotation.x).toBeCloseTo(-Math.PI/6);expect(fit.rotation.x).toBe(TIGER_LILY_BLOSSOM_TILT);expect(placed.root.position.y).toBeCloseTo(-.18);expect(placed.root.rotation.x).toBeCloseTo(Math.PI/2);expect(model.children).toHaveLength(1);
 const axis=new Vector3(0,1,0).transformDirection(placed.root.matrixWorld);expect(axis.z).toBeCloseTo(1);
 const opening=new Vector3(0,0,1).transformDirection(fit.matrixWorld),trunk=new Vector3(0,1,0).transformDirection(fit.matrixWorld);expect(opening.z).toBeCloseTo(.5);expect(trunk.z).toBeCloseTo(Math.cos(Math.PI/6));
 placed.turn.rotation.y=Math.PI/2;placed.root.updateMatrixWorld(true);expect(new Vector3(0,0,1).transformDirection(fit.matrixWorld).distanceTo(opening)).toBeGreaterThan(.5);expect(fit.rotation.x).toBe(TIGER_LILY_BLOSSOM_TILT);
});
it('loads one Tiger asset, pauses motion on lost tracking, respects reduced motion and releases resources',async()=>{
 const model=asset(),geometry=(model.children[0] as Mesh).geometry,dispose=vi.spyOn(geometry,'dispose');
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)})));loader.parse.mockResolvedValue({scene:model});
 const host=document.createElement('main'),states:string[]=[],error=vi.fn();const session=createTigerLilyFactory(host)({signal:new AbortController().signal,onState:s=>states.push(s),onError:error});
 await vi.waitFor(()=>expect(states).toEqual(['loading','ready']));expect(fetch).toHaveBeenCalledOnce();expect(error).not.toHaveBeenCalled();
 session.update(0,false,true);session.update(.1,false,true);const turn=session.root.children[0].children[0];const angle=turn.rotation.y;expect(angle).toBe(.1 / 11 * Math.PI * 2);
 session.update(.2,false,false);expect(session.root.visible).toBe(false);expect(turn.rotation.y).toBe(angle);session.update(.3,true,true);expect(turn.rotation.y).toBe(0);
 session.dispose();session.dispose();expect(dispose).toHaveBeenCalledOnce();expect(host.dataset.tigerModel).toBe('stopped');
});
it('handles failed downloads and disposes an asset that finishes parsing after Exit',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false})));const error=vi.fn(),signal=new AbortController();const failed=createTigerLilyFactory(document.createElement('main'))({signal:signal.signal,onState:()=>{},onError:error});await vi.waitFor(()=>expect(error).toHaveBeenCalledOnce());failed.dispose();
 const model=asset(),dispose=vi.spyOn((model.children[0] as Mesh).geometry,'dispose');let finish!:(v:{scene:Group})=>void;
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)})));loader.parse.mockImplementation(()=>new Promise(resolve=>finish=resolve));const session=createTigerLilyFactory(document.createElement('main'))({signal:new AbortController().signal,onState:()=>{},onError:vi.fn()});await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));session.dispose();finish({scene:model});await vi.waitFor(()=>expect(dispose).toHaveBeenCalledOnce());expect(session.root.children).toHaveLength(0);
});
