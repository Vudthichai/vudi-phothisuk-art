import type { Artwork } from '../data';
/** Prices are shown only for originals explicitly marked available. */
export function OriginalPrice({ artwork }: { artwork: Artwork }) {
  if (artwork.availability !== 'available' || artwork.priceUsd === undefined) return null;
  return <p className="original-retail-price">{new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(artwork.priceUsd)}</p>;
}
