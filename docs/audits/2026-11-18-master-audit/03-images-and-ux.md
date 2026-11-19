# Production visual, imagery, accessibility and performance audit

Observation: 2026-11-19 UTC / November 18 Eastern. Read-only production investigation. No application source or artwork asset changes, branches, commits, installations or deployment actions were performed. Only the requested audit documentation was added.

## Coverage and limitations

- Inspected live https://vudiphothisukart.com with headless Chromium via the environment's proxy: all **40 canonical routes at 1440×1000 and 390×1000**, 80 rendered observations in `browser-pages.json`.
- Saved viewport/full-page screenshots for 15 representative route families; additional clean screenshots after choosing **Decline analytics**. Initial screenshots intentionally retain the first-visit consent overlay.
- Enumerated **810 public raster/SVG assets**, 448,484,686 bytes in aggregate (`public-images.json`/CSV). This is deployable-folder footprint, **not page-load weight**.
- Matched public assets against all initial production HTML `img`/`source` srcsets and Open Graph tags: **239 distinct initial-page references**; 571 files (~331,299,763 bytes) were not initial HTML references. Those 571 are **review candidates, not a safe deletion list**: interactive image views, older registries, social images, and historical derivatives may explain them. `image-usage-audit.json` preserves per-file/page/alt/lazy reference evidence.
- Browser sweep found **zero horizontal overflows, zero missing H1s, zero images lacking an `alt` attribute, and zero runtime exceptions**. No broken images among those loaded during initial navigation and a bottom scroll. Mid-page lazy assets need progressive scrolling; a separate progressive pass forced all images to decode on Available Art, Forest & Flowers, Mother Nature, Ethereal Bloom and Moss & Mushrooms at both widths: all loaded, zero broken.
- **132 empty-alt occurrences are not 132 failures**: decorative atmosphere images and thumbnails within named buttons intentionally use empty alt. Manual semantic review is required before changing them.
- Screenshot caveat: full-page capture from the top does not necessarily load every native-lazy image. Blank reserved image spaces in `*-clean.png` are capture artifacts unless corroborated by a failed asset request. Progressive captures can also retain blank primary tiles from headless compositor repaint even after decoding succeeds; use correctly painted viewport captures for visual evidence and request/decode records for loading evidence. No false missing-image finding is made from those blanks.
- No Safari engine, physical Retina device, screen reader, automated axe scan, Google Search Console, CrUX, real-user INP or representative network throttling was available. This is not a complete WCAG conformance assessment. Lab observer output in `browser-pages.json` is diagnostic only: one unthrottled proxied session with caching and short observation windows, **not field Core Web Vitals or a Lighthouse score**.

## Main findings

| ID | Severity/status | Finding and evidence | Recommended action |
|---|---|---|---|
| V01 | **High / Verified** | Several high-resolution/source-like images are live HTTP 200, above the previous 1600–2000-long-edge target: `/artist/lilies-source.jpeg` 5712×4284, 5,460,246 B; `/artist/mother-nature-contact-full.jpeg` 5712×4284, 5,154,001 B; `/artist/mother-nature-contact-detail.jpg` 4280×3057, 4,192,678 B; `/artworks/forest/mother-nature-detail-sdr.png` 3198×1799, 9,448,280 B; `/artworks/forest/mother-nature-2800.webp` 2800×4205, 2,998,412 B. HEAD responses and cache/type/length are in `oversized-live-probes.json`. This proves public access; **it does not prove these are actual print-production masters**. | Approve a usage/source audit and replacements before removing anything. Keep artist originals privately, keep deliberately selected web/zoom derivatives public, inventory direct URLs and decide retention/redirects. Do not treat right-click deterrence as protection. |
| V02 | **Medium / Verified geometry, Inferred conversion impact** | First-visit analytics notice overlays meaningful artist/artwork content. At 390×1000 it occupies approximately y624–984 (~360px, 36% of viewport), obscuring the Forest title/CTA area; on desktop it occupies the lower-right story/product copy. Screenshots `collections-forest-and-flowers-390-viewport.png`, `studio-editions-mother-nature-1440-viewport.png`. Source `src/analytics/Analytics.css:2-5` fixes a 620px panel above content. The notice provides clear accept/decline choices and privacy details; legal compliance is not certified by this audit. | Keep optional analytics opt-in, equal accept/decline and privacy details, but consider much shorter first-layer wording with details progressively disclosed. Do not remove consent protections. Validate no important CTA is obscured at common phone heights. |
| V03 | **Medium / Verified footprint, Inferred maintenance risk** | Public asset folder contains ~448.5MB and multiple generations of photo/mockup/rollout variants. 571 files are not referenced in initial live HTML. This does not mean users download 448MB or all 571 are obsolete. | Create a reachability map including interactive registries, deployed JS and social tags before archival. Consolidate derivative conventions and record approved/current source status to prevent future mistaken substitutions. |
| V04 | **Medium / Verified bytes; optimization value inferred** | Native approved room images are ~1.87–1.94MB each at 1122×1402, with responsive 480/768 variants. Several high-detail original 1800-wide WebPs are 1.2–2MB. It is legitimate to preserve fine texture, but lossless room scenes cost more than the printed art information alone. | Test perceptually conservative AVIF/WebP export options against approved originals; compare 100% details, paper lettering and shadows on Retina before approval. Reuse sizes/srcsets; avoid another generic background or degrading artwork to meet an arbitrary byte limit. |
| V05 | **Medium / Verified page lengths; Inferred friction** | Forest collection is ~15,763px at desktop and ~19,631px at 390px; Available Art is ~9,002/15,783px. Mother Nature original page is ~7,137/5,530px. Inquiries on original artwork pages appear after extensive descriptions/detail galleries rather than beside the first price. These are measured page lengths, not measured abandonment. | Preserve editorial galleries but consider a restrained early inquiry link and a compact in-page collection/availability index. Use analytics only after consent to determine whether this is real friction; do not assume long pages inherently fail. |
| V06 | **Low–Medium / Verified current mechanism, Inferred discoverability risk** | About video has no visible player controls by approved design. It is muted, inline, autoplay/loop, has a named button role and tap/Enter/Space pause/resume; reduced motion shows a poster with no video source. This is a credible accessibility baseline. Sighted visitors may not discover tap-to-pause from the clean presentation. | If user feedback warrants, consider a tiny focus/hover or otherwise restrained pause affordance; retain clean edges, not another gradient. Native video controls are not automatically required if the existing alternative is usable. |

