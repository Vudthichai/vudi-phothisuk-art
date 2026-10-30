import { useState, type CSSProperties, type SyntheticEvent } from 'react';
import type { Artwork } from '../data';

type RoomDirection = {
  copy: string; setting: string; background?: string;
  centerX?: number; centerY?: number; wallWidthInches?: number;
  lightFrom?: 'left' | 'right'; exposure?: number; shade?: number;
};
export const roomDirections: Record<string, RoomDirection> = {
  'carnations': { background: 'carnations-room-bright', centerY: 32, lightFrom: 'left', shade: 0, setting: 'a contemporary sitting room', copy: 'Pale blush plaster, oak, and ivory upholstery give Carnations a quiet setting. A deep green cushion and blush ceramics pick up its colors, with soft daylight from the left.' },
  'navy': { background: 'navy-room-bright', centerY: 32, lightFrom: 'left', shade: 0, setting: 'a contemporary study', copy: 'Walnut, bronze, and a deep blue reading chair surround Navy with warm, restrained materials. Broad daylight from the left lets its sculpted surface remain the focal point.' },
  'sahara': { background: 'sahara-room-bright', centerY: 30, lightFrom: 'right', shade: 0, setting: 'a warm architectural dining corner', copy: 'Travertine, pale oak, and dark ceramics echo Sahara’s ivory, gold, and charcoal. Soft daylight from the right brings the layered surface into a calm dining corner.' },
  'verdant': { background: 'verdant-room-bright', centerY: 32, lightFrom: 'left', shade: 0, setting: 'a garden sitting room', copy: 'Moss green upholstery, dark oak, and gold accents give Verdant a layered garden setting. Daylight from the left falls softly across the warm stone wall.' },
  'ciaran': { background: 'ciaran-room-bright', centerY: 32, lightFrom: 'right', shade: 0, setting: 'a welcoming entry', copy: 'Pale cream plaster and walnut give Ciaran a welcoming entry setting. Burgundy ceramics and cream upholstery echo its rich colors, with soft daylight from the right.' },

  'the-oceans': { background: 'the-oceans-room-v3', wallWidthInches: 96 / .88, centerX: 50, centerY: 35, shade: .09, setting: 'a spacious coastal living room', copy: 'The wide shoreline anchors the seating area above an ivory linen sofa. Pale oak, linen, and stone leave room for its broad bands of sand and surf. Daylight from the left connects the textured canvas with the room’s softer surfaces.' },
  'summer-swells': { exposure: 1.1, shade: .06, setting: 'an airy coastal entry hall', copy: 'Pale wood and woven textures pick up the warmth of the sand. Against a quiet wall, the turquoise water and sculpted surf bring a brighter note to the entrance.' },
  manta: { shade: .09, setting: 'a contemporary reading room', copy: 'Walnut and deep navy give the blues of Manta a quieter setting. The ray and its surrounding field of water become a point of focus beside a comfortable reading chair.' },
  'dark-scales': { background: 'dark-scales-luxury-ocean-v3', wallWidthInches: 24 / .1125, centerX: 46, centerY: 35, shade: .16, setting: 'a luxury oceanfront salon', copy: 'Petrol-blue velvet, charcoal oak, and silver-gray stone give Dark Scales a deeper ocean setting. A sculptural nickel lamp and loose green branches balance the painting above the rippled console, while daylight from the left catches the room’s silvery surfaces.' },
  'mermaid-tail': { background: 'mermaid-tail-luxury-ocean-v2', wallWidthInches: 24 / .1125, centerX: 41.5, centerY: 33, lightFrom: 'right', shade: .025, setting: 'a pearlescent oceanfront sitting room', copy: 'Sea-glass plaster, pale limestone, and ivory upholstery give Mermaid Tail a luminous ocean setting. The painting and an iridescent vase form an off-center grouping, with blush glass, flowing curves, and soft daylight echoing its shifting colors.' },
  'beach-day': { wallWidthInches: 96 / .66, background: 'beach-day-room-v7', centerX: 50, centerY: 32, lightFrom: 'left', shade: .035, setting: 'a coastal entry', copy: 'Pale oak, woven textures, and warm white plaster give Beach Day an airy coastal setting. Broad daylight from the left brings the bright water and sculpted surf into a room of soft natural surfaces.' },
  'arctic-waves': { background: 'arctic-waves-room-v7', centerX: 50, centerY: 32, lightFrom: 'right', shade: .11, setting: 'a sea-glass coastal study', copy: 'Sea-glass walls, weathered oak, and woven seating give Arctic Waves a coastal study setting. Soft daylight from the right falls across the quiet wall, while books, baskets, and a bronze accent echo the painting’s natural textures.' },
  'water-s-edge': { background: 'water-s-edge-room-v4', centerX: 51.5, centerY: 33.5, lightFrom: 'right', shade: .055, setting: 'a relaxed coastal sitting room', copy: 'Rattan, honey-colored wood, and pale terracotta draw out the shoreline’s warmth. The blue water provides a cooler counterpoint above the breakfast table, with a straight-on view and soft daylight from the right.' },
  'golden-sand-beach': { background: 'golden-sand-beach-room-v7', shade: .025, setting: 'a warm coastal dining nook', copy: 'Travertine, oak, and a small brass accent respond to the metallic shoreline. Soft, diffuse window light keeps the setting calm and even, allowing the turquoise water and raised white surf to bring their own contrast.' },
  'sunset-waves': { wallWidthInches: 84 / .67, background: 'sunset-waves-room-v7', centerX: 53, centerY: 30, shade: .06, setting: 'an intimate coastal entry', copy: 'A narrow oak console, coral chair, and cobalt ceramics give Sunset Waves an intimate coastal setting. Soft daylight and pale cream walls leave room for its vivid sky, while the woven materials sit alongside the sculpted blue water.' },
  'arctic-ocean': { background: 'arctic-ocean-room-relit', shade: .12, setting: 'a contemporary architectural sitting room', copy: 'Blackened oak and gray stone echo the dark shoreline, with oatmeal wool softening the setting. Daylight enters beside the left pillar and falls across the canvas, with a quieter shadow along its right edge.' },
};

