import type { ForestImage, ForestImageRole } from './types';
export const imageRoleLabel: Record<ForestImageRole, string> = { full:'Full composition',angle:'Angled view',detail:'Sculptural detail',texture:'Texture close-up',room:'Room-scale view' };
export function ForestPhotograph({ image, eager = false, sizes = '(max-width:700px) 90vw, 50vw' }: { image: ForestImage; eager?: boolean; sizes?: string }) {
  const main = image.variants[image.variants.length - 1];
  return <img src={main.src} srcSet={image.variants.map(v => `${v.src} ${v.width}w`).join(', ')} sizes={sizes} width={main.width} height={main.height} alt={image.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}
