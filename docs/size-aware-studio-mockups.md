# Size-aware Studio Print room mockups

The artist supplied a clean version of the approved room and confirmed the existing large composition as the 12 × 16 reference. This resolves the flattened-background blocker described in earlier inspection reports. Physical room dimensions were not independently measured.

## Composition and provenance

- All five authentic, complete Studio Print designs are composited into the same supplied 1122 × 1402 room. No AI, replacement room, cropping, or relettering is used.
- `assets/studio-mockups/approved-clean-room.png` preserves the uploaded background unchanged. It is a tooling source, not imported into the website bundle.
- The existing approved Mother Nature frame supplies the frame appearance. A small foreground-leaf fragment is cleaned from the frame layer; the scene leaf remains at its fixed room position.
- Large print sheet: 660 × 880 pixels. Small print sheet: 495 × 660 pixels, exactly 75% in both directions. Both are centered at (565, 572). Frame and shadow layers resize independently of the stationary room.
- Only paper regions receive subtle warmth and inner-edge shading. Artwork and printed dark details are excluded from that treatment. Sources are converted to sRGB when an embedded profile exists.
- Authentic print master hashes and geometry are recorded in `studio-size-gallery-audit.json`. Production-resolution JPEG masters remain outside public assets.

## Runtime and performance

The product gallery selects a separate responsive image set for each size, sharing that image with its thumbnail. Artwork Detail remains unchanged. Selected size persists when changing gallery views. Collection cards, sharing images, prices, charity commitments, and other pages remain unchanged.

Thirty lossless WebP derivatives (480, 768, and native 1122 pixel widths) deliver ten composites. Total asset storage is approximately 28 MB; browsers select one responsive derivative at a time. Native files are approximately 1.6–2 MB, preserving fine scene texture; mobile 480-pixel files are approximately 291 KB. Original full-resolution print masters are not deployed.

## Reproduction

Run with existing Pillow and NumPy tooling; no new application dependency:

```sh
python tools/studio-gallery/size_variants.py --source-dir /path/to/private/approved-print-jpegs --review-dir /tmp/size-gallery
```

The generator validates authentic source hashes, exact decoded WebP pixels, and unchanged background pixels outside the frame/shadow region. It writes optimized assets, the image registry, and geometry audit. Optional `--artwork` limits generation to one artwork.

## Verification and review

- TypeScript, all 129 tests (23 files), production build (41 public pages), SEO checks, and whitespace validation passed.
- Browser checks covered all five products at 390, 768, and 1440 pixels: size/price synchronization, thumbnail synchronization, gallery round trip, no reload, and no horizontal overflow.
- Independent screenshot measurements at 390 and 1440 pixels found width ratios 0.7488–0.7494 and height ratios 0.7518–0.7519, consistent with 75% after screen-pixel rounding. Background pixels outside the conservative frame/shadow union were identical; returning to 9 × 12 restored the exact screenshot.
- Browser screenshots and the side-by-side review are saved outside the production build in `/workspace/previews/size-gallery-site/`; ten native PNG proofs are in `/workspace/previews/size-gallery/`.

The images are illustrative framed presentations of prints sold unframed. Review approval is still required; no production deployment is authorized by this change.

## Paper-edge correction

The initial composition retained ten-pixel strips of the previous photographed paper above and below the new sheet. Their different tones created visible horizontal seams. The compositor now replaces the entire inner paper opening, extending only the authentic sheet’s blank edge into those strips. Inner-frame shading is applied at the actual opening edge rather than partway down the paper. Complete printed designs and the 75% size relationship remain unchanged.

Changing size now preserves the selected gallery view, including Artwork Detail. If an optional size-restricted extra view is unavailable for the next size, it falls back safely to the room view. Focus remains on the size control and there is no navigation or page reload. Updated desktop/mobile comparison screenshots are in `/workspace/previews/paper-edge-site/`.

## Approved 12 × 16 collection reference

The artist subsequently requested that product pages reuse the collection-card photograph for the 12 × 16 In a Space view. `studioGallery` therefore uses `studioPrimaryImage` for 12 × 16, sharing the exact image object and responsive variants with collection cards. The 9 × 12 view retains its size-gallery assets and reviewed lighting. The main image, thumbnail, and fullscreen view use the same selected source. No image assets are modified by this reference correction. Earlier geometry audits describe the generated size-gallery composites; they are not a pixel-calibration assertion about the collection photograph now selected at runtime.
