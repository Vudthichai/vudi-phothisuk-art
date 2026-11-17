# Studio Edition product mockups — review revision

## Asset integrity and provenance

All five supplied source files are present. Their SHA256 hashes were checked against
`docs/studio-print-photographs.json` before composing Mother Nature, Ethereal Bloom,
Tiger Lily, 75 Leaves and A Forest Forgotten. No original-painting photograph,
replacement lettering, generated art, monogram, border or signature was used.

The approved source designs remain in `/workspace/studio-print-sources/`, outside
the repository and public deployment. The artist must retain their own permanent
backup; a workspace is not permanent storage. Only web-resolution composites and
previously approved web derivatives are served.

An image-generation tool created **only the empty interior background**: ivory
wall, oak console, daylight and small vase. The unmodified generated original is
retained in `/workspace/generated_images/`. A compact background-only web copy lives
in `assets/studio-mockups/ivory-console.webp`, outside the public folder. No print
file was sent to image generation. All artwork was placed deterministically with
Pillow, using proportional resize and direct paste, without image-model editing.

Before WebP encoding, the compositor compares the complete artwork rectangle to
its proportionally resized source pixel by pixel. All 20 comparisons passed.
Frame and shadow layers are outside that rectangle. No crop, tone adjustment,
perspective distortion, sharpening or glass reflection is applied to the artwork.
Web encoding and proportional downsampling necessarily change sampled pixels;
this is faithful compositing, not a claim of bit-identical original-size web files.

## Reusable layout and sizing

`assets/studio-mockups/layout.json` contains scene measurements and parameters.
`scripts/compose-studio-mockups.py` reuses the same scene, lighting, border thickness,
frame color, print placement and shadow process for every artwork. Run with existing
development Pillow:

```
python scripts/compose-studio-mockups.py --sources /private/source-directory
```

The gallery view is a straight-on slim matte-black frame on warm ivory, with soft
cast shadow. The lifestyle view uses one shared synthetic room. Each of the ten
views has **two size-specific compositions** (20 compositions total): 9×12 and
12×16 inches. Artwork dimensions, frame thickness and shadow geometry are computed
from one scale per scene; changing size increases print width/height by 4/3.
The lifestyle scale uses a declared **36-inch console assumption**, with its
936-pixel span giving 26 pixels/inch in the source plate. This is a dimensioned
illustrative mockup, **not a measured real room or photograph of a finished print**.
The frame is presentation styling, not a promised included product or selected
vendor frame. Final product materials and larger-size prices remain unconfirmed.

`docs/studio-mockup-composition-checks.json` records the source checksums, print
positions, frame/print dimensions and exact pre-encoding comparison results.
`src/studio/mockup-images.json` contains only public web image metadata.
The `approved-print-composite` marker identifies derivation from approved print
files, not prior artist approval of these new scenes; final visual approval is the
purpose of this draft PR. `modeledSizeIds` is separate from real-room verification.

## Website integration

Each product starts with Gallery mockup, then Interior mockup, then the existing
complete print design for detailed inspection. Thumbnail buttons and the existing
fullscreen zoom/pan viewer support pointer, touch and keyboard. Each view carries
descriptive alt text, intrinsic dimensions and responsive variants. Gallery captions
explicitly call these mockups. Size selection chooses the matching compositions
and resets to the gallery view. No original artwork page or inventory is changed.

Studio listing cards use the corresponding gallery mockup and their existing
conditional lifestyle hover/focus preview. Touch cards continue directly to the
product page, where explicit thumbnails choose views. Reduced-motion preferences
suppress animated swaps. Previous/next and original-artwork links remain intact.
Starting at $40, Coming Soon and the intended 9×12 / 12×16 options are unchanged;
there is no checkout, payment, production or fulfillment connection.

## Output and loading

Ten primary mockup views × two modeled sizes × three responsive derivatives = 60
WebP assets (approximately 11 MiB total, not all downloaded per visitor). Gallery
variants have 640/1200/1800 longest edges; lifestyle has 640/960/1400, avoiding
upsampling the 1122×1402 generated background. Existing raw-design detail view
remains capped at 1920. WebP quality is 92; no production-resolution source is public.
Main view is eager, other views/thumbnails are lazy. The composition script and
background-only template are development assets, not new runtime dependencies.

No approved print-design files are missing. Optional actual physical print/detail
photography can replace the design-inspection view later. Photographed interiors
with measured dimensions would be required for verified real-room scale instead
of the current transparent modeling assumption. No real-room measurements or
physical print samples were invented.

## Review

Run `npm run dev`: `/studio-editions/mother-nature/` and `/studio-editions/`.
The task response supplies desktop/mobile and all-five contact-sheet previews.
No merge or production deployment is authorized until the artist approves.

Validation: TypeScript, all 118 tests, production build and SEO checks passed.
Desktop/mobile Chromium at 390/1440px verified all five image pairs, both intended
sizes, gallery reset on size change, image decoding, viewer opening/closing,
collection thumbnails, navigation presence and no horizontal overflow/runtime
exceptions. All 60 derivative files were verified in the build output; no supplied
source JPEGs were copied there. Physical Safari/device testing was not performed.
No new runtime dependencies or commerce services were introduced. Existing original
catalog warnings remain unchanged.
