# Size-specific Studio mockups: asset review and blocked work

## Verified existing behavior

All five Studio Prints offer 9 × 12 at $40 and 12 × 16 at $95. Selecting a size
changes its selected-size label and price; it currently selects the same approved
1122 × 1402 flattened room composite in both cases. This is an illustrative room
view, not an accurate depiction of both physical sizes. The approved print files
are available, so replacement artwork is not needed.

The existing below-price notes are already exact for 75 Leaves and A Forest
Forgotten, with emphasized percentages and subtle forest-green text. They remain
unchanged, as do their integrated original-artwork descriptions and all giving
percentages/recipients. No new charity box, banner or standalone section is added.

## Inspected assets

- `public/studio-editions/approved/mother-nature-gallery-still-life.png`: flattened
  approved 1122 × 1402 room reference and optimized derivatives.
- `public/studio-editions/exact-gallery/*`: five approved flattened composites,
  all preserving the same photographed room/frame placement.
- `src/studio/exact-gallery-images.json`, `gallery.ts` and `editions.ts`: room
  references, current size selection and confirmed price definitions.
- `tools/studio-gallery/composite.py` and its configs: replace artwork/title
  inside the existing frame only; no clean wall behind the frame exists here.
- Private authentic print JPEGs and served print-design WebPs: artwork sources
  are present; full sheets have 3:4 proportions, compatible with both print sizes.
- `assets/studio-mockups/ivory-console.webp` and `layout.json`: an older, different
  room background. Its wall, furniture, objects, lighting and geometry differ
  from the approved reference. It is not a clean plate of the approved room and
  its declared pixels-per-inch cannot calibrate the approved photograph.
- Accessible attachment/staging paths contain the approved flattened ZIP, not a
  matching layered PSD/PSB/XCF/ORA or clean plate of the approved scene.

## Why accurate variants are blocked

9/12 = 12/16 = 0.75: at fixed camera and display scale, the smaller sheet should
occupy 75% of the larger sheet's width and height (56.25% of its area). Its artwork
proportions remain unchanged. Resizing the entire room photograph would also
resize the room/furniture and would not satisfy this requirement.

Shrinking the print/frame within this flattened photo exposes background pixels
currently hidden by the frame, including its cast shadow. Enlarging the existing
frame also requires correctly separated frame/paper/shadow layers. Cropping,
pasting over the scene, substituting the older room, or inventing missing wall
would violate the requirement to keep the approved scene intact. Scaling only
the artwork inside the unchanged frame would change mat/border proportions and
would not establish the requested physical sheet size.

No size-specific images were produced. The existing scene remains unchanged and
now explicitly says: “Prints are sold unframed. Room view is illustrative and does
not show the selected size to scale.” Artwork Detail retains the unframed note
without suggesting that its standalone sheet shows room scale.

## Assets needed to complete the variants

Supply either:

1. The approved scene as a layered original (or a matching clean room plate),
   with removable frame/paper and shadow layers, plus a verified sheet-corner
   registration for one size or a measured reference for scale; or
2. Authentic 9×12 and 12×16 mockup photographs made from the same fixed camera,
   room, furniture, lighting and frame styling, identified by sheet size.

The verified 12×16 sheet registration can anchor the scene; the 9×12 sheet then
uses the same center/perspective and 0.75 linear scale. Frame/mat dimensions must
be distinguished from the printed sheet so the sheet, rather than the outer
frame, has the correct dimensions. Existing authentic print designs can be reused.
No new room design, AI reconstruction or artwork regeneration is proposed.

## Validation of the safe changes

TypeScript, all 128 tests across 23 files, the 41-page production build, SEO checks
and git diff --check pass. Chromium at 390/768/1440 tests both size/price controls
on all five pages, exact below-price charity copy and placement on the two selected
prints, unframed/illustrative wording, clean-sheet wording, and no overflow/runtime
exceptions. The test explicitly records that the same room image is reused and
that physical size-accurate variants remain blocked; it does not certify their
accuracy. No assets, prices, giving metadata, original descriptions or navigation
were modified. Actual iOS Safari hardware was unavailable. No merge/deployment.
