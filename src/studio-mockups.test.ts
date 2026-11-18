import { expect, it } from 'vitest';
import { studioEditions, studioSizes } from './studio/editions';
import { studioGallery } from './studio/gallery';
import audit from '../docs/exact-gallery-published-assets.json';
import sizing from '../docs/studio-size-gallery-audit.json';
it('uses a distinct size-specific room composition and unchanged authentic print detail',()=>{
 for(const edition of studioEditions)for(const size of studioSizes){
  const views=studioGallery(edition,size.id);
  expect(views.map(v=>v.kind)).toEqual(['reference','clean']);
  expect(views[0].image.variants.at(-1)?.src).toBe(`/studio-editions/size-gallery/${edition.artworkId}-${size.id}-1122.webp`);
  expect(views[0].modeledSizeIds).toEqual([size.id]);
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

it('verifies 75% full-sheet and frame geometry at a fixed center, with stationary backgrounds',()=>{
 expect(sizing).toHaveLength(5);
 for(const item of sizing){
  const large=item.sizes.find(s=>s.sizeId==='12x16')!;
  const small=item.sizes.find(s=>s.sizeId==='9x12')!;
  expect(large.sheetPixels).toEqual([660,880]);expect(small.sheetPixels).toEqual([495,660]);
  expect(small.center).toEqual(large.center);
  for(const i of [0,1])expect(small.sheetPixels[i]/large.sheetPixels[i]).toBe(.75);
  expect((small.frameBounds[2]-small.frameBounds[0])/(large.frameBounds[2]-large.frameBounds[0])).toBe(.75);
  expect((small.frameBounds[3]-small.frameBounds[1])/(large.frameBounds[3]-large.frameBounds[1])).toBe(.75);
  expect(item.stationaryBackgroundOutsideUnion).toBe(true);expect(item.completeAuthenticDesign).toBe(true);
 }
});
