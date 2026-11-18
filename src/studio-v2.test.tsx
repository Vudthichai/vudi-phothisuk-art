// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudioProduct } from './studio/StudioStore';
import { StudioEditions } from './studio/StudioEditions';
import { studioArtwork, studioEditions, studioProductPath, studioPrintImage } from './studio/editions';
import { ExploreStudioCollection } from './studio/ExploreStudioCollection';
import { additionalStudioViews, studioGallery } from './studio/gallery';
afterEach(()=>{cleanup();delete additionalStudioViews[studioEditions[0].id];});
it('offers the other four prints without previous/next navigation',()=>{
 studioEditions.forEach(edition=>{
  const view=render(<MemoryRouter><ExploreStudioCollection edition={edition}/></MemoryRouter>);
  expect(screen.getByRole('heading',{name:'Explore the Collection'})).toBeTruthy();
  const cards=[...view.container.querySelectorAll('article')];expect(cards).toHaveLength(4);
  expect(cards.map(card=>card.querySelector('h3')?.textContent)).toEqual(studioEditions.filter(e=>e.id!==edition.id).map(e=>studioArtwork(e).title));
  cards.forEach(card=>{expect(card.textContent).toContain('Studio Print');expect(card.textContent).toContain('Starting at $40');expect(card.querySelector('a')?.getAttribute('href')).toMatch(/^\/studio-editions\//);});
  expect(screen.queryByRole('link',{name:/Previous|Next/})).toBeNull();view.unmount();
 });
});
it('keeps unapproved mockups out of galleries and cards, without substituting original photographs',()=>{
 const edition=studioEditions[0];
 additionalStudioViews[edition.id]=[{id:'pending-wall',kind:'lifestyle',label:'Lifestyle',image:studioPrintImage(edition),approval:'pending'}];
 expect(studioGallery(edition).some(v=>v.id==='pending-wall')).toBe(false);
 expect(studioGallery(edition).map(v=>v.kind)).toEqual(['reference','clean']);
 const {container}=render(<MemoryRouter><StudioEditions/></MemoryRouter>);
 expect(container.querySelectorAll('.has-lifestyle')).toHaveLength(0);expect(container.querySelectorAll('img')).toHaveLength(5);
});
it('supports approved extra gallery views with explicit touch/keyboard controls',()=>{
 const edition=studioEditions[0];
 additionalStudioViews[edition.id]=[{id:'fixture-frame',kind:'framed',label:'Framed print',image:{...studioPrintImage(edition),alt:'Approved test fixture'},approval:'artist-approved',verifiedSizeIds:['9x12']}];
 render(<MemoryRouter initialEntries={['/studio-editions/mother-nature/']}><Routes><Route path="/studio-editions/:productSlug" element={<StudioProduct/>}/></Routes></MemoryRouter>);
 const control=screen.getByRole('button',{name:'Framed print'});fireEvent.click(control);
 expect(control.getAttribute('aria-pressed')).toBe('true');expect(screen.getByRole('img',{name:'Approved test fixture'})).toBeTruthy();
 fireEvent.click(screen.getByRole('radio',{name:'12 × 16 inches — $95'}));
 expect(screen.queryByRole('button',{name:'Framed print'})).toBeNull();
 expect(screen.queryByRole('img',{name:'Approved test fixture'})).toBeNull();
 expect(screen.queryByRole('button',{name:/checkout|buy|cart/i})).toBeNull();
});
