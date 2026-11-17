# Reviewed exact-room gallery set — site integration

This continues draft PR #68 after the artist reviewed Ethereal Bloom, authorized
all five composites (including refreshed Mother Nature), and requested site use.
The earlier Mother Nature-only phase notes describe the original intermediate
request; this document describes the current complete implementation.

## What is displayed

All five Studio Editions use their reviewed exact-room composite as the primary
image: Mother Nature, Ethereal Bloom, Tiger Lily, 75 Leaves, A Forest Forgotten.
The shared gallery mapping feeds standalone product heroes, Studio listing cards,
Available Art Studio cards, the Forest collection's Studio section, original-page
print previews and print-to-print navigation thumbnails. The authentic full print
design remains a separate inspection view. Retired generic room images and hover
alternates are not returned by the active galleries. Their historical files remain
available for reversal; no original assets were deleted.

The photo composition remains the same for both provisional size choices. It does
not rescale the room or claim measured physical print size. Captions say Gallery
mockup without appending a selected-size claim. Starting at $40, Coming Soon,
9×12 and 12×16 controls, prices, inventory, original painting images/descriptions,
original inquiry, footer/header and navigation remain unchanged. No checkout or
fulfillment integration is introduced.

## Integrity and delivery

`docs/exact-gallery-published-assets.json` records each reviewed PNG hash, approved
print-source hash, common room-master hash, outside-mask preservation and native
RGB hash. Preparation checks the reviewed files' hashes and independently verifies
zero outside-mask changes before creating any web assets. No AI service is called.
The room, frame, natural shadows, cabinet, flowers/vase, bowl, books/sphere, paper
shading, heading, logo, green border and signature remain exactly as in the master
outside the artwork/title masks. Artwork and title content come from the approved
high-resolution print files via the reviewed compositing recipe.

Public delivery uses lossless WebP at widths 480, 768 and native 1122 (longest edge
1402). Native decoded pixels are identical to the reviewed PNG; smaller versions
are proportional resizes, losslessly encoded with the source sRGB ICC profile.
No crop, additional color grade, relighting, sharpening, blur or source upsampling.
The original uploaded room PNG remains preserved byte-for-byte under approved/
for provenance. It is a web-resolution room reference, not a production print file.
The high-resolution print JPEGs remain outside repository/deploy assets.

All Studio pages' Product/collection image metadata and sharing cards use the
reviewed room imagery. Original artwork metadata and the existing 41 public URLs
are preserved. Sharing JPEGs are 1200×630 contain-based layouts with the entire
room photo visible; standard social-image JPEG encoding does not affect the
lossless product files.

## Reproducibility

`tools/studio-gallery/composite.py` and per-artwork configs reproduce native review
proofs with a fixed master and the approved source hashes. Supply private JPEGs:

```
python tools/studio-gallery/composite.py \
  --config tools/studio-gallery/configs/tiger-lily.json \
  --source-dir /private/approved-prints --output-dir /tmp/tiger-lily-proof
```

The configs hold only source filenames/hashes and registration coordinates, never
production download URLs. The script asserts protected branding and outside-mask
pixel identity. Re-rendering PNG metadata may differ while decoded pixels remain
identical; the actual site files were prepared from the reviewed proofs themselves.

`scripts/prepare-exact-gallery-assets.py --review-root /path/to/exact-gallery-set`
validates the complete reviewed set and produces public derivatives, the image
registry and provenance audit. It writes local files only; it performs no hosting,
network, checkout or deployment operations. Existing development Pillow/numpy/scipy
are optional asset tools, not new runtime dependencies or build requirements.

## Review

Run `npm run dev` and inspect `/studio-editions/`, each standalone print product,
`/available-art/#studio-editions`, and `/collections/forest-and-flowers/#studio-editions`.
Screenshots are provided in the task response. No merge or production deployment
without explicit artist authorization.

## Verification

TypeScript, all 120 tests in 21 files, production build (41 public pages), and SEO
checks pass. Chromium checks at 390, 768 and 1440 CSS pixels verify all five product
heroes and shared collection cards, size controls, original-art links, social
metadata, no generic-room alternates, no horizontal overflow and no runtime
exceptions. Desktop/mobile screenshots are retained with the review artifacts.
Actual iOS Safari hardware was not available.

All 15 lossless derivatives match their prepared pixel buffers; the five native
files decoded from the production build match the reviewed PNGs pixel-for-pixel.
Private production JPEGs and local compositing tools are absent from the deploy
output. Existing availability, prices, original artwork and public URLs remain
unchanged. No new dependencies, production deployment or merge was performed.
