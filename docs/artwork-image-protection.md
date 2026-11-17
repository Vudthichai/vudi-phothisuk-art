# Forest & Flowers image protection review

## Scope and findings

Read-only file inspection measured actual image headers, not filename suffixes.
No image was resized, recompressed, recolored, cropped, moved or deleted in this
update. The Studio Editions preview remains separate from production; no merge,
deployment, hosting change or checkout activation is authorized by this work.

### What is served now?

- Forest artwork photography uses WebP `srcset` variants, normally 640 and 1,200
  **pixels wide**, not on the longest edge. Their longest edges range from 640
  to 2,133 pixels. Width/height attributes reserve space and `sizes` informs
  browser selection; decoding is asynchronous and secondary images load lazily.
- The fullscreen viewer additionally loads `enlargement` WebP URLs recorded in
  the collection JSON. The largest measured file is 2,400 × 4,267. A filename
  ending in `2400` therefore does not mean a 2,400-pixel longest edge.
- The five Studio card photographs are already approximately 1,600–1,820 pixels
  on the longest edge. They have 640-wide alternatives and do not load the
  fullscreen enlargement. At the existing desktop card width (about 385 CSS
  pixels), a 1,200-wide image comfortably supplies a 2× display. On mobile the
  same responsive source supplies high-density screens without downloading a
  print-production master. Fullscreen 4× zoom has a different quality tradeoff;
  a 2,000-long-edge cap would reduce fine detail at high magnification.
- All 42 sharing JPEGs are 1,200 × 630. The Forest atmosphere hero is a separate
  photograph, with 768/1,280/1,920-wide WebP variants, not a painting master.

| Studio card | Largest variant | File bytes |
| --- | --- | ---: |
| Mother Nature | 1,200 × 1,807 | 850,134 |
| Ethereal Bloom | 1,200 × 1,607 | 811,722 |
| Tiger Lily | 1,200 × 1,625 | 734,828 |
| 75 Leaves | 1,200 × 1,604 | 668,790 |
| A Forest Forgotten | 1,200 × 1,820 | 787,396 |

These detailed artwork images are not aggressively recompressed just to achieve
an arbitrary byte target. Existing consistent, uncropped frames and alternative
text remain intact; no visible overlays or watermarks were added.

### Are production-quality originals accessible?

No identified print-ready master set or TIFF/PSD/RAW files was found in `public`.
This does **not** establish that public photographs cannot be reproduced: file
resolution alone cannot certify print readiness, and several source photographs
are already publicly exposed. Vite copies everything in `public` to `dist`,
including unreferenced assets. Omitting a link or removing a JavaScript reference
would not make a file private.

Read-only HEAD requests to the production domain returned HTTP 200 and image
content types for both `/artist/lilies-source.jpeg` (5,460,246 bytes) and
`/forest-preview/images/a-forest-forgotten-img-7995-rollout-enlarge-2400.webp`
(1,077,400 bytes). No production files or deployment settings were changed.
Other rows below are verified repository/deploy candidates, not individually
HTTP-tested URLs. Original source status is based on recorded paths/names; their
suitability as print-production masters remains unverified.

### Existing files to review before replacement

| Public path | Measured size | Recommended next step, subject to review |
| --- | --- | --- |
| `/artist/lilies-source.jpeg` | 5,712 × 4,284 | Preserve source privately; serve an approved ≤2,000-long-edge WebP if needed. |
| `/artist/mother-nature-contact-full.jpeg` | 5,712 × 4,284 | Preserve source privately; audit Contact references before substituting a web derivative. |
| `/artist/mother-nature-contact-detail.jpg` | 4,280 × 3,057 | Same reference/visual review; do not silently alter the Contact composition. |
| `/artworks/forest/mother-nature-detail-original.jpeg` | 3,196 × 1,798 | Preserve source privately; use an approved web derivative where still referenced. |
| `/artworks/forest/mother-nature-detail-selected.jpeg` | 3,198 × 1,799 | Review alongside original and SDR version; keep approved colors. |
| `/artworks/forest/mother-nature-detail-sdr.png` | 3,198 × 1,799; 9,448,280 bytes | Large public tonal-test file; review usage and archive privately rather than guessing which version is authoritative. |
| `/artworks/forest/mother-nature-2800.webp` | 2,800 × 4,205 | Review full-painting/homepage source requirements before replacing with an approved ≤2,000-long-edge derivative. |
| `/forest-preview/images/*enlarge*.webp` | Up to 2,400 × 4,267 | Review fullscreen zoom fidelity against new ≤2,000-long-edge derivatives before switching references. |

Counts of all image files above a 2,000-pixel longest edge (including unused
historical versions): Forest preview 108, Forest artwork directory 7, Oceans 82,
Regal 16, artist directory 6. Other collections were counted for exposure
awareness only; their assets and layouts were not modified. This is an inventory
threshold, not a declaration that every file is a production master or should be
removed. None of these files has been removed or replaced in this PR update.

## Safe improvements implemented

`artworkImageDeterrents` is reused by ForestPhotograph (including Studio cards,
Forest gallery/details/thumbnails and the fullscreen base image) and the separate
fullscreen high-resolution layer. Native image dragging is disabled, and image
`dragstart` is canceled. Context menus are canceled only on **unlinked artwork
images**. Linked photographs retain their context menu so collectors can open a
painting in another tab; browsers cannot selectively remove just Save Image from
that menu. Context menus on text, links, page backgrounds, the signature and
unrelated images are untouched. No global event listeners were added.

No handlers cancel clicks, keyboard input, touch gestures, scrolling or zoom.
There is no transparent blocking layer, no touch-callout suppression and no
user-selection restriction. Gallery controls, swipes, zoom and focus restoration
retain their existing implementation. These deterrents add no image requests,
new dependencies or layout changes. They cannot prevent screenshots, direct URL
downloads, browser inspection, caching or saving with JavaScript disabled.

## Recommended next phase — requires asset review

1. Retain print-ready sources in the artist's private storage **outside this
   repository and outside `public`, `dist`, imported application assets, preview
   uploads and deployment artifacts**. Do not introduce master download URLs into
   collection JSON, HTML, JavaScript, sharing metadata or sitemaps. A private
   repository or an obscure URL is not a private deployed asset store.
2. For approved replacements, create color-managed web derivatives with longest
   edge around 1,600–2,000, smaller responsive variants, preserved aspect ratio,
   canvas border and signature, no sharpening/tonal edits. Review desktop/mobile
   and full zoom side by side; preserve original sources privately first.
3. Update all render, enlargement, prefetch and metadata references together,
   verify no regressions or broken links, and seek approval before deleting or
   excluding existing public sources. Removing a reference alone is insufficient.
4. In a separately approved release, stop publishing redundant/source files,
   check their old URLs are no longer served, and review host/CDN cache behavior.
   Previously downloaded or externally cached copies cannot be recalled.

The current change preserves image fidelity and performance exactly. A later
approved derivative cleanup can reduce bandwidth and accessible resolution, but
requires a deliberate decision about fullscreen enlargement quality. No claim of
complete download protection is made.
