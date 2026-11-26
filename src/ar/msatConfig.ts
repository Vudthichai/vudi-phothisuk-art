import type { ARExperience } from './config';

export const msatTagline = 'Make some art today.';
export const MSAT_ENTRANCE_SECONDS = 2;
export const msatExperience: ARExperience = {
  id: 'msat-signature',
  artworkId: 'msat-signature',
  title: 'MSAT — The Living Signature',
  certificateLabel: 'MSAT magnet',
  certificatePaths: [],
  targetImage: '/ar/targets/msat-magnet.jpg',
  targetFile: '/ar/targets/msat-magnet.mind',
  targetIndex: 0,
  targetAspect: 1,
  modelAsset: '/ar/models/msat-signature.glb',
  previewOnly: true,
};
