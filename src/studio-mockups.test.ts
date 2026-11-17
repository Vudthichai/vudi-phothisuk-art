import { expect, it } from 'vitest';
import { studioEditions, studioSizes } from './studio/editions';
import { studioGallery } from './studio/gallery';
import audit from '../docs/exact-gallery-published-assets.json';
it('uses one reviewed room composition and an authentic print detail for every product and size',()=>{
 for(const edition of studioEditions)for(const size of studioSizes){
  const views=studioGallery(edition,size.id);
  expect(views.map(v=>v.kind)).toEqual(['reference','clean']);
  expect(views[0].image.variants.at(-1)?.src).toBe(`/studio-editions/exact-gallery/${edition.artworkId}-1122.webp`);
  expect(views[0].modeledSizeIds).toBeUndefined();
  for(const variant of views[0].image.variants){expect(Math.max(variant.width,variant.height)).toBeLessThanOrEqual(1402);expect(variant.src).not.toContain('/mockups/');}
 }
});
it('records pixel preservation against the exact same approved room for all five published composites',()=>{
 expect(audit.map(a=>a.artworkId)).toEqual(studioEditions.map(e=>e.artworkId));
 for(const entry of audit){
  expect(entry.roomMasterSha256).toBe('4715d3d84251d59a936fe11a78442248f70fbc722c46b94eca1d4ab50fc2b215');
  expect(entry.outsideMaskChangedPixels).toBe(0);expect(entry.nativeSize).toEqual([1122,1402]);
  expect(entry.reviewedPngSha256).toMatch(/^[a-f0-9]{64}$/);expect(entry.nativeDecodedRgbSha256).toMatch(/^[a-f0-9]{64}$/);
 }
});
