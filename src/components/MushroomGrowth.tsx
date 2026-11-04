import type { GrowthSequence } from '../botanical/forest';
import { FlowerBloom } from './FlowerBloom';
/** Compatibility reuse: the Phase 2 renderer already plays registered growth states. */
export function MushroomGrowth(props: Omit<Parameters<typeof FlowerBloom>[0], 'asset'> & { asset: GrowthSequence }) {
  return <FlowerBloom {...props} />;
}
