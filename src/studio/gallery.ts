import exactGalleryImages from './exact-gallery-images.json';
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
/** Artist-reviewed exact-room composites; retired generic scenes are not loaded. */
const approvedImages = exactGalleryImages as Record<string, ForestImage>;
export const additionalStudioViews: Partial<Record<string, readonly StudioGalleryView[]>> = {};
export function studioGallery(edition: StudioEdition, sizeId = studioSizes[0].id): readonly StudioGalleryView[] {
  const image = approvedImages[edition.artworkId];
  if (!image) throw new Error(`Missing reviewed gallery composite: ${edition.artworkId}`);
  const supplied = (additionalStudioViews[edition.id] ?? []).filter(view => view.approval === 'artist-approved' && (!['framed','lifestyle'].includes(view.kind) || view.verifiedSizeIds?.includes(sizeId)));
  return [{ id:`${edition.id}-exact-room`, kind:'reference', label:'Gallery mockup', image, approval:'artist-approved' },
    { id:`${edition.id}-clean`, kind:'clean', label:'Print design', image:studioPrintImage(edition), approval:'artist-approved' }, ...supplied];
}
export function studioPrimaryImage(edition: StudioEdition) { return studioGallery(edition)[0].image; }
