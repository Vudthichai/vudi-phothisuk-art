# Gallery typography and Studio mockup inspection

> Historical inspection: the artist subsequently supplied the clean room and confirmed the 12 × 16 reference. See [size-aware mockups](size-aware-studio-mockups.md) for the implemented solution and current verification.

## Typography scope

A shared Bodoni Moda token and scoped rules align original artwork titles across
Forest & Flowers, Oceans, Regal, Available Art and individual artwork pages.
Studio artwork titles and collection headings use the same existing serif.
Artwork title weight is 400 with the Forest editorial reference's 1.12 line height.
Existing context-specific sizes, tracking, margins and responsive breakpoints remain;
long titles may wrap naturally, with a word-break fallback to prevent clipping.
Supporting body text, dimensions, medium, inquiry links and navigation are untouched.
No new font files or dependencies are introduced.

Price rules, amounts and placement in the markup are untouched. Studio starting
price, Coming Soon and provisional sizes are unchanged. Artwork catalog files,
availability, descriptions, order, giving statements and image assets are unchanged.

## Read-only mockup inspection

| Item | Evidence | What it establishes |
| --- | --- | --- |
| Approved complete print-design sources | Five private JPEGs, 4687 × 6249 pixels | Ratio ≈0.75004; compatible with 3:4 paper proportions, not proof of inches or production size. Filenames refer to 9×12. |
| Served Artwork Detail sheets | Five largest WebPs, 1440 × 1920 pixels | Exact 3:4 full-sheet ratio. Both 9×12 and 12×16 have this same ratio. |
| Artwork inside the sheet | Source artwork window 3833 × 5379 pixels in each registration config | Ratio ≈0.712586. Artwork area excludes printed paper margins, monogram/title/signature and border; it is not the entire sheet. |
| Artwork fitted into the room reference | Uniform `min(width scale, height scale)` fit to 539 × 756 pixels | No nonuniform scaling or artwork clipping in this fit. Ratio difference ≈0.05% comes from integer pixel rounding; narrow photographed-paper side margins retain the whole artwork. |
| Approved room images | Five 1122 × 1402 native images, ratio ≈0.800285 | Overall room-photo composition, approximately 4:5; this is not a sheet or frame aspect ratio. |
| Runtime rendering | `object-fit: contain`; full intrinsic image proportions retained | The image may fit within a differently proportioned CSS container without cropping the artwork. |
| Size selection | Both provisional options use the same approved room image; size-specific prices are null | Selection does not provide a calibrated 9×12 or 12×16 room visualization. |
| Frame and paper size | No verified physical sheet, aperture/mat or outer-frame dimensions in active metadata/configs | Physical 12×16 accuracy and the outer frame's inch dimensions cannot be confirmed. |

The room reference is a flattened approved photograph. The compositing process
replaces its artwork/title regions, preserves the room/frame/branding, and does not
supply measured paper corners, frame dimensions or a physical calibration. It is
therefore **not possible to verify a 12 × 16-inch print from the existing mockup**.
A 3:4 source design alone does not establish whether the photographed sheet is
9×12 or 12×16; the outer frame would additionally include any mat, gap and moulding.
A measured reference photograph or verified sheet/aperture/frame specifications
would be required for that claim.

Inspected sources: `src/studio/print-photographs.json`,
`src/studio/exact-gallery-images.json`, `src/studio/editions.ts`,
`src/studio/gallery.ts`, `src/studio/StudioStore.css`,
`src/studio/StudioEditions.css`, `tools/studio-gallery/composite.py`,
`tools/studio-gallery/configs/*.json`, and the existing approved image dimensions.
No mockups were regenerated, and no asset, print size, framing or specification
was changed during this inspection.

## Verification

- TypeScript, 126 tests across 22 files, the 41-page production build, SEO checks
  and `git diff --check` pass.
- Chromium at 390, 768 and 1440 CSS pixels verifies the shared Bodoni/400 title
  style, long-title wrapping and no horizontal overflow across collection,
  Available Art, original-detail and all five Studio product pages.
- Before/after computed-style snapshots match exactly for original and Studio
  price text, font family, size, weight, color, line height, letter spacing,
  margins and previous-element placement in markup. Price CSS was not edited.
- Desktop/mobile previews cover Forest & Flowers, Oceans, Regal, Available Art,
  original detail pages and a Studio product. Actual iOS Safari hardware was
  not available. No merge or production deployment was performed.

Files changed: `src/gallery-typography.css` (shared scoped typography),
`src/App.tsx` (load that stylesheet), and this inspection/verification report.
