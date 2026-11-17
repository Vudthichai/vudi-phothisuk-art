import { expect, it } from 'vitest';
import { studioEditions } from './studio/editions';
import { studioGallery } from './studio/gallery';
import checks from '../docs/studio-mockup-composition-checks.json';
it('uses the correct two size-specific mockups before the approved design for every product',()=>{
 for(const edition of studioEditions) for(const size of ['9x12','12x16']) {
  const views=studioGallery(edition,size);
  if (edition.artworkId === 'mother-nature') {
   expect(views.map(v=>v.kind)).toEqual(['reference','clean']);
   expect(views[0].image.variants.at(-1)?.src).toBe('/studio-editions/approved/mother-nature-gallery-still-life-1122.webp');
   continue;
  }
  expect(views.map(v=>v.kind)).toEqual(['framed','lifestyle','clean']);
  for(const view of views.slice(0,2)){
   expect(view.modeledSizeIds).toEqual([size]);
   expect(view.image.alt.toLowerCase()).toContain('mockup');
   for(const variant of view.image.variants){
    expect(variant.src).toContain(`/mockups/${edition.artworkId}-`);
    expect(variant.src).toContain(`-${size}-`);
    expect(Math.max(variant.width,variant.height)).toBeLessThanOrEqual(1800);
   }
  }
 }
});
it('records complete, unchanged artwork composites and 4:3 physical-size ratios',()=>{
 expect(checks.checks).toHaveLength(20);
 for(const edition of studioEditions)for(const kind of ['gallery','lifestyle']){
  const small=checks.checks.find(c=>c.artworkId===edition.artworkId&&c.kind===kind&&c.sizeId==='9x12')!;
  const large=checks.checks.find(c=>c.artworkId===edition.artworkId&&c.kind===kind&&c.sizeId==='12x16')!;
  expect(small.artworkPixelComparison).toBe('exact before web encoding');
  expect(large.sourceSha256).toBe(small.sourceSha256);
  expect(large.printPixels[0]/small.printPixels[0]).toBeCloseTo(4/3,2);
  expect(large.printPixels[1]/small.printPixels[1]).toBeCloseTo(4/3,2);
 }
});

it('records directional frame highlights and cast shadows outside the untouched design',()=>{
 expect(checks.layoutVersion).toBe(3);
 for(const check of checks.checks){
  expect(check.frameLighting.highlightRGB.reduce((a,b)=>a+b,0)).toBeGreaterThan(check.frameLighting.shadowFaceRGB.reduce((a,b)=>a+b,0));
  expect(check.frameLighting.castShadowDarkensWall).toBe(true);
  expect(check.artworkPixelComparison).toBe('exact before web encoding');
 }
});
