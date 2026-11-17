# Mother Nature exact photograph — Phase 1 only

> The artist subsequently approved the full five-image set for site integration.
> See [the current integration](exact-gallery-site-integration.md); this is the
> earlier Mother Nature-only phase record.

The artist supplied `Mother Nature Gallery Still Life.png.zip`. Its single PNG
is the exact approved still-life photograph, 1122 × 1402 RGB. Source SHA256:
`4715d3d84251d59a936fe11a78442248f70fbc722c46b94eca1d4ab50fc2b215`.

The original PNG is preserved byte-for-byte under
`public/studio-editions/approved/mother-nature-gallery-still-life.png`.
Delivery uses lossless WebP at widths 480, 768 and native 1122. There is no crop,
retouching, relighting, recoloring, AI generation, frame replacement, room design
or new compositing. Full-size decoded WebP pixels equal the PNG exactly. Smaller
variants are proportionally resized and losslessly encoded. No source upsampling.
The entire frame, vase/flowers, cabinet, books, sphere, bowl, sunlight and shadows
remain visible with the existing contain-based responsive presentation.

`mother-nature-photograph.json` supplies the shared gallery/card/hero image.
Mother Nature's previous generated gallery/lifestyle images are no longer returned
for either intended size and cannot appear via its card hover. Existing complete
print design remains available for inspection. The approved photo is not assigned
a claimed physical print size; selecting 9×12 or 12×16 does not rescale the room or
append a size label to the photograph. No pricing, original-artwork data, purchase,
fulfillment, copy or route changes. Shared Mother Nature print previews/navigation
also resolve to the same approved primary image. Other four products are unchanged.

## Phase 2 findings — inspect only, no new composites

All four original approved print files are available and match recorded hashes:

| Artwork | Source file | Resolution |
| --- | --- | --- |
| Ethereal Bloom | STUDIO  F&F EB 9x12.jpeg | 4687 × 6249 |
| Tiger Lily | STUDIO  F&F TL 9x12.jpeg | 4687 × 6249 |
| 75 Leaves | STUDIO  F&F 75L 9x12.jpeg | 4687 × 6249 |
| A Forest Forgotten | STUDIO  F&F AFF 9x12.jpeg | 4687 × 6249 |

Each complete source includes its own typography, border, monogram and signature,
with the same approximately 3:4 proportions. They are suitable source material for
non-generative compositing. The exact approved photograph can be the immutable
background; no replacement room image is needed.

Proposed method **for approval before proceeding**: register the inner print/paper
boundary, protect the black frame, mat and all external pixels with a fixed mask,
fit the entire source print proportionally inside that boundary, and retain narrow
existing mat margins if required by the opening. Use a deterministic compositor
such as Pillow/OpenCV or a layered image editor, not image generation. Do not force
a fit by cropping the border/signature or distorting typography. Confirm placement
and any perspective alignment on one proof first; verify every pixel outside the
approved mask remains identical to the supplied PNG. Work losslessly before web
encoding. The opening and any residual mat need careful registration; an exact
mask/placement has not yet been approved or used.

No Phase 2 images, room recreations, print replacements or derivatives for the
other four artworks were created in this change. Stop after Phase 1 and wait for
artist approval of the proposed compositing method and placement.

No merge or production deployment without explicit approval.

Validation: TypeScript, all 121 tests, production build and SEO checks pass.
Desktop/tablet/mobile Chromium at 390/768/1440px verified the exact-photo hero,
Studio listing and Available Art card, both size choices, whole-image containment,
no generic Mother Nature hover/alternate, and no horizontal overflow/runtime
exceptions. The PNG in both public and dist is byte-identical to the ZIP source;
native WebP decoded pixels are identical. Existing catalog warnings are unchanged;
actual Safari hardware testing was not performed. Phase 2 files were inspected
only; no four-print mockup data/assets or original artwork records were modified.
