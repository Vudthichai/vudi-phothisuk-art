import type { CSSProperties } from 'react';
import type { Artwork } from '../data';

type RoomDirection = { copy: string; setting: string; width?: number };
export const roomDirections: Record<string, RoomDirection> = {
  'the-oceans': { setting: 'a spacious coastal living room', width: 50, copy: 'The wide shoreline has room to unfold above a low ivory sofa. Pale oak, linen, and stone echo the painting’s sand and surf, while the broad composition sets the rhythm of the room.' },
  'summer-swells': { setting: 'an airy coastal entry hall', copy: 'Pale wood and woven textures pick up the warmth of the sand. Against a quiet wall, the turquoise water and sculpted surf bring a brighter note to the entrance.' },
  manta: { setting: 'a contemporary reading room', copy: 'Walnut and deep navy give the blues of Manta a quieter setting. The ray and its surrounding field of water become a point of focus beside a comfortable reading chair.' },
  'dark-scales': { setting: 'a charcoal and walnut study', copy: 'A charcoal wall and dark walnut give the metallic scales a restrained setting. Bronze and olive accents draw on the painting’s warmer passages without competing with its textured surface.' },
  'mermaid-tail': { setting: 'a luminous sitting area', copy: 'Ivory upholstery, pale brass, and a trace of blush sit alongside the painting’s iridescent greens and pinks. Soft light and rounded furnishings complement the repeated contours of the scales.' },
  'beach-day': { setting: 'a boho sitting room', copy: 'The painting’s blue water and warm sand sit alongside linen, woven textures, and pale wood in this boho room study.' },
  'arctic-waves': { setting: 'a cool coastal lounge', copy: 'Cool gray, dark oak, and a bronze accent echo the contrast between deep water and the metallic shore. The narrow white surf gives the composition a clear presence against the quiet wall.' },
  'water-s-edge': { setting: 'a relaxed coastal sitting room', copy: 'Rattan, honey-colored wood, and pale terracotta draw out the shoreline’s warmth. The blue water provides a cooler counterpoint within a relaxed arrangement of natural materials.' },
  'golden-sand-beach': { setting: 'a warm coastal dining nook', copy: 'Travertine, oak, and a small brass accent respond to the metallic shoreline. The turquoise water and raised white surf bring contrast to the warm stone setting.' },
  'sunset-waves': { setting: 'an evening lounge', copy: 'Rust upholstery and walnut connect with the warmth of the sky, while a muted plum-gray wall gives the darker water room to register. The painting gathers the room’s warm and cool colors into one focal point.' },
  'arctic-ocean': { setting: 'a contemporary architectural sitting room', copy: 'Blackened oak and gray stone echo the dark shoreline, with oatmeal wool softening the setting. The green water and white surf provide the room’s strongest contrast.' },
};

export function RoomStudy({ artwork }: { artwork: Artwork }) {
  const direction = roomDirections[artwork.slug ?? ''];
  if (!direction) return null;
  const width = direction.width ?? 22;
  const background = artwork.slug === 'beach-day' ? 'beach-day-boho' : `${artwork.slug}-room`;
  const placement = { '--room-art-width': `${width}%`, '--room-art-left': `${(100 - width) / 2}%` } as CSSProperties;
  return <section className="curated-room-study" aria-label={`${artwork.title}, at home.`} >
    <div className="room-study-copy"><p className="eyebrow">A different perspective</p><h2 id={`room-title-${artwork.id}`}>{artwork.title},<br/>at home.</h2><p>{direction.copy}</p><p className="room-study-note">Room study · illustrative scale</p></div>
    <div className="curated-room-scene" style={placement} role="img" aria-label={`Illustrative room study showing the actual ${artwork.title} photograph in ${direction.setting}`}>
      <img className="curated-room-background" src={`/atmosphere/rooms/${background}-1440.webp`} width="1536" height="1024" alt="" loading="lazy" decoding="async"/>
      <img className="curated-room-art" src={artwork.image.src} srcSet={artwork.image.srcSet} sizes={width === 50 ? '(max-width: 700px) 43vw, 28vw' : '(max-width: 700px) 20vw, 13vw'} width={artwork.image.width} height={artwork.image.height} alt="" loading="lazy" decoding="async"/>
    </div>
  </section>;
}
