import type { CSSProperties } from 'react';
import type { Artwork } from '../data';

type RoomDirection = { copy: string; setting: string; roomBrightness?: number; relit?: boolean };
export const roomDirections: Record<string, RoomDirection> = {
  'the-oceans': { setting: 'a spacious coastal living room', copy: 'The wide shoreline has room to unfold above a low ivory sofa. Pale oak, linen, and stone echo the painting’s sand and surf, while the broad composition sets the rhythm of the room.' },
  'summer-swells': { setting: 'an airy coastal entry hall', copy: 'Pale wood and woven textures pick up the warmth of the sand. Against a quiet wall, the turquoise water and sculpted surf bring a brighter note to the entrance.' },
  manta: { setting: 'a contemporary reading room', copy: 'Walnut and deep navy give the blues of Manta a quieter setting. The ray and its surrounding field of water become a point of focus beside a comfortable reading chair.' },
  'dark-scales': { relit: true, setting: 'a charcoal and walnut study', copy: 'A charcoal wall and dark walnut give the metallic scales a restrained setting. Bronze and olive accents draw on the painting’s warmer passages without competing with its textured surface. A dedicated picture light gives the silvery passages a source of illumination.' },
  'mermaid-tail': { relit: true, setting: 'a luminous sitting area', copy: 'Ivory upholstery, pale brass, and a trace of blush sit alongside the painting’s iridescent greens and pinks. Soft light and rounded furnishings complement the repeated contours of the scales.' },
  'beach-day': { setting: 'a boho sitting room', copy: 'The painting’s blue water and warm sand sit alongside linen, woven textures, and pale wood in this boho room study.' },
  'arctic-waves': { relit: true, setting: 'a cool coastal lounge', copy: 'Cool gray, dark oak, and a bronze accent echo the contrast between deep water and the metallic shore. The narrow white surf gives the composition a clear presence against the quiet wall.' },
  'water-s-edge': { setting: 'a relaxed coastal sitting room', copy: 'Rattan, honey-colored wood, and pale terracotta draw out the shoreline’s warmth. The blue water provides a cooler counterpoint within a relaxed arrangement of natural materials.' },
  'golden-sand-beach': { setting: 'a warm coastal dining nook', copy: 'Travertine, oak, and a small brass accent respond to the metallic shoreline. The turquoise water and raised white surf bring contrast to the warm stone setting.' },
  'sunset-waves': { relit: true, setting: 'an evening lounge', copy: 'Rust upholstery and walnut connect with the warmth of the sky, while a muted plum-gray wall gives the darker water room to register. A picture light illuminates the painting above the quieter evening setting, bringing its warm sky and cool water into focus.' },
  'arctic-ocean': { relit: true, setting: 'a contemporary architectural sitting room', copy: 'Blackened oak and gray stone echo the dark shoreline, with oatmeal wool softening the setting. The green water and white surf provide the room’s strongest contrast.' },
};

// Room images have no measured real-world geometry. Use an explicit model wall
// reference rather than claiming that generated furniture has verified dimensions.
export const modelWallWidthInches = 144;
export function roomPlacement(artwork: Artwork) {
  const dimensions = artwork.dimensions?.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (!dimensions || dimensions.length !== 2 || dimensions.some(value => value <= 0)) return null;
  const [short, long] = [...dimensions].sort((a, b) => a - b);
  const widthInches = artwork.image.width > artwork.image.height ? long : short;
  const widthPercent = widthInches / modelWallWidthInches * 100;
  // All generated backgrounds are 3:2. Preserve the photo's own aspect ratio.
  const imageHeightPercent = widthPercent * (artwork.image.height / artwork.image.width) * 1.5;
  return { widthInches, widthPercent, leftPercent: (100 - widthPercent) / 2, topPercent: 34 - imageHeightPercent / 2 };
}

export function RoomStudy({ artwork }: { artwork: Artwork }) {
  const direction = roomDirections[artwork.slug ?? ''];
  const measured = roomPlacement(artwork);
  if (!direction || !measured) return null;
  const background = artwork.slug === 'beach-day' ? 'beach-day-boho' : `${artwork.slug}-room${direction.relit ? '-relit' : ''}`;
  const placement = {
    '--room-art-width': `${measured.widthPercent}%`,
    '--room-art-left': `${measured.leftPercent}%`,
    '--room-art-top': `${measured.topPercent}%`,
    '--room-brightness': direction.relit ? 1 : direction.roomBrightness ?? 1.03,
  } as CSSProperties;
  return <section className="curated-room-study" aria-label={`${artwork.title}, at home.`}>
    <div className="room-study-copy"><p className="eyebrow">A different perspective</p><h2 id={`room-title-${artwork.id}`}>{artwork.title},<br/>at home.</h2><p>{direction.copy}</p><p className="room-study-note">{artwork.dimensions} · modeled 12 ft wall</p><p className="room-study-note">Room study · illustrative scale</p></div>
    <div className={`curated-room-scene${direction.relit ? ' room-lighting-integrated' : ''}`} style={placement} role="img" aria-label={`Illustrative room study showing the actual ${artwork.title} photograph in ${direction.setting}; painting dimensions ${artwork.dimensions}, modeled wall width 12 feet`}>
      <img className="curated-room-background" src={`/atmosphere/rooms/${background}-1440.webp`} width="1536" height="1024" alt="" loading="lazy" decoding="async"/>
      <img className="curated-room-art" src={artwork.image.src} srcSet={artwork.image.srcSet} sizes={measured.widthPercent >= 40 ? '(max-width: 700px) 43vw, 28vw' : '(max-width: 700px) 15vw, 10vw'} width={artwork.image.width} height={artwork.image.height} alt="" loading="lazy" decoding="async"/>
    </div>
  </section>;
}
