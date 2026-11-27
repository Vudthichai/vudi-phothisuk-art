// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Box3, BufferGeometry, LineSegments } from 'three';
import { arById } from './ar/config';
import { createRecognitionMarker, setupRecognition } from './ar/experimental/recognition';
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();});
it('retains the legacy standalone registry while protecting the hub from direct recognition URLs',()=>{
 expect(arById('mother-nature-original')?.id).toBe('mother-nature-original');
 expect(arById('tiger-lily-original')).toBeUndefined();const tiger=arById('tiger-lily-original',true)!;expect(tiger).toMatchObject({artworkId:'tiger-lily',previewOnly:true,recognitionOnly:false,modelAsset:'/ar/models/tiger-lily-orange.glb',targetIndex:0,targetFile:'/ar/targets/tiger-lily-original.mind',targetAspect:756/1024,entryPaths:[]});
});
it('shows a flat proportion-correct recognition anchor only while tracked and disposes it once',()=>{
 const marker=createRecognitionMarker(756/1024);marker.update(0,false,true);marker.root.updateMatrixWorld(true);const bounds=new Box3().setFromObject(marker.root);expect(bounds.min.x).toBeCloseTo(-.5);expect(bounds.max.x).toBeCloseTo(.5);expect(bounds.max.y-bounds.min.y).toBeCloseTo(1024/756);expect(bounds.min.z).toBeCloseTo(bounds.max.z);
 expect(marker.root.children).toHaveLength(1);const lines=marker.root.children[0] as LineSegments;const dispose=vi.spyOn(lines.geometry as BufferGeometry,'dispose');marker.update(1,false,false);expect(marker.root.visible).toBe(false);marker.update(2,false,true);expect(marker.root.visible).toBe(true);marker.dispose();marker.dispose();expect(dispose).toHaveBeenCalledOnce();
});
it('uses the existing handheld pose profile without fetching or substituting a 3D model',()=>{
 const host=document.createElement('main');document.body.append(host);const fetch=vi.spyOn(globalThis,'fetch'),states:string[]=[];const recognition=setupRecognition(host,arById('tiger-lily-original',true)!);const session=recognition.factory({signal:new AbortController().signal,onState:s=>states.push(s),onError:e=>{throw e;}});expect(states).toEqual(['ready']);expect(fetch).not.toHaveBeenCalled();expect(recognition.trackingTolerance).toEqual({warmup:3,miss:3});expect(session.root.name).toBe('Certificate image recognition anchor');expect(host.dataset.recognitionOnly).toBe('true');session.dispose();recognition.dispose();
});
it('refuses a normal or unverified experience in the recognition-only renderer',()=>{
 expect(()=>setupRecognition(document.createElement('main'),arById('mother-nature-original')!)).toThrow('verified recognition-only');
});
