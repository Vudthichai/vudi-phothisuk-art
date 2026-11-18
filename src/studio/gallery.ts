import exactGalleryImages from './exact-gallery-images.json';
import sizeGalleryImages from './size-gallery-images.json';
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
const sizedImages = sizeGalleryImages as Record<string, Record<string, ForestImage>>;
export const additionalStudioViews: Partial<Record<string, readonly StudioGalleryView[]>> = {};
export function studioGallery(edition: StudioEdition, sizeId = studioSizes[0].id): readonly StudioGalleryView[] {
  const image = sizedImages[edition.artworkId]?.[sizeId];
  if (!image) throw new Error(`Missing size-specific gallery composite: ${edition.artworkId}/${sizeId}`);
  const supplied = (additionalStudioViews[edition.id] ?? []).filter(view => view.approval === 'artist-approved' && (!['framed','lifestyle'].includes(view.kind) || view.verifiedSizeIds?.includes(sizeId)));
  return [{ id:`${edition.id}-room-${sizeId}`, kind:'reference', label:'In a Space', image, approval:'approved-print-composite', modeledSizeIds:[sizeId] },
    { id:`${edition.id}-clean`, kind:'clean', label:'Artwork Detail', image:studioPrintImage(edition), approval:'artist-approved' }, ...supplied];
}
// Keep reviewed collection-card/sharing imagery unchanged; only the product gallery varies by size.
export function studioPrimaryImage(edition: StudioEdition) { return approvedImages[edition.artworkId]; }
