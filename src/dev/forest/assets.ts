import type { BarkAsset, FoliagePiece, GrowthSequence, VineAsset } from '../../botanical/forest';
import { getBotanicalAsset } from '../../botanical/registry';
export const mushroom: GrowthSequence = {
  id: 'woodland-mushroom', species: 'Generated woodland mushroom study; species unverified',
  width: 400, height: 400, duration: 6, status: 'needs-assets', frames: [],
  reason: 'The generated moss shifts, cap geometry jumps and alpha edges are contaminated. Supply registered continuous pin-to-mature frames before enabling playback.',
};
export const vine: VineAsset = {
  id: 'woodland-vine-study', image: new URL('./vine-study.webp', import.meta.url).href,
  width: 640, height: 640,
  path: 'M 15 93 C 23 81 38 81 52 74 C 60 70 59 63 53 59 C 43 53 31 50 35 43 C 36 36 46 34 55 29 C 65 24 70 17 78 8',
  revealWidth: 23,
};
export const foliage: readonly FoliagePiece[] = ['leaf-green', 'leaf-dark', 'leaf-curled'].map((id, index) => {
  const asset = getBotanicalAsset(id as 'leaf-green' | 'leaf-dark' | 'leaf-curled');
  return { id, image: asset.image, width: asset.width, height: asset.height, x: [8, 60, 31][index], y: [17, 9, 57][index], size: [17, 20, 14][index], angle: [-28, 24, -15][index] };
});
export const bark: BarkAsset = {
  id: 'oak-inspired-study', image: new URL('./bark-study.webp', import.meta.url).href,
  ridgeMasks: [
    new URL('./bark-ridges-0.png', import.meta.url).href,
    new URL('./bark-ridges-1.png', import.meta.url).href,
    new URL('./bark-ridges-2.png', import.meta.url).href,
    new URL('./bark-ridges-3.png', import.meta.url).href,
    new URL('./bark-ridges-4.png', import.meta.url).href,
    new URL('./bark-ridges-5.png', import.meta.url).href,
  ],
};