// Geometry is an explicit illustrative model, not a measured generated room.
export const modelWallWidthInches = 144;
export function roomPlacement(artwork: Artwork, room: Pick<RoomDirection, 'wallWidthInches' | 'centerX' | 'centerY'> = {}) {
  const dimensions = artwork.dimensions?.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (!dimensions || dimensions.length !== 2 || dimensions.some(value => value <= 0)) return null;
  const [short, long] = [...dimensions].sort((a, b) => a - b);
  const widthInches = artwork.image.width > artwork.image.height ? long : short;
  const widthPercent = widthInches / (room.wallWidthInches ?? modelWallWidthInches) * 100;
  const imageHeightPercent = widthPercent * (artwork.image.height / artwork.image.width) * 1.5;
  return { widthInches, widthPercent, leftPercent: (room.centerX ?? 50) - widthPercent / 2, topPercent: (room.centerY ?? 34) - imageHeightPercent / 2 };
}

export function RoomStudy({ artwork }: { artwork: Artwork }) {
  const [sceneFailed, setSceneFailed] = useState(false);
  const [sceneAttempt, setSceneAttempt] = useState(0);
  function retryImage(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    image.style.visibility = 'hidden';
    if (image.dataset.retried) { setSceneFailed(true); return; }
    image.dataset.retried = 'true';
    image.removeAttribute('srcset');
    image.src = `${image.src.split('?')[0]}?room-retry=1`;
  }
  function showImage(event: SyntheticEvent<HTMLImageElement>) {
    event.currentTarget.style.visibility = '';
  }
  const direction = roomDirections[artwork.slug ?? ''];
  const measured = roomPlacement(artwork, direction);
  if (!direction || !measured) return null;
  const background = direction.background ?? (artwork.slug === 'beach-day' ? 'beach-day-boho' : `${artwork.slug}-room`);
  const fromRight = direction.lightFrom === 'right';
  const placement = {
    '--room-art-width': `${measured.widthPercent}%`,
    '--room-art-left': `${measured.leftPercent}%`,
    '--room-art-top': `${measured.topPercent}%`,
    '--room-art-exposure': direction.exposure ?? 1,
    '--room-art-shade': direction.shade ?? .09,
    '--room-light-angle': fromRight ? '250deg' : '110deg',
    '--room-shadow-x': fromRight ? '-.22cqw' : '.22cqw',
  } as CSSProperties;
  return <section className="curated-room-study" aria-label={`${artwork.title}, at home.`}>
    <div className="room-study-copy"><p className="eyebrow">A different perspective</p><h2 id={`room-title-${artwork.id}`}>{artwork.title},<br/>at home.</h2><p>{direction.copy}</p><p className="room-study-note">{artwork.dimensions}</p><p className="room-study-note">Room study · illustrative scale</p></div>
    <div className="curated-room-scene room-lighting-integrated" style={placement} role={sceneFailed ? undefined : "img"} aria-label={`Illustrative room study showing ${artwork.title} in ${direction.setting}; painting dimensions ${artwork.dimensions}.`}>
      {sceneFailed ? <div className="room-study-unavailable"><p role="status">The room image couldn’t load.</p><button type="button" onClick={() => { setSceneFailed(false); setSceneAttempt(value => value + 1); }}>Reload room image</button></div> : <div key={sceneAttempt}>
      <img onError={retryImage} onLoad={showImage} className="curated-room-background" src={`/atmosphere/rooms/${background}-1440.webp`} width="1440" height="960" alt="" loading="lazy" decoding="async"/>
      <div className="room-canvas">
        <img onError={retryImage} onLoad={showImage} className="curated-room-art" src={artwork.image.src} srcSet={artwork.image.srcSet} sizes={measured.widthPercent >= 40 ? '(max-width: 700px) 55vw, 40vw' : '(max-width: 700px) 15vw, 10vw'} width={artwork.image.width} height={artwork.image.height} alt="" loading="lazy" decoding="async"/>
      </div>
      </div>}
    </div>
  </section>;
}
