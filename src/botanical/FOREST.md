# Phase 3 — living forest environments

This is a development library, not public integration. No new components are
imported by public routes. No artwork, content, navigation, inventory or existing
animation timing is changed. The Phase 2 dev HTML pattern is extended with
`dev/forest.html`; its review page links back to the existing flower preview.

## Review locally

1. Run `npm run dev -- --host 127.0.0.1`.
2. Open `http://127.0.0.1:5173/dev/forest.html` (also linked from the Phase 2 preview).
3. Use the separate replay buttons and duration/scale controls. Foliage also uses
   intensity. Mushroom storyboard replay is a diagnostic aid only: imagery still fails approval.
4. Replay the visible rejected mushroom storyboard, then expand the full sheet to assess continuity/edges on two backgrounds. Its asset-blocked status never changes.
5. Enable OS/browser reduced motion: foliage is still, vine fully shown, mushroom holds its final rejected state, bark
   removed to show the original artwork. There is no audio, autoplay or loop by
   default. Keyboard Enter/Space and touch activate standard native buttons.

This HTML is not a production build input. `npm run build` followed by
`node scripts/check-private-previews.mjs` verifies dev code/assets are absent.
Do not add preview URLs to production routing or publish the dev source directory.
A production SPA fallback may show its normal not-found page for `/dev/forest.html`;
it does not expose this review environment.

## Shared architecture

- `GrowthSequence` reuses the Phase 2 `FlowerSequence` contract. `MushroomGrowth`
  delegates to `FlowerBloom` unchanged; its historical CSS names are internal.
  Approved continuous frames are the growth, never a scaled finished mushroom.
  `needs-assets` scenes cannot play in the approved renderer. The separate dev-only
  `MushroomStoryboard` cycles rejected contact-sheet cells with stepped transforms
  for review; it neither passes these frames into that renderer nor approves them. The existing duration, scale, placement,
  trigger, replay and reduced-motion behavior therefore stays identical.
- New layered scenes share `ForestControls` and `useForestMotion`. The hook handles
  image decode, manual/mount/one-shot-visible triggers, finite playback, replay,
  cancellation, live reduced motion, failure containment and future optional
  `onCue('start'|'complete')` callbacks. It adds no sound or audio downloads.
  It does not change or take over Phase 1/2 playback.
- `VineGrowth` takes a photographic `VineAsset` with a registered normalized SVG
  centerline. A stroke-dash mask follows its nonuniform cubic curves, exposing
  nearby leaves progressively. Path/asset/origin are configuration, not component
  rewrites. Changing path direction changes the reveal origin. This is a mask
  prototype, not a photographed biological growth sequence or path-deformation rig.
- `PathVine` adds a freely configurable normalized SVG path, shaded illustrated
  stem and existing photographic `VineLeaf` cutouts. Leaf attachments follow the
  curve tangent and appear only after the advancing tip reaches their nonuniform
  positions. The meander/edge-wrap selector demonstrates reconfiguration without
  warping a photograph. It shares the same lifecycle and static placement helper.
- `ForestFoliage` takes cutouts and attachment origins. Small rotations have
  different amplitudes, keyframe times, durations and delays. A single irregular
  breeze envelope includes subtle Y-axis depth pivoting and returns to rest, with no synchronized repeating sine loop.
- `BarkReveal` accepts texture plus registered tonal masks and an unchanged artwork
  `{src,width,height}`. Matching texture/mask cover mapping preserves the ridges;
  artwork uses `contain` inside its original aspect ratio. Bands clear from
  crevices toward lighter ridges with staggered opacity, rather than a whole-image
  generic wipe/zoom/fade. This remains experimental.

For the layered scenes, `duration` is seconds (clamped 0.1–30), `replayKey` is a
positive changed number, `trigger` defaults to `manual`, `scale` is static fit
0.1–1, and `placement: {x,y}` anchors within the stage (0–100%). Intensity (0–2)
affects foliage bend only; it does not distort growth geometry or artwork.
Mushroom uses the Phase 2 CSS object-position placement string instead.

Frames and images decode before animation starts; an asset load failure produces
an empty reserved stage and no cues. Scale/placement never affect layout size.
Stages are clipped, pointer-transparent, hidden from assistive technology and
reserve their aspect ratio. Surrounding UI supplies meaningful descriptions.
Each stage is keyed by asset identity; masks use React-unique IDs. Unmount,
replay or reduced motion cancels every owned animation. Layered scenes use the
browser Web Animations API and no JS frame loop; the existing sequence player
only runs its rAF loop during an approved sequence.

## Quality and validation

Mushroom is **asset-blocked with replayable unapproved storyboard inspection**;
vine is an **experimental illustrated-stem/photographic-leaf growth prototype**
(with the earlier photographic mask available for comparison); foliage is an
**approved prototype for restrained cutout motion only**; bark remains an
**experimental ridge dissolve**. None is claimed as a finished immersive environment. Asset
provenance, bytes and missing imagery are in `../dev/forest/SOURCE.md`.

Tests cover approval gating, Phase 2 reuse, unique/path-configurable masks, idle
and visibility triggers, varied finite foliage motion, replay cleanup, cues,
unchanged artwork underlay, ridge delays, decode failure and live reduced motion.
Existing public tests and the production build must pass. Local Chromium review
covers 375/390px mobile and desktop widths, image loading, zero horizontal overflow,
keyboard/touch replay, zero layout shifts while animating and stopped final motion.
Real Safari/device review and performance of a real mushroom sequence are pending.
The production JS/CSS bundle hashes remain identical because none of this graph
is imported by public pages. New development imagery totals 530,664 bytes; foliage
reuses the existing registry.

## Before Phase 4

First obtain a continuous convincing mushroom sequence and approve its realism
and mobile memory/cadence. Then review vine edges and leaf development, branch
attachments, and bark transitions on real Safari. Only after that select painting
contexts, establish unobstructed safe zones, and request separate approval for
public assignment. No painting mapping or Phase 4 feature is implemented here.


The follow-up visual gallery adds no image bytes and keeps the same production
bundle hashes. Every study now displays an explicit quality status. All four have
visible scenes and replay, but mushroom replay is conspicuously watermarked as
unapproved storyboard inspection, not a claim of believable growth. Reduced motion
holds the final storyboard frame. No quality gate has been relaxed.
