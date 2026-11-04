import type { ArtworkExperience } from './model';
import type { FlowerSequence } from '../../botanical/bloom';
import { bark, foliage, mushroom } from '../forest/assets';
import placeholder from './artwork-experience-placeholder.svg';
const missingPhoto = { status: 'missing' as const, src: placeholder, width: 600, height: 900, alt: 'Temporary development placeholder. No photograph of this painting has been supplied.' };
const whiteFlower: FlowerSequence = {
  id: 'white-flower-awaiting-approval', species: 'White lily study', width: 400, height: 400, duration: 5,
  status: 'needs-assets', frames: [], reason: 'No approved continuous white-flower opening sequence.',
};
export const artworkExperiences: readonly ArtworkExperience[] = [
  {
    artworkId: 'mother-nature', title: 'Mother Nature', experienceTitle: 'The Forest Awakens',
    introduction: 'Private direction: a restrained botanical drift, then the complete painting. Optional foliage remains a prototype.',
    photograph: { status: 'available', src: '/artworks/forest/mother-nature-900.webp', width: 900, height: 1351, alt: 'Mother Nature, complete painting: a forest goddess beside a winding river, with sculpted leaves and flowers.' },
    detail: { src: '/artworks/forest/mother-nature-new-detail-900.webp', width: 900, height: 506, alt: 'Detail of Mother Nature with textured flowers and foliage.' },
    readiness: 'experimental', missing: ['Visual review of the new private composition before any public integration.'], revealAt: 1.5,
    steps: [
      { id: 'awakening-drift', family: 'fall', readiness: 'approved', at: .15, duration: 3.8, distance: '420px', note: 'Four existing production botanical cutouts.', particles: [
        { assetId: 'leaf-curled', delay: 0, duration: 3.3, left: '9%', drift: 24, displayWidth: 30 },
        { assetId: 'petal-carnation-pink', delay: .25, duration: 3.4, left: '88%', drift: -28, displayWidth: 24 },
        { assetId: 'leaf-green', delay: .45, duration: 3.2, left: '72%', drift: 30, displayWidth: 27 },
        { assetId: 'petal-cream', delay: .5, duration: 3.3, left: '16%', drift: -12, displayWidth: 23 },
      ] },
      { id: 'awakening-foliage', family: 'foliage', readiness: 'experimental', at: 0, duration: 4.2, pieces: foliage.map((piece, index) => ({ ...piece, x: [2, 83, 4][index], y: [7, 12, 70][index], size: 9 })), intensity: .5, note: 'Optional cutout foliage study; not production-approved.' },
    ],
  },
  {
    artworkId: 'ethereal-bloom', title: 'Ethereal Bloom', experienceTitle: 'Into the Light', readiness: 'asset-blocked', photograph: missingPhoto,
    introduction: 'Private direction: white petals open into changing light. No substitute bloom is played.',
    missing: ['Original Ethereal Bloom photograph.', 'Approved registered white-flower bud-to-open frames, clean alpha and final poster.', 'Review subtle lighting only after flower imagery is approved.'], revealAt: 5,
    steps: [{ id: 'ethereal-flower', family: 'flower', readiness: 'asset-blocked', at: 0, duration: 5, asset: whiteFlower, note: whiteFlower.status === 'needs-assets' ? whiteFlower.reason : '' }],
  },
  {
    artworkId: 'moss-and-mushrooms', title: 'Moss & Mushrooms', experienceTitle: 'Hidden Life', readiness: 'asset-blocked', photograph: missingPhoto,
    introduction: 'Private direction: moss, mushroom emergence and a bark reveal. Growth is blocked; the bark experiment is available only by explicit preview choice.',
    missing: ['Original Moss & Mushrooms photograph.', 'Coherent mushroom pin-to-mature sequence with stable moss and clean edges.', 'Visual approval of bark transition and composition.'], revealAt: 5,
    steps: [
      { id: 'hidden-life-growth', family: 'mushroom', readiness: 'asset-blocked', at: 0, duration: 5, asset: mushroom, note: 'Rejected mushroom storyboard is excluded from artwork experiences.' },
      { id: 'hidden-life-bark', family: 'bark', readiness: 'experimental', at: 0, duration: 4.5, asset: bark, note: 'Experimental bark reveals a labeled development placeholder, not the missing painting.' },
    ],
  },
  {
    artworkId: 'wild-tiger-lilies', title: 'Wild Tiger Lilies', experienceTitle: 'Unfolding Color', readiness: 'experimental', photograph: missingPhoto,
    introduction: 'Private direction: a few orange petals and a green leaf. No full lily bloom is attempted.',
    missing: ['Original Wild Tiger Lilies photograph.', 'Review the petal placement against the actual painting.'], revealAt: 1,
    steps: [{ id: 'tiger-petal-drift', family: 'fall', readiness: 'approved', at: 0, duration: 4.1, distance: '370px', note: 'Existing tiger-lily-inspired petals and one green leaf.', particles: [
      { assetId: 'petal-tiger-lily', delay: 0, duration: 3.2, left: '16%', drift: 27, displayWidth: 32 },
      { assetId: 'leaf-dark', delay: .45, duration: 3.5, left: '83%', drift: -22, displayWidth: 26 },
      { assetId: 'petal-tiger-lily', delay: .75, duration: 3.3, left: '72%', drift: 16, displayWidth: 27 },
    ] }],
  },
  {
    artworkId: '75-leaves', title: '75 Leaves', experienceTitle: 'A Quiet Tribute', readiness: 'experimental', photograph: missingPhoto,
    introduction: 'Private direction: two green leaves and one golden leaf, with no additional movement.',
    missing: ['Original 75 Leaves photograph.', 'Review the restrained composition against the actual painting.'], revealAt: 1.2,
    steps: [{ id: 'quiet-leaves', family: 'fall', readiness: 'approved', at: 0, duration: 4.5, distance: '340px', note: 'Three leaves only. One golden leaf is larger and arrives later.', particles: [
      { assetId: 'leaf-green', delay: 0, duration: 3.6, left: '12%', drift: 17, displayWidth: 25 },
      { assetId: 'leaf-dark', delay: .35, duration: 3.7, left: '86%', drift: -17, displayWidth: 24 },
      { assetId: 'leaf-gold', delay: .8, duration: 3.6, left: '74%', drift: -22, displayWidth: 34 },
    ] }],
  },
];
