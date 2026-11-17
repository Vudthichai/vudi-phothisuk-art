import approvedMotherNature from './mother-nature-photograph.json';
import mockupImages from './mockup-images.json';
import type { ForestImage } from '../forest/types';
import { studioPrintImage, studioSizes, type StudioEdition } from './editions';
export type StudioGalleryView = {
  id: string;
  kind: 'clean' | 'framed' | 'lifestyle' | 'detail' | 'reference';
  label: string;
  image: ForestImage;
  approval: 'pending' | 'artist-approved' | 'approved-print-composite';
  /** Proportions computed from a declared mockup scale, not a measured real room. */
  modeledSizeIds?: readonly string[];
  /** Required review evidence before any claim of physical room scale. */
  verifiedSizeIds?: readonly string[];
};
/** Derived compositions use approved source designs, not generated artwork.
 * Artist approval of the final compositions occurs at PR review/merge.
 */
const compositions = mockupImages as Record<string, Record<string, readonly StudioGalleryView[]>>;
export const additionalStudioViews: Partial<Record<string, readonly StudioGalleryView[]>> = {};
export function studioGallery(edition: StudioEdition, sizeId = studioSizes[0].id): readonly StudioGalleryView[] {
  const derived = (compositions[edition.artworkId]?.[sizeId] ?? []).filter(view => view.approval === 'approved-print-composite' && view.modeledSizeIds?.includes(sizeId));
  const supplied = (additionalStudioViews[edition.id] ?? []).filter(view => view.approval === 'artist-approved' && (!['framed','lifestyle'].includes(view.kind) || view.verifiedSizeIds?.includes(sizeId)));
  const primary: readonly StudioGalleryView[] = edition.artworkId === 'mother-nature'
    ? [{ id:'mother-nature-approved-photograph', kind:'reference', label:'Gallery photograph', image:{...approvedMotherNature,role:'full'}, approval:'artist-approved' }]
    : derived;
  return [...primary, { id: `${edition.id}-clean`, kind: 'clean', label: 'Print design', image: studioPrintImage(edition), approval: 'artist-approved' }, ...supplied];
}
export function studioPrimaryImage(edition: StudioEdition) { return studioGallery(edition)[0].image; }
