// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CertificatePage } from './coa/CertificatePage';
import { certificateRecords } from './coa/records';
import { arForCertificate, arExperiences } from './ar/config';
import { createGoldenPetal } from './ar/petal';
beforeAll(()=>{
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
});
afterEach(cleanup);
const path='/coa/forest-and-flowers/mother-nature/original/';
function page(url=path){return render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/coa/forest-and-flowers/:artworkSlug/:designation" element={<CertificatePage/>}/></Routes></MemoryRouter>);}
it('only enables the exact original-certificate front, leaving all other QR paths unchanged and disabled',()=>{
 expect(arExperiences).toHaveLength(1);
 expect(certificateRecords.filter(record=>arForCertificate(record.path)).map(record=>record.path)).toEqual([path]);
 expect(arForCertificate('/coa/forest-and-flowers/mother-nature/collectors-edition/')).toBeUndefined();
 expect(certificateRecords).toHaveLength(15);
});
it('opens an isolated, camera-capable AR frame only on request and exits back to the same certificate',async()=>{
 page();expect(document.querySelector('iframe')).toBeNull();
 fireEvent.click(screen.getByRole('link',{name:'Experience in AR'}));
 expect(screen.getByRole('dialog')).toBeTruthy();
 const iframe=screen.getByTitle('Mother Nature augmented reality camera');
 expect(iframe.getAttribute('src')).toBe('/ar-camera.html?experience=mother-nature-original');
 expect(iframe.getAttribute('allow')).toBe('camera');
 fireEvent.click(screen.getByRole('button',{name:'Exit AR'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 expect(screen.getByRole('heading',{level:1,name:'Mother Nature'})).toBeTruthy();
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
it('keeps the first sculpture restrained, untextured, and within a mobile geometry budget',()=>{
 const petal=createGoldenPetal();
 expect(petal.mesh.name).toBe('Golden petal');
 expect(petal.mesh.geometry.getIndex()!.count/3).toBeLessThan(1000);
 expect(petal.mesh.material.map).toBeNull();
 expect(petal.mesh.position.z).toBeGreaterThan(0);
 expect(petal.mesh.material.metalness).toBeGreaterThan(.5);
 petal.dispose();
});
