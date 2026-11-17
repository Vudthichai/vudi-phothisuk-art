// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudioProduct } from './studio/StudioStore';
import { StudioEditions } from './studio/StudioEditions';
import { ForestCollection } from './forest/ForestCollection';
import { forestCollection } from './forest/collection';
import { studioEditions } from './studio/editions';
afterEach(cleanup);
const base='/collections/forest-and-flowers';
const expected={'75-leaves':'75% of profits support veterans','a-forest-forgotten':'20% of profits support rainforest conservation'};
it('shows giving only on the two relevant cards, after price/status',()=>{
 const {container}=render(<MemoryRouter><StudioEditions/></MemoryRouter>);
 expect(container.querySelectorAll('.studio-card-giving')).toHaveLength(2);
 for(const [slug,line] of Object.entries(expected)) {
  const card=container.querySelector(`a[href="/studio-editions/${slug}/"]`)!.closest('article')!;
  expect(card.querySelector('.studio-card-giving')?.textContent).toBe(line);
  expect(card.querySelector('.studio-card-giving')?.previousElementSibling?.className).toBe('studio-price-status');
 }
});
it('places confirmed giving after descriptions only on the two selected product pages',()=>{
 for(const edition of studioEditions){
  const view=render(<MemoryRouter initialEntries={[`/studio-editions/${edition.artworkId}/`]}><Routes><Route path="/studio-editions/:productSlug" element={<StudioProduct/>}/></Routes></MemoryRouter>);
  const giving=view.container.querySelector('.studio-product-copy .studio-giving');
  if(edition.contribution){
   expect(giving).not.toBeNull();
   expect(giving?.previousElementSibling?.className).toBe('studio-product-description');
   expect(giving?.textContent).toContain(`${edition.contribution.percentOfProfit}% of profits from this Studio Print`);
   expect(giving?.textContent).not.toMatch(/proceeds|revenue|tax.deductible|partner|endorse/i);
   if(edition.artworkId==='75-leaves')expect(giving?.textContent).toContain('The recipient organization will be announced.');
   else expect(giving?.textContent).toContain('Junglekeepers');
  }else expect(giving).toBeNull();
  view.unmount();
 }
});
it('preserves original descriptions and availability while explicitly limiting percentages to prints',()=>{
 for(const slug of Object.keys(expected)){
  const art=forestCollection.artworks.find(a=>a.slug===slug)!;
  const view=render(<MemoryRouter initialEntries={[`${base}/${slug}`]}><Routes><Route path={`${base}/:artworkSlug`} element={<ForestCollection/>}/></Routes></MemoryRouter>);
  const giving=view.container.querySelector('.studio-edition-panel .studio-giving');
  expect(giving?.textContent).toContain('These percentages apply to Studio Print sales, not to this original artwork.');
  art.description.forEach(p=>expect(view.container.textContent).toContain(p));
  if(slug==='75-leaves')expect(view.container.textContent).toContain('Not for Sale');
  view.unmount();
 }
 const {container}=render(<MemoryRouter><ForestCollection/></MemoryRouter>);
 expect(container.querySelector('.forest-art-purpose h2')?.textContent).toBe('Art With Purpose');
 expect(container.querySelectorAll('.forest-purpose-works article')).toHaveLength(2);
 expect(container.querySelector('.forest-art-purpose')?.textContent).toContain('75% of profits from this Studio Print');
 expect(container.querySelector('.forest-art-purpose')?.textContent).toContain('20% of profits from this Studio Print');
});
