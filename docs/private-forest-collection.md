# Forest & Flowers — temporary preview entrance

The artist explicitly requested a simple browser-side visibility deterrent for a
short friends/family preview, replacing the earlier encrypted server-side gate.

## Use

After the PR is merged and the normal Netlify deployment publishes, visit
`/collections/forest-and-flowers` and enter **Evergreen** (capital E). No Netlify
environment variables, server functions, keys or account changes are required.
Use **Lock collection** to clear access, or **Exit collection** to return to the
existing collections page. Access is remembered in sessionStorage for the current
tab session, including reloads and artwork routes. It is not permanent login.
If storage is blocked, access works for the current view but cannot be remembered.

## Actual privacy limits

This is intentionally NOT password security. The password is in browser JavaScript;
`public/forest-preview/collection.json` and optimized images are publicly downloadable
without it. The public GitHub repository also contains these files. The artist
accepted that tradeoff after clarification. Do not use this mechanism for confidential
content. Existing noindex/nofollow/noarchive metadata and hosting headers remain on
the entrance/artwork routes, with matching headers on static preview assets. These
are indexing requests, not access controls. No new navigation or sitemap entries
were added. The existing navigation/collection status remains unchanged.

The former encrypted package, function, signing/encryption logic, Netlify function
configuration and development adapter were removed. Old Netlify environment variables,
if configured, are unused; there is no need to change them for this preview.
Private keys and original source uploads remain outside Git. They are not published
by this change. The earlier private backup is separate from these public optimized
copies and can remain in the artist's private storage.

## Content and photographs

All ten records, original descriptions, provisional copy flags, dimensions and
availability are unchanged. The first nine descriptions/introduction come from the
artist's PDF; the exact Junglekeepers donation statement is preserved. The final
painting's copy remains provisional and its dimensions/medium unconfirmed.
Eight works show availability to be confirmed and title-specific Inquire for Pricing
links. The two Not for Sale works have no pricing inquiry controls. No numerical
prices or new availability claims were added.

Twelve photographs (24 responsive variants) reuse the optimized temporary images
already prepared: existing Mother Nature, eight photographs extracted from the
artist's PDF, and three uploaded full/angle/detail views for the final painting.
No cropping, recoloring, distortion, replacement art or new image generation.
Original uploaded PDF/JPEGs remain outside Git.

For final photography, replace variants under `public/forest-preview/images/` and
update src/width/height/alt in `public/forest-preview/collection.json`. Components
do not need rewriting. Every image retains its natural proportions with contain.
Existing layout, content, inquiry controls and optional one-shot leaf/petal drift
are unchanged. Rejected/experimental effects remain out of the visitor experience.

## Local review and validation

`npm run dev` now works directly. Open `/collections/forest-and-flowers`; no env file
or special server command. `npm run build` and `npm run preview` work with no private
runtime settings too.

Run `npm test`, `npm run build` and `node scripts/check-private-previews.mjs`.
Tests cover wrong/right passwords, direct artwork entrance, reload/session access,
local relock, content failure, unavailable storage and the existing inventory.
Existing Phase 2–4 experimental previews remain excluded from production. No changes
to homepage, public Mother Nature interaction, Oceans, Regal, Available Art, shared
navigation, footer or artwork descriptions.

## Gallery refinement and final-photography conventions

Each detail page now uses `ArtworkImageGallery`: a single fixed-stage photograph,
thumbnail buttons, previous/next controls, touch swipe, arrow/Home/End navigation
and an enlarged native dialog. Escape closes the dialog and returns focus to its
trigger. The prior photograph stays visible until a requested variant decodes;
a short opacity transition is disabled under reduced motion. No artwork pixels
are transformed, stretched, cropped or animated. Optional captions override the
role label. A pointer-transparent `overlay` slot is reserved for a future approved
artwork layer; this phase supplies no overlay or new botanical experience.

On desktop, the image precedes the metadata in the DOM and occupies the larger
column, with title/dimensions/medium/inquiry beside it. Mobile stacks the image
and controls, then the metadata/story. Mother Nature is featured in the collection
overview, followed by a regular responsive portrait grid of the other nine works.
All approved text, availability, donation language and inquiry behavior remain.
Temporary-image notices are internal `temporary: true` metadata rather than a
repeated visitor-facing label. Provisional artwork copy is still labeled honestly.

### Dragon Lily orientation

IMG_6921.jpg and IMG_6922.jpg had landscape pixel storage and no usable EXIF
orientation. Auto-orient alone did nothing. The upright derivatives apply a 90°
clockwise pixel rotation, placing the easel beneath the canvas, with no crop or
color adjustment. New files are `dragon-lily-{full|angle}-upright-{640|1200}.webp`.
Their dimensions are 640×853 and 1200×1600. EXIF/XMP are removed so an orientation
flag cannot cause a second rotation. Original uploaded JPEGs and previous display
files remain unchanged. The close-up and its original 640×480/1200×900 proportions
are unchanged byte-for-byte. No CSS rotation is used.

### Record and filename conventions

- Artwork IDs/slugs remain stable (`mother-nature`, etc.); never derive them from
  a changing photograph filename.
- `galleryImageId` chooses the overview/main photograph explicitly. It must match
  an image's stable `id`. Fallback order is first `full` image, then first image.
- The `images` array defines thumbnail order: full composition, angled view, details,
  textures, then room context. Keep at least one image for each artwork.
- Roles are `full`, `angle`, `detail`, `texture`, `room`. Labels display as Full
  composition, Angled view, Sculptural detail, Texture close-up and Room-scale view.
  Never imply a room visualization has verified physical scale unless it does.
- Each image has `id`, descriptive `alt`, `role`, optional `caption`, optional
  internal `temporary`, and `variants`. Captions should add context, not repeat
  dimensions/medium. Alt text should describe the specific view.
- File pattern: `{artwork-slug}-{role}-{version}-{width}.webp`, for example
  `artwork-slug-full-final-v1-1200.webp`. Keep source originals separately, immutable.
  Use new versioned filenames to avoid stale cached orientation/content.
- Variant `src` is root-relative; `width`/`height` must be the actual exported pixel
  dimensions. Sort variants by increasing width. Their aspect ratio should match
  for a single image. Current exports use 640/1200; larger final sizes may be added
  when the original supports them. Width descriptors and view-specific `sizes`
  select responsive sources; thumbnails use the smallest appropriate derivative.

### Replacement steps

1. Confirm the painting ID and intended upright orientation from the original.
2. Create WebP derivatives without changing the artwork's color or proportions;
   preserve the full canvas/white border. Normalize pixel orientation and remove
   conflicting EXIF. Do not use CSS rotation or generate substitute artwork.
3. Add files under `public/forest-preview/images/` with the naming convention above.
4. Edit only that image's variants/alt/caption/temporary status in
   `public/forest-preview/collection.json`. Keep its image ID, or update
   `galleryImageId` if deliberately choosing a different primary photo. Reorder
   `images` to change thumbnail order. No component changes are needed.
5. Check overview, main image, thumbnail, swipe and enlarged view at mobile/desktop
   widths. Run tests and build. Remove obsolete derivatives only deliberately;
   never delete the artist's original source photography.

Final professional photographs are still pending. The final painting's dimensions,
medium and provisional copy, and eight availability records, still need artist
confirmation. The client-side Evergreen gate/session flag and indexing restrictions
are unchanged; the existing visibility-deterrent limitations above still apply.
