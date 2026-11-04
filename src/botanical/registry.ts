export type BotanicalType = 'leaf' | 'petal';
export type BotanicalColor = 'green' | 'dark-green' | 'gold' | 'burnt-orange' | 'deep-red' | 'pink' | 'pale-pink' | 'peach' | 'orange' | 'cream';
export type BotanicalBehavior = 'fall' | 'flutter';
export type BotanicalAsset = {
  id: string;
  type: BotanicalType;
  family: string;
  color: BotanicalColor;
  image: string;
  width: number;
  height: number;
  displayWidth: number;
  bytes: number;
  behaviors: readonly BotanicalBehavior[];
};

// Generated visual references, not taxonomically verified botanical photographs.
export const botanicalAssets = [
  { id: 'leaf-curled', type: 'leaf', family: 'Unverified woodland broadleaf', color: 'green', image: new URL('../assets/botanical/leaves/leaf-curled.webp', import.meta.url).href, width: 92, height: 168, displayWidth: 36, bytes: 4006, behaviors: ['fall', 'flutter'] },
  { id: 'leaf-dark', type: 'leaf', family: 'Unverified woodland broadleaf', color: 'dark-green', image: new URL('../assets/botanical/leaves/leaf-dark.webp', import.meta.url).href, width: 195, height: 200, displayWidth: 36, bytes: 12370, behaviors: ['fall', 'flutter'] },
  { id: 'leaf-gold', type: 'leaf', family: 'Unverified woodland broadleaf', color: 'gold', image: new URL('../assets/botanical/leaves/leaf-gold.webp', import.meta.url).href, width: 190, height: 200, displayWidth: 36, bytes: 13044, behaviors: ['fall', 'flutter'] },
  { id: 'leaf-green', type: 'leaf', family: 'Unverified woodland broadleaf', color: 'green', image: new URL('../assets/botanical/leaves/leaf-green.webp', import.meta.url).href, width: 127, height: 168, displayWidth: 36, bytes: 5712, behaviors: ['fall', 'flutter'] },
  { id: 'leaf-orange', type: 'leaf', family: 'Unverified woodland broadleaf', color: 'burnt-orange', image: new URL('../assets/botanical/leaves/leaf-orange.webp', import.meta.url).href, width: 187, height: 200, displayWidth: 36, bytes: 11070, behaviors: ['fall', 'flutter'] },
  { id: 'leaf-red', type: 'leaf', family: 'Unverified woodland broadleaf', color: 'deep-red', image: new URL('../assets/botanical/leaves/leaf-red.webp', import.meta.url).href, width: 190, height: 200, displayWidth: 36, bytes: 11086, behaviors: ['fall', 'flutter'] },
  { id: 'petal-carnation-peach', type: 'petal', family: 'Caryophyllaceae (carnation-inspired)', color: 'peach', image: new URL('../assets/botanical/petals/petal-carnation-peach.webp', import.meta.url).href, width: 200, height: 186, displayWidth: 32, bytes: 8338, behaviors: ['fall', 'flutter'] },
  { id: 'petal-carnation-pink', type: 'petal', family: 'Caryophyllaceae (carnation-inspired)', color: 'pale-pink', image: new URL('../assets/botanical/petals/petal-carnation-pink.webp', import.meta.url).href, width: 200, height: 185, displayWidth: 32, bytes: 8228, behaviors: ['fall', 'flutter'] },
  { id: 'petal-cream', type: 'petal', family: 'Unspecified flower petal', color: 'cream', image: new URL('../assets/botanical/petals/petal-cream.webp', import.meta.url).href, width: 200, height: 173, displayWidth: 32, bytes: 6714, behaviors: ['fall', 'flutter'] },
  { id: 'petal-rose-pink', type: 'petal', family: 'Rosaceae (rose-inspired)', color: 'pink', image: new URL('../assets/botanical/petals/petal-rose-pink.webp', import.meta.url).href, width: 168, height: 133, displayWidth: 32, bytes: 5322, behaviors: ['fall', 'flutter'] },
  { id: 'petal-rose-red', type: 'petal', family: 'Rosaceae (rose-inspired)', color: 'deep-red', image: new URL('../assets/botanical/petals/petal-rose-red.webp', import.meta.url).href, width: 189, height: 200, displayWidth: 32, bytes: 6484, behaviors: ['fall', 'flutter'] },
  { id: 'petal-tiger-lily', type: 'petal', family: 'Liliaceae (tiger lily-inspired)', color: 'orange', image: new URL('../assets/botanical/petals/petal-tiger-lily.webp', import.meta.url).href, width: 200, height: 123, displayWidth: 32, bytes: 6168, behaviors: ['fall', 'flutter'] },
] as const satisfies readonly BotanicalAsset[];

export type BotanicalAssetId = typeof botanicalAssets[number]['id'];
export function getBotanicalAsset(id: BotanicalAssetId) {
  const asset = botanicalAssets.find(asset => asset.id === id);
  if (!asset) throw new Error(`Unknown botanical asset: ${id}`);
  return asset;
}
export function selectBotanicalAssets(filter: { type?: BotanicalType; color?: BotanicalColor } = {}) {
  return botanicalAssets.filter(asset => (!filter.type || asset.type === filter.type) && (!filter.color || asset.color === filter.color));
}
