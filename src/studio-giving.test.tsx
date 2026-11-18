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
   const summary=view.container.querySelector('.studio-giving-summary');
   expect(summary?.previousElementSibling?.className).toBe('studio-product-price');
   expect(summary?.querySelector('strong')?.textContent).toBe(`${edition.contribution.percentOfProfit}%`);
   expect(summary?.textContent).toBe(edition.artworkId==='75-leaves'
     ? '75% of profits from this Studio Print will support a veterans foundation. Recipient to be announced.'
     : '20% of profits from this Studio Print will be donated to Junglekeepers in support of rainforest conservation.');
   expect(giving?.previousElementSibling?.className).toBe('studio-product-description');
   expect(giving?.textContent).toContain(`${edition.contribution.percentOfProfit}% of profits from this Studio Print`);
   expect(giving?.textContent).not.toMatch(/proceeds|revenue|tax.deductible|partner|endorse/i);
   if(edition.artworkId==='75-leaves')expect(giving?.textContent).toContain('The recipient organization will be announced.');
   else { expect(giving?.textContent).toContain('Junglekeepers');expect(giving?.querySelector('a')?.getAttribute('href')).toBe('https://www.junglekeepers.org'); }
  }else { expect(giving).toBeNull();expect(view.container.querySelector('.studio-giving-summary')).toBeNull(); }
  view.unmount();
 }
});
it('separates print giving from exact original paragraphs without duplicating it, applying the updated profit pledge',()=>{
 for(const slug of Object.keys(expected)){
  const art=forestCollection.artworks.find(a=>a.slug===slug)!;
  const view=render(<MemoryRouter initialEntries={[`${base}/${slug}`]}><Routes><Route path={`${base}/:artworkSlug`} element={<ForestCollection/>}/></Routes></MemoryRouter>);
  const story=view.container.querySelector('.forest-editorial-story')!;
  const paragraphs=[...story.querySelectorAll(':scope > p')].map(p=>p.textContent);
  expect(paragraphs).toEqual(art.description.slice(0,2));
  const sections=story.querySelectorAll('.studio-giving');expect(sections).toHaveLength(1);
  expect(sections[0].querySelector('h3')?.textContent).toBe(art.title+' — '+(slug==='75-leaves'?'Giving Back':'Art for Conservation'));
  const statement=sections[0].querySelector('p')!.textContent!;
  expect(story.textContent!.split(statement)).toHaveLength(2);
  expect(statement).toContain(slug==='75-leaves'?'75% of profits from this Studio Print':'20% of profits from this original artwork and its Studio Prints');
  if(slug==='75-leaves')expect(view.container.textContent).toContain('Not for Sale');
  else {
   expect(story.querySelector('aside[aria-label="Conservation pledge"]')).toBeNull();
   expect(statement).toBe(art.description[2]);
   expect(sections[0].querySelector('a')?.getAttribute('href')).toBe('https://www.junglekeepers.org');
   expect(story.textContent).not.toMatch(/10%|sale price/);
   expect(sections[0].textContent).not.toContain('10%');
  }
  expect(view.container.querySelector('.studio-edition-panel .studio-giving')).toBeNull();
  view.unmount();
 }
 const {container}=render(<MemoryRouter><ForestCollection/></MemoryRouter>);
 expect(container.querySelectorAll('.forest-overview-copy .studio-giving')).toHaveLength(2);
 expect(container.querySelector('.forest-art-purpose')).toBeNull();
 for(const slug of Object.keys(expected)) {
  const art=forestCollection.artworks.find(a=>a.slug===slug)!;
  const card=container.querySelector(`[aria-labelledby="forest-exhibit-${slug}"]`)!;
  expect([...card.querySelectorAll('.forest-featured-excerpt')].map(p=>p.textContent)).toEqual(art.description.slice(0,2));
  expect(card.querySelectorAll('.studio-giving')).toHaveLength(1);
 }
});
