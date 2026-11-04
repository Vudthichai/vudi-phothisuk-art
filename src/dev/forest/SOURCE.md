# Phase 3 asset review — November 4, 2026

All three new image studies were generated with the available OpenAI image tool
for this project. No third-party photographs, paid services or downloaded stock
were used. These are generated visual references, not verified specimens. They
are local review material only. No new illustration is presented as artist work.

| File | Dimensions | Bytes | Quality/status |
| --- | --- | ---: | --- |
| mushroom-rejected.webp | 960px-wide contact sheet | 268,820 | Rejected: shifting moss/anchor, discontinuous cap and contaminated alpha. Never fed to player. |
| vine-study.webp | 640 × 640 | 31,604 | Photographic path-reveal prototype; edges need cleanup, no new-leaf unfurling. |
| bark-study.webp | 640 × 640 | 185,212 | Generated oak-inspired texture, experiment only. |
| bark-ridges-0.png … -5.png | 384 × 384 each | 45,028 total | Registered complementary tonal masks, technically derived from the bark study. |

WebP copies preserve original canvas proportions (ImageMagick resize, quality
85 for mushroom/bark, 88 for vine). Source generator PNGs remain unchanged in
`/workspace/generated_images` in the development workspace; they are not runtime
assets. The mushroom sheet is displayed only as a labeled static rejection study.

The bark masks partition a grayscale 384px copy of the original generated bark,
softened by a 1.4px Gaussian before classifying ridges. For luminance `v`, band is
`min(5, floor(clamp((v - 24) / 190 * 5, 0, 5)))`. Each pixel belongs to exactly one
opaque white band; all other bands have alpha zero. Complementarity keeps the
starting texture opaque rather than blending overlapping semitransparent layers.
The component uses matching center/cover mapping for texture and masks so ridges
stay registered at different scene aspect ratios. Only mask-band opacity changes;
the artwork beneath is a separate, unchanged, proportion-preserving image.

## Required before imagery approval

- Mushroom: continuous registered growth from pin through stem extension and cap
  opening; identical moss, fixed camera/light, no topology jumps. Start with 48–96
  transparent frames at 320–480px; inspect all transitions and alpha against ivory
  and dark green. Include final poster, decoded-memory/transfer measurements and
  end settling in the imagery. The still generator does not guarantee temporal
  consistency; a real authorized timelapse or controlled 3D rig may be needed.
- Vine: refine alpha edges and independently unfolding leaf states for biological
  growth. The mask demo only reveals a finished photographic asset progressively;
  it must not be advertised as anatomical growth. A new path requires a matching
  registered vine image, not warping this photograph to arbitrary geometry.
- Foliage: existing Phase 1 assets are reused, not duplicated. For attached branches,
  supply coherent branch layers and attachment points; current separate leaves
  are a motion study, not a whole forest or branch simulation.
- Bark: review tonal sequencing and edge detail on a real device. Luminance bands
  follow surface structure but are not a physical peeling or changing-light model.
