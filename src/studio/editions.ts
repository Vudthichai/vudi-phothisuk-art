import { forestCollection } from '../forest/collection';
import type { ForestImage } from '../forest/types';
import printPhotographs from './print-photographs.json';

/** Presentation only. No provider products, checkout URLs, stock promises or payment hooks. */
export const studioEditionTerms = {
  label: 'Studio Edition — Fine Art Print',
  priceCents: 4000,
  currency: 'USD',
  status: 'Coming Soon',
  description: 'Unsigned, open-edition reproduction',
} as const;
export type StudioEdition = {
  id: string;
  artworkId: string;
  contribution?: { percentOfProfit: number; beneficiary: string | null; status: 'pending-approval' };
};
export const studioEditions: readonly StudioEdition[] = [
  { id: 'studio-mother-nature', artworkId: 'mother-nature' },
  { id: 'studio-ethereal-bloom', artworkId: 'ethereal-bloom' },
  { id: 'studio-tiger-lily', artworkId: 'tiger-lily' },
  { id: 'studio-75-leaves', artworkId: '75-leaves', contribution: { percentOfProfit: 75, beneficiary: null, status: 'pending-approval' } },
  { id: 'studio-a-forest-forgotten', artworkId: 'a-forest-forgotten', contribution: { percentOfProfit: 20, beneficiary: 'Junglekeepers', status: 'pending-approval' } },
];
export const studioCollectionBundle = {
  id: 'studio-forest-and-flowers-collection',
  title: 'Forest & Flowers — Studio Edition Collection',
  editionIds: studioEditions.map(edition => edition.id),
  priceCents: 17500,
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
