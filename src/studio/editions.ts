import { forestCollection } from '../forest/collection';
import type { ForestImage } from '../forest/types';
import { studioContributions, type ContributionIntention } from './contributions';
import catalog from './print-catalog.json';
import printPhotographs from './print-photographs.json';

export type StudioSize = { id: string; width: number; height: number; label: string; priceCents: number };
export const studioSizes: readonly StudioSize[] = [
  { id: '9x12', width: 9, height: 12, label: '9 × 12 inches', priceCents: catalog.prices['9x12'] },
  { id: '12x16', width: 12, height: 16, label: '12 × 16 inches', priceCents: catalog.prices['12x16'] },
];

/** Presentation only. No provider products, checkout URLs, stock promises or payment hooks. */
export const studioEditionTerms = {
  label: 'Studio Edition — Fine Art Print',
  priceCents: studioSizes[0].priceCents,
  currency: 'USD',
  status: 'Coming Soon',
  description: 'Unsigned, open-edition reproduction',
} as const;
export type StudioEdition = {
  id: string;
  artworkId: string;
  contribution?: ContributionIntention;
};
export const studioEditions: readonly StudioEdition[] = [
  { id: 'studio-mother-nature', artworkId: 'mother-nature' },
  { id: 'studio-ethereal-bloom', artworkId: 'ethereal-bloom' },
  { id: 'studio-tiger-lily', artworkId: 'tiger-lily' },
  { id: 'studio-75-leaves', artworkId: '75-leaves', contribution: studioContributions['75-leaves'] },
  { id: 'studio-a-forest-forgotten', artworkId: 'a-forest-forgotten', contribution: studioContributions['a-forest-forgotten'] },
];
export const studioCollectionBundle = {
  id: 'studio-forest-and-flowers-collection',
  title: 'Forest & Flowers — Studio Edition Collection',
  editionIds: studioEditions.map(edition => edition.id),
  // Approved gallery-wall photography can be supplied later; null renders nothing.
  galleryWallImage: null as ForestImage | null,
  options: studioSizes.map(size => {
    const priceCents = size.id === '9x12' ? 17500 : 42500;
    const retailValueCents = size.priceCents * studioEditions.length;
    return {
      id: `forest-collection-${size.id}`, sizeId: size.id, sizeLabel: size.label,
      priceCents, retailValueCents, savingsCents: Math.max(0, retailValueCents - priceCents),
      status: 'Coming Soon',
      revenueAllocation: {
        basis: 'relative-standalone-retail' as const,
        denominatorCents: retailValueCents,
        lines: studioEditions.map(edition => ({ editionId: edition.id, artworkId: edition.artworkId,
          quantity: 1, weightCents: size.priceCents, contribution: edition.contribution ?? null })),
      },
      profitCalculation: { status: 'blocked-pending-confirmed-expenses' as const,
        requiredInputs: ['productionCosts', 'paymentFees', 'fulfillmentExpenses'] as const },
    };
  }),
  status: 'Coming Soon',
} as const;
export function studioArtwork(edition: StudioEdition) {
  const artwork = forestCollection.artworks.find(art => art.id === edition.artworkId);
  if (!artwork) throw new Error(`Missing Studio Edition source artwork: ${edition.artworkId}`);
  return artwork;
}
export function studioEditionFor(artworkId: string) { return studioEditions.find(edition => edition.artworkId === artworkId); }
export function studioPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: studioEditionTerms.currency, minimumFractionDigits: 0 }).format(cents / 100);
}

/** Artist-supplied print designs only; never fall back to original painting photos. */
export function studioPrintImage(edition: StudioEdition): ForestImage {
  const photograph = printPhotographs[edition.artworkId as keyof typeof printPhotographs];
  if (!photograph) throw new Error(`Missing approved Studio print photograph: ${edition.artworkId}`);
  return { ...photograph, role: 'full' };
}

export const studioBase = '/studio-editions';
export const studioProductPath = (edition: StudioEdition) => `${studioBase}/${edition.artworkId}/`;
