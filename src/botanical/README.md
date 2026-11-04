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
