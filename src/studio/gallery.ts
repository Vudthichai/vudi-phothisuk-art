import type { ForestImage } from '../forest/types';
import { studioPrintImage, studioSizes, type StudioEdition } from './editions';
export type StudioGalleryView = {
  id: string;
  kind: 'clean' | 'framed' | 'lifestyle' | 'detail';
  label: string;
  image: ForestImage;
  approval: 'pending' | 'artist-approved';
  /** Required review evidence before any claim of physical room scale. */
  verifiedSizeIds?: readonly string[];
};
/** Add only supplied/approved public web derivatives here, never print masters.
 * No framed/lifestyle files have been approved yet; do not fabricate fallbacks.
 */
export const additionalStudioViews: Partial<Record<string, readonly StudioGalleryView[]>> = {};
export function studioGallery(edition: StudioEdition, sizeId = studioSizes[0].id): readonly StudioGalleryView[] {
  return [{ id: `${edition.id}-clean`, kind: 'clean', label: 'Print design', image: studioPrintImage(edition), approval: 'artist-approved' },
    ...(additionalStudioViews[edition.id] ?? []).filter(view => view.approval === 'artist-approved' && (!['framed','lifestyle'].includes(view.kind) || view.verifiedSizeIds?.includes(sizeId)))];
}
