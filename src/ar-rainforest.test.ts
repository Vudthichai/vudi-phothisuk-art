// @vitest-environment jsdom
import {expect,it,vi,afterEach} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Box3,Vector3} from 'three';
import {DEFAULT_PLACEMENT,placeRainforest,setupRainforestLab} from './ar/experimental/rainforest';
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();});
it('stands the complete model along the target normal, plants its roots, and adjusts placement uniformly without spinning',()=>{
 const source=new Group();source.add(new Mesh(new BoxGeometry(2,4,1),new MeshStandardMaterial()));const tree=placeRainforest(source,DEFAULT_PLACEMENT);tree.root.updateMatrixWorld(true);
 const bounds=new Box3().setFromObject(tree.root);expect(bounds.min.z).toBeCloseTo(0);expect(bounds.max.z).toBeCloseTo(3);
 tree.setPlacement({height:4,x:.2,y:-.3,yaw:45});tree.root.updateMatrixWorld(true);const moved=new Box3().setFromObject(tree.root);expect(moved.min.z).toBeCloseTo(0);expect(moved.max.z).toBeCloseTo(4);expect(tree.root.position.toArray()).toEqual([.2,-.3,0]);expect(tree.root.children[0].rotation.y).toBeCloseTo(Math.PI/4);
});
it('exposes bounded lab controls, metrics and cleanup without opening a camera or adding any other scene',()=>{
 const host=document.createElement('main');document.body.append(host);const lab=setupRainforestLab(host);expect(host.querySelectorAll('input')).toHaveLength(5);expect(host.querySelector('video')).toBeNull();lab.onMetrics({fps:31,frameP50Ms:32,frameP95Ms:40,renderCpuP95Ms:4,drawCalls:1,triangles:229534,geometries:1,textures:3,trackingFound:true,lossEvents:0,poseUpdates:20,poseStepMeanTargetWidths:.001,poseAgeMs:3});expect(host.querySelector('pre')!.textContent).toContain('31');lab.dispose();expect(host.querySelector('pre')!.textContent).toContain('endedAt');
});
