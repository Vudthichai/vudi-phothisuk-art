import type { Artwork } from '../data';
/** Prices are shown only for originals explicitly marked available or Forest originals with provisional availability. */
export function OriginalPrice({ artwork, className = 'original-retail-price' }: { artwork: Pick<Artwork, 'priceUsd' | 'availability'>; className?: string }) {
  if (!['available', 'provisional'].includes(artwork.availability ?? '') || artwork.priceUsd === undefined) return null;
  return <p className={className}>{new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(artwork.priceUsd)}</p>;
}
