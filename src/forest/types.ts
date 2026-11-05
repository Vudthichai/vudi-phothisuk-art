export type ForestImageRole = 'full' | 'angle' | 'detail' | 'texture' | 'room';
export type ForestImage = { id: string; alt: string; role: ForestImageRole; caption?: string; temporary?: boolean; variants: { key: string; src: string; width: number; height: number }[] };
export type ForestArtwork = { id: string; slug: string; title: string; dimensions: string | null; medium: string | null; description: string[]; copyStatus: string; availability: 'provisional' | 'not-for-sale'; availabilityNote: string; galleryImageId?: string; images: ForestImage[] };
export type ForestCollectionData = { title: string; introduction: string[]; artworks: ForestArtwork[] };
export function primaryForestImage(artwork: ForestArtwork) { return artwork.images.find(image => image.id === artwork.galleryImageId) ?? artwork.images.find(image => image.role === 'full') ?? artwork.images[0]; }