## Photograph fidelity and gallery judgment

**Verified from rendered views and source dimensions:** original artwork hero/detail images preserve natural ratios or use `object-fit: contain`; Available Art's standardized 4:5 image frames contain the entire work rather than crop its painted surface. The black-frame room imagery preserves complete approved print borders, typography, monogram and signature. No demonstrable stretching or excessive cropping was found on the important current original artwork views.

**Visual assessment (not objective artistic grading):** current primary photos of Mother Nature, Ethereal Bloom and Moss & Mushrooms look sufficiently sharp at normal desktop/mobile viewing sizes to reveal ridges, metallic catches and sculptural forms. No obvious JPEG blocks, inappropriate blur filter, digital repainting or stretched canvas shape was observed. These three works have materially different compositional identities: figurative hidden face/river, repeated floral forms over an all-over patterned field, and dark woodland/bark/fungal detail. Their photographs communicate the physical work better than a room mockup alone.

Do not promise identical colors between screens or photos. Mother Nature's bright homepage detail, full original portrait, angled gallery views, and warm interior print mockup have different lighting/purpose. Neutral capture/color-management guidance could improve consistency, but tonal edits require artist review. The supplied branded process footage visibly includes signature lettering; that is in the source, not an added website watermark.

### Important active assets

| Purpose/file | Actual dimensions | Bytes | Assessment |
|---|---:|---:|---|
| `forest-preview/images/mother-nature-full-final-v1-1200.webp` | 1200×1807 | 850,134 | Full original within web-resolution target; display around 700×1054 at 1440 viewport. 640×964/238,616B small derivative exists. |
| `forest-preview/images/ethereal-bloom-full-final-v1-1200.webp` | 1200×1607 | 811,722 | Complete primary composition; fine surface remains legible. 640×857/250,168B derivative exists. |
| `forest-preview/images/moss-and-mushrooms-full-final-v1-1200.webp` | 1200×1607 | 723,440 | Detail-heavy darker composition; preserve shadow separation. 640×857/221,604B derivative exists. |
| `artworks/forest/mother-nature-home-intro-img-7873-1800.webp` | 1800×1013 | 847,188 | Homepage detail deliberately different framing from full painting; do not treat it as mistaken full-art crop. 900-wide (244,054 B) and 2800-wide (1,632,108 B) derivatives exist. |
| `atmosphere/forest-bluebells-1920.webp` | 1920×1200 | 515,026 | Atmospheric collection hero, not artwork product image. 768-wide (121,020 B) and 1280-wide (296,468 B) variants. |
| `studio-editions/mother-nature-print-1920.webp` | 1440×1920 | 907,074 | Complete authentic standalone print sheet; suffix refers to long edge, unlike other width-named assets. Naming convention should be documented. |
| `artist/artist-process-poster.webp` | 718×1198 | 136,068 | Authentic static poster, correct aspect and reduced-motion behavior. |
| `artist/artist-process.mp4` | 718×1198 | 4,387,661 | 11.2-second muted H.264; measured live playback, no visible controls, inline. Original source remains outside public delivery per repository provenance. |

