# Botanical library — Phase 1

`registry.ts` is the single source for asset IDs, leaf/petal category, visual family,
color, Vite-resolved URL, natural dimensions, recommended CSS display width,
file bytes, and implemented behaviors (`fall` and `flutter`). Family descriptions
are generated visual references, not verified specimen identifications.

Images live in `src/assets/botanical/leaves/` and `petals/`. Only these categories
are populated. Future flowers, mushrooms, vines, and trees should get directories
when real assets exist; do not create placeholder images.

## Reuse

```tsx
import { BotanicalFall } from '../components/BotanicalFall';
import { selectBotanicalAssets } from '../botanical/registry';

// Default balanced preset: three leaves and two petals. Six is also balanced.
<BotanicalFall scene="menu" count={6} />

// The reveal preset preserves the existing delayed final-petal CSS placement.
<BotanicalFall key={transitionNumber} scene="reveal" />

// Select by metadata; override only the motion needed for this scene.
const redPetals = selectBotanicalAssets({ type: 'petal', color: 'deep-red' });
<BotanicalFall
  particles={redPetals.map(asset => ({
    assetId: asset.id, left: '75%', delay: .4, duration: 4,
    drift: -90, sway: 6, rotation: 35, scale: .9,
  }))}
  distance="320px"
/>
```

`count` defaults to five for presets, or the supplied custom particle count. It is
clamped to 0–12 and cycles the selection if more particles are requested. Extra
particles receive staggered delays. `duration` applies a scene-wide override;
particle `duration` takes precedence. Other particle overrides are `delay`,
`drift`, `sway`, `rotation`, `scale`, `left`, and `displayWidth`. Distances are CSS
lengths; seconds are numbers. Defaults remain deterministic for reproducibility.

The component memoizes its selections, uses CSS transforms/opacity rather than a
JavaScript animation loop, and unmounts the decorative layer after every outer
fall completes. A changed configuration restarts it; use a new React `key` to
replay identical settings. The menu's existing conditional mount stops the effect
immediately on dismissal. Motion is one-shot. Reduced-motion CSS disables it;
all elements are pointer-transparent and hidden from assistive technology.

Leaves turn around X/Y axes to briefly show narrower profiles. Petals use smaller
turns. Assets remain opaque during the middle of the flight; opacity only handles
entrance/exit. The two original Mother Nature photographs and their transition
are not part of the library and must not be altered by an effect.

## Add an asset

1. Obtain an authorized or generated photorealistic cutout. Check genuine alpha
   and edges on ivory and dark green; preserve its color and proportions.
2. Export a small alpha-WebP in the matching asset directory. Aim for 160–200px
   and roughly 4–14 KB at the current 30–45px display sizes. Check high-DPI use.
3. Add one registry entry with a unique ID, `new URL(..., import.meta.url).href`,
   dimensions measured from the exported file, display width, bytes, and supported
   behaviors. Vite handles URLs and may inline very small files.
4. Select the ID in a preset or custom particle list. Do not hardcode image URLs
   in scene components. Run tests/build and inspect mobile/reduced-motion modes.

The `ForestDecorations` adapter keeps existing consumers stable. Current users:
homepage mobile-menu opening, Forest & Flowers mobile-menu opening, and Mother
Nature forward/reverse transitions. No global ambient effect was introduced.

## Future behaviors

`bloom`, `grow`, `unfurl`, `wrap`, `sway`, `emerge`, and `textureReveal` are future
work, not implemented behavior claims. Extend `BotanicalBehavior` and add an
appropriately scoped component only when an experience actually requires it.
No physics engine or animation dependency is needed for Phase 1.

## Phase 2 — living flowers (architecture; imagery blocked)

`bloom.ts` defines a species-independent registered-frame contract. `FlowerBloom`
uses that contract alongside the existing botanical library; falling effects and
all their consumers remain untouched. Flower sequences have different requirements
from single falling cutouts, so they do not enter the leaf/petal registry.

No white-lily sequence is approved yet. The available still-image generator
produced a sixteen-state sheet, but petal geometry shifts and alpha contamination
make it unsuitable for continuous playback. No temporal video/rig tool was
available. `src/dev/flowers/white-lily-rejected.webp` is an AI-generated **rejected
review reference**, not botanical evidence or a finished animation. No external
photographs or licensed third-party material were downloaded.

### Local review

Run `npm run dev -- --host 127.0.0.1`, then open
`http://127.0.0.1:5173/dev/flower-bloom.html`. It shows the rejected study against
ivory and dark green. Replay intentionally stays disabled until real sequence
assets pass review. This HTML is not a production build entry, is not linked from
the site, and neither the preview nor its imagery is imported by public pages.
`npm run build` emits only the existing site. Do not configure a production build
input for the preview. There is no production preview route.

### Supply a credible sequence

Obtain or generate an authorized continuous timelapse or rendered flower rig with
a locked camera, consistent illumination, fixed stem anchor, six stable lily
tepals, natural independent unfolding/overlap, and a gentle settling endpoint.
Export densely sampled, registered transparent frames (start with 48–96 at
320–480px, then judge cadence and mobile memory). Inspect edges on both review
backgrounds; no halos, detached flecks or changing anatomy. Optimize alpha-WebP
frames and measure bytes/decoded memory on mobile before approval. Sparse,
unrelated generated states must not be crossfaded to disguise discontinuity.
Per-petal timing/depth is authored in the imagery, not faked in CSS.

Once reviewed, create a `FlowerSequence` with `status: 'approved'`, ordered frame
URLs, final `poster`, natural width/height, species/id and default duration.
Keep it in the dev-only dependency graph until public integration is separately
requested. The same player accepts future species without duplicating logic:

```tsx
<FlowerBloom asset={approvedSequence} duration={4} scale={.85}
  placement="center bottom" trigger="manual" replayKey={replayNumber}
  gentleMotion />
```

Scale is a static fit fraction (0.1–1), not a bloom animation. Placement uses CSS
object-position. Triggers are `manual`, `mount` or one-shot `visible`; change a
positive `replayKey` to replay. All frames decode before playback; errors leave
the fixed-ratio stage empty. A short rAF loop advances frames once then stops;
unmount/replay cancels it. Optional settling is a single 1px breath, not a loop.
Reduced motion uses the final poster and responds to preference changes live.
The decorative stage is pointer-transparent and hidden from assistive technology;
the surrounding experience must supply any meaningful botanical description.

Current limitations: no production-ready bloom, no real Safari/device review,
and no measured frame-sequence bandwidth/memory until coherent assets exist.

## Phase 3 — forest environments

See [FOREST.md](./FOREST.md) for the mushroom asset gate, path-based vine study,
finite foliage breeze, experimental ridge reveal, shared controls, asset-quality
limitations and local-only preview. These do not change the Phase 1/2 consumers.
