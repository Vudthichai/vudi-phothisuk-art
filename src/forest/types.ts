export type ForestImage = { id: string; alt: string; role: string; variants: { key: string; src: string; width: number; height: number }[] };
export type ForestArtwork = { id: string; slug: string; title: string; dimensions: string | null; medium: string | null; description: string[]; copyStatus: string; availability: 'provisional' | 'not-for-sale'; availabilityNote: string; images: ForestImage[] };
export type ForestCollectionData = { title: string; introduction: string[]; artworks: ForestArtwork[] };
