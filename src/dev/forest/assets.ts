import type { BarkAsset, FoliagePiece, GrowthSequence, VineAsset, VineLeaf } from '../../botanical/forest';
import { getBotanicalAsset } from '../../botanical/registry';
export const mushroom: GrowthSequence = {
  id: 'woodland-mushroom', species: 'Generated woodland mushroom study; species unverified',
  width: 400, height: 400, duration: 6, status: 'needs-assets', frames: [],
  reason: 'The generated moss shifts, cap geometry jumps and alpha edges are contaminated. Supply registered continuous pin-to-mature frames before approving a growth sequence.',
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

export const vinePaths = {
  meander: 'M 15 93 C 40 82 63 84 56 65 C 48 52 21 51 34 34 C 43 22 66 25 79 9',
  wrap: 'M 14 91 C 9 75 18 65 12 48 C 7 28 13 13 32 12 C 51 8 63 17 85 12',
};
export const vineLeaves: readonly VineLeaf[] = [.13, .31, .52, .69, .88].map((at, index) => {
  const source = getBotanicalAsset(index % 2 ? 'leaf-dark' : 'leaf-green');
  return { id: `vine-leaf-${index}`, image: source.image, width: source.width, height: source.height,
    at, size: [7, 6, 8, 6.5, 5][index], angle: index % 2 ? 54 : -48 };
});
