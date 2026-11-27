// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CertificatePage } from './coa/CertificatePage';
import { certificateRecords } from './coa/records';
import { arForCertificate } from './ar/config';
import { artworkHubEntries, finalCameraPath } from './ar/finalExperiences';
import { createBotanicalSculpture } from './ar/botanical';
import { ImagePoseFilter } from './ar/pose';
import { Matrix4, Vector3, Quaternion, Mesh } from 'three';
import { coverRect } from './ar/recording';
beforeAll(()=>{
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
});
afterEach(cleanup);
const path='/coa/forest-and-flowers/mother-nature/original/';
const launchLabel = 'Experience in Augmented Reality';
function page(url=path){return render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/coa/forest-and-flowers/:artworkSlug/:designation" element={<CertificatePage/>}/></Routes></MemoryRouter>);}
it('maps all 15 permanent certificate paths to the exact editions used by the ten hub experiences',()=>{
 const hubTargets = artworkHubEntries().flatMap(artwork => artwork.certificates);
 expect(hubTargets).toHaveLength(15);
 for (const record of certificateRecords) {
  const target = arForCertificate(record.path);
  expect(target).toBe(hubTargets.find(experience => experience.certificatePaths.includes(record.path)));
  expect(target).toMatchObject({ artworkId: record.artworkId, certificatePaths: [record.path] });
  expect(target?.id).toMatch(new RegExp(`-${record.designation}$`));
 }
 expect(arForCertificate('/coa/forest-and-flowers/dragon-lily/collectors-edition/')).toBeUndefined();
});
it('opens the approved V5 scene with the Collector’s Edition tracking target and returns to that certificate',async()=>{
 const collectorPath='/coa/forest-and-flowers/mother-nature/collectors-edition/';
 page(collectorPath);
 fireEvent.click(screen.getByRole('link',{name:launchLabel}));
 const iframe=screen.getByTitle('Mother Nature augmented reality camera');
 expect(iframe.getAttribute('src')).toBe('/ar-camera.html?hub=1&experience=mother-nature-collectors-edition&variant=final');
 fireEvent(window,new MessageEvent('message',{origin:location.origin,source:(iframe as HTMLIFrameElement).contentWindow,data:{type:'vpa-ar-exit'}}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 expect(screen.getByText('Collector’s Edition')).toBeTruthy();
});
it('opens an isolated, camera-capable AR frame only on request and exits back to the same certificate',async()=>{
 const leavesPath='/coa/forest-and-flowers/75-leaves/original/';
 page(leavesPath);expect(document.querySelector('iframe')).toBeNull();
 expect(screen.getByText(/tap Start camera/)).toBeTruthy();
 fireEvent.click(screen.getByRole('link',{name:launchLabel}));
 expect(screen.getByRole('dialog')).toBeTruthy();
 const iframe=screen.getByTitle('75 Leaves augmented reality camera');
 expect(iframe.getAttribute('src')).toBe(finalCameraPath(arForCertificate(leavesPath)!));
 expect(iframe.getAttribute('allow')).toBe('camera; accelerometer; gyroscope; web-share');
 fireEvent(window,new MessageEvent('message',{origin:location.origin,source:(iframe as HTMLIFrameElement).contentWindow,data:{type:'vpa-ar-exit'}}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 expect(screen.getByRole('heading',{level:1,name:'75 Leaves'})).toBeTruthy();
 expect(document.body.style.overflow).toBe('');
});
it('supports direct AR links, Escape, and rejects exit messages from an unrelated window',async()=>{
 page(path+'?ar=1');
 expect(screen.getByRole('dialog')).toBeTruthy();
 fireEvent(window,new MessageEvent('message',{origin:location.origin,source:window,data:{type:'vpa-ar-exit'}}));
 expect(screen.getByRole('dialog')).toBeTruthy();
 fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
});
it('builds a lightweight, dimensional botanical scene and honours reduced motion',()=>{
 const sculpture=createBotanicalSculpture();let triangles=0;
 sculpture.root.traverse(object=>{if(object instanceof Mesh){const count=object.geometry.index?.count??object.geometry.attributes.position.count;triangles+=count/3*(('count' in object)?Number(object.count):1);expect(object.material).toBeTruthy();}});
 expect(triangles).toBeLessThan(65000);
 expect(sculpture.root.getObjectByName('Sculpted flower')).toBeTruthy();
 expect(sculpture.root.getObjectByName('Sculpted mushroom')).toBeTruthy();
 expect(sculpture.root.position.z).toBeGreaterThan(.2);
 sculpture.update(0,false,true);expect(sculpture.root.scale.x).toBeLessThan(.01);
 sculpture.update(2,false,true);expect(sculpture.root.scale.x).toBe(1);
 sculpture.update(3,true,true);expect(sculpture.root.getObjectByName('Falling gold petals')!.visible).toBe(false);
 sculpture.dispose();
});
it('smooths small pose changes, snaps on reacquisition and preserves scale',()=>{
 const filter=new ImagePoseFilter();const pose=(x:number)=>new Matrix4().compose(new Vector3(x,0,-4),new Quaternion(),new Vector3(1,1,1));
 expect(filter.update(pose(0),1).elements[12]).toBe(0);
 const smoothed=filter.update(pose(.03),1/30).elements[12];expect(smoothed).toBeGreaterThan(0);expect(smoothed).toBeLessThan(.03);
 filter.reset();expect(filter.update(pose(1),1/30).elements[12]).toBe(1);
});
it('matches the on-screen cover crop when compositing portrait and landscape recording frames',()=>{
 expect(coverRect(1280,720,360,640)).toEqual({x:(360-1280*640/720)/2,y:0,width:1280*640/720,height:640});
 expect(coverRect(720,1280,640,360).width).toBe(640);
});