`src/forest/ForestPhotograph.tsx:4-6` supplies srcset, explicit intrinsic width/height, alt, eager/lazy selection and async decoding. This is sound. `src/components/OceanCollection.tsx:85-87` supplies a portrait mobile hero `<source>` rather than simply stretching the wide hero. Native images below the fold use lazy loading; re-exports must preserve that architecture. `public/fonts/bodoni-moda-regular.ttf` is 44,752 B and preloaded; WOFF2 is a future marginal optimization, not a material blocker at this size.

## Accessibility and interaction observations

- Green/ivory typography and restrained underline/focus treatments are generally legible in the inspected views. This does not verify text contrast on every photographic pixel or every interaction state.
- Explicit image dimensions reduce layout instability. Empty alt is appropriate on decorative hero textures and named thumbnail buttons; meaningful full images carry useful alt text.
- Fullscreen viewer source (`src/forest/FullscreenArtworkViewer.tsx:56-91`) uses a native modal dialog, Escape cancellation, focus restoration, named controls, arrow keys and Tab wrapping; this is stronger than a simple click-only overlay. Formal screen-reader/device testing remains outstanding.
- Primary art and inquiry links remain keyboard-accessible real links. Footer returns to page-top and preserves reduced-motion scrolling.
- About reduced-motion state was verified on live production, then normal motion confirmed muted inline loop playback (`evidence/product-video-checks.json`). Product size/thumbnail paths and prices change correctly between 9 × 12 $45 and 12 × 16 $95 for all five products.
- A first-pass synchronous script returned `detailPreserved:false` because it triggered multiple React events before state committed. **Do not cite that as a user-facing bug.** The subsequent sequential interaction result is `evidence/sequential-gallery-check.json`: all five preserve Artwork Detail when changing size.

## Evidence files

- `browser-pages.json`: 80 route/viewport snapshots, selected source, displayed dimensions, hierarchy, links, resource timings.
- Runtime exception observations are included in `evidence/browser-pages.json`; none were detected.
- `evidence/public-image-files.csv`: all 810 public image dimensions/formats/bytes.
- `image-usage-audit.json`: initial-live-page usage and source-literal candidates.
- `oversized-live-probes.json`: production HTTP 200 evidence for specific high-resolution assets.
- `screenshots/desktop-first-contactsheet.jpg`: first-visit visual overview with consent banner.
- `screenshots/*-viewport.png`: specific first-visit frames.
- Progressive decode checks are documented above; full-page captures can contain headless repaint artifacts, so selected viewport screenshots are the visual reference.
- `evidence/product-video-checks.json` and `evidence/sequential-gallery-check.json`: live product/video observations.

No performance pass/fail score is assigned without appropriate field/lab methodology. Actual CWV, Safari, Retina, screen-reader behavior and display color fidelity remain Not Yet Verified.


## Included evidence and reading order

Start with [the ten-work Forest contact sheet](evidence/screenshots/forest-artwork-contact-sheet.jpg), [Mother Nature mobile viewport](evidence/screenshots/collections-forest-and-flowers-mother-nature-390-viewport.png), [Ethereal Bloom desktop viewport](evidence/screenshots/collections-forest-and-flowers-ethereal-bloom-1440-viewport.png), [Moss & Mushrooms desktop viewport](evidence/screenshots/collections-forest-and-flowers-moss-and-mushrooms-1440-viewport.png), [initial-visit desktop overview](evidence/screenshots/desktop-first-contactsheet.jpg), and [mobile consent example](evidence/screenshots/collections-forest-and-flowers-390-viewport.png). [Public file inventory](evidence/public-image-files.csv) covers all files; [usage records](evidence/image-usage-audit.json) separate observed references from review candidates. Actual browser dimensions and selected responsive resources are in [80 browser observations](evidence/browser-pages.json). Native full-size screenshots and research diagnostics are retained outside source at `/workspace/audit-work/screenshots/`; selected evidence is copied here to keep the report manageable. A diagnostic value from a short proxy/cached browser session is not a defensible field-CWV claim.

A single read-only public PageSpeed API attempt was blocked by the environment proxy (`403` tunnel failure), with no origin measurement returned: [attempt record](evidence/pagespeed-attempt.json). This is a measurement limitation, not a website performance failure.
