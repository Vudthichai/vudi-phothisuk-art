import oceans from './oceans.json';
import regal from './regal.json';
export type ArtworkImage = {
  src: string; alt: string; width: number; height: number; srcSet?: string; sizes?: string;
  role?: string; sourceFile?: string; caption?: string;
};
export type Artwork = {
  id: string;
  slug?: string;
  title: string;
  image: ArtworkImage;
  images?: ArtworkImage[];
  description?: string[];
  dimensions?: string;
  medium?: string;
  availability?: string;
  sourceUrl?: string;
};
export type Collection = { slug: string; name: string; summary: string; artworks: Artwork[] };
export const collections: Collection[] = [
  { slug: 'forest-and-flowers', name: 'Forest & Flowers', summary: 'The first collection being prepared for this new portfolio.', artworks: [] },
  { slug: 'oceans', name: 'The Oceans', summary: oceans.introduction, artworks: oceans.artworks },
  { slug: 'regal-collection', name: 'The Regal Collection', summary: regal.introduction, artworks: regal.artworks },
  { slug: 'canvas-collaborations', name: 'Canvas Collaborations', summary: 'Collection presentation in preparation.', artworks: [] },
];
export const informationPages = {
  'available-art': { title: 'Available Art', description: 'Artwork listings will be added after availability is confirmed.' },
  about: { title: 'About the Artist', description: 'Vudi Phothisuk is a multimedia artist specializing in textured paintings and sensory experiences.' },
  exhibitions: { title: 'Exhibitions', description: 'Exhibition information will be added when confirmed.' },
  contact: { title: 'Commissions & Contact', description: 'Commission information and verified contact details will be added here.' },
};
export function findCollection(slug: string) { return collections.find(collection => collection.slug === slug); }
