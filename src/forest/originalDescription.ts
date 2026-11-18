import type { ForestArtwork } from './types';
import { studioContributions } from '../studio/contributions';

/** Original storytelling stays intact; the appended commitment concerns prints only. */
export function originalDescription(artwork: ForestArtwork) {
  const giving = studioContributions[artwork.id];
  if (!giving) return artwork.description;
  const note = giving.cause === 'veterans'
    ? `The ${artwork.title} Studio Print extends this tribute: ${giving.percentOfProfit}% of profits from its sales will support a veterans foundation, honoring those who served. The recipient organization will be announced.`
    : `The ${artwork.title} Studio Print continues this conservation story, with ${giving.percentOfProfit}% of profits from its sales donated to ${giving.beneficiary} in support of rainforest conservation.`;
  return artwork.description.map((paragraph,index) => index === Math.min(1, artwork.description.length - 1) ? `${paragraph} ${note}` : paragraph);
}
