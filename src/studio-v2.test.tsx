// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudioProduct } from './studio/StudioStore';
import { StudioEditions } from './studio/StudioEditions';
import { studioArtwork, studioEditions, studioProductPath, studioPrintImage } from './studio/editions';
import { printNeighbors, StudioPrintNavigation } from './studio/StudioPrintNavigation';
import { additionalStudioViews, studioGallery } from './studio/gallery';
afterEach(()=>{cleanup();delete additionalStudioViews[studioEditions[0].id];});
it('navigates the five prints in order, wrapping both ends without pointing to original artwork pages',()=>{
 expect(studioEditions.map(e=>e.artworkId)).toEqual(['mother-nature','ethereal-bloom','tiger-lily','75-leaves','a-forest-forgotten']);
 studioEditions.forEach((edition,i)=>{
  const neighbors=printNeighbors(edition);
  expect(neighbors.previous).toBe(studioEditions[(i+4)%5]);expect(neighbors.next).toBe(studioEditions[(i+1)%5]);
  const view=render(<MemoryRouter><StudioPrintNavigation edition={edition}/></MemoryRouter>);
  expect(screen.getByRole('link',{name:`Previous Studio Edition: ${studioArtwork(neighbors.previous).title}`}).getAttribute('href')).toBe(studioProductPath(neighbors.previous));
  expect(screen.getByRole('link',{name:`Next Studio Edition: ${studioArtwork(neighbors.next).title}`}).getAttribute('href')).toBe(studioProductPath(neighbors.next));
  expect(screen.getByRole('link',{name:'View All Studio Editions'}).getAttribute('href')).toBe('/studio-editions');view.unmount();
 });
});
it('keeps unapproved mockups out of galleries and cards, without substituting original photographs',()=>{
 const edition=studioEditions[0];
 additionalStudioViews[edition.id]=[{id:'pending-wall',kind:'lifestyle',label:'Lifestyle',image:studioPrintImage(edition),approval:'pending'}];
 expect(studioGallery(edition).some(v=>v.id==='pending-wall')).toBe(false);
 expect(studioGallery(edition).map(v=>v.kind)).toEqual(['reference','clean']);
 const {container}=render(<MemoryRouter><StudioEditions/></MemoryRouter>);
 expect(container.querySelectorAll('.has-lifestyle')).toHaveLength(4);expect(container.querySelectorAll('img')).toHaveLength(9);
});
it('supports approved extra gallery views with explicit touch/keyboard controls',()=>{
 const edition=studioEditions[0];
 additionalStudioViews[edition.id]=[{id:'fixture-frame',kind:'framed',label:'Framed print',image:{...studioPrintImage(edition),alt:'Approved test fixture'},approval:'artist-approved',verifiedSizeIds:['9x12']}];
 render(<MemoryRouter initialEntries={['/studio-editions/mother-nature/']}><Routes><Route path="/studio-editions/:productSlug" element={<StudioProduct/>}/></Routes></MemoryRouter>);
 const control=screen.getByRole('button',{name:'Framed print'});fireEvent.click(control);
 expect(control.getAttribute('aria-pressed')).toBe('true');expect(screen.getByRole('img',{name:'Approved test fixture'})).toBeTruthy();
 fireEvent.click(screen.getByRole('radio',{name:'12 × 16 inches'}));
 expect(screen.queryByRole('button',{name:'Framed print'})).toBeNull();
 expect(screen.queryByRole('img',{name:'Approved test fixture'})).toBeNull();
 expect(screen.queryByRole('button',{name:/checkout|buy|cart/i})).toBeNull();
});
