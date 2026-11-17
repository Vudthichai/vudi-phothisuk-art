# Studio Edition print photography revision

## Approved assets

The artist supplied five individual JPEG ZIPs after the combined archive exceeded
the workspace transfer limit. Each source is 4,687 × 6,249. Artwork titles printed
on the designs were checked against the corresponding painting and catalog ID:
Mother Nature (MN), Ethereal Bloom (EB), Tiger Lily (TL), 75 Leaves (75L), and
A Forest Forgotten (AFF). These supplied print designs replace the original
painting photographs **only in Studio cards**. They are not presented as newly
photographed physical samples.

Original uploads are preserved outside the repository at
`/workspace/studio-print-sources/`, not in Vite's public directory, imported
application assets or deploy artifacts. These workspace copies are not a permanent
backup; the artist should retain their own original files. Source names and SHA256
checksums are recorded in `studio-print-photographs.json` without master-file URLs.

WebP derivatives use longest edges 640, 1,280 and 1,920 (widths 480, 960 and 1,440),
quality 92. EXIF orientation was honored; no crop, border removal, tonal edits,
sharpening, generated imagery or branding changes were applied. Source files have
no embedded ICC profile; no guessed color adjustment was applied. Entire supplied
borders, title, logo and artist signature remain visible with object-fit: contain.
Small variants are 123–143 KB, medium 442–533 KB, and largest 905–1,125 KB (decimal).
The browser selects from responsive sources; images load lazily with explicit
intrinsic dimensions. Existing image-only drag/menu deterrents are preserved.

## Presentation

The shared Studio Editions section now has one heading. Each of its five cards
contains only the approved print design, title, $40 and Coming Soon. Image/title
links lead to the existing artwork's Studio Edition anchor. The previously approved
five-print bundle remains a compact title with $175 — Coming Soon; no extra tiers.

On the five artwork pages the supplementary panel contains only
“Studio Edition Print” and “$40 — Coming Soon”. Original artwork photography,
acquisition information, Not for Sale statuses, pricing, descriptions, navigation,
SEO and collection membership are unchanged. No payment controls are introduced.

Charity intentions remain in `src/studio/editions.ts`, with pending approval and
an undecided veterans beneficiary. They are no longer rendered in Studio cards or
the simplified artwork-page panel. Final detail-page wording and terms remain
unapproved. Existing original-artwork charitable statements are unchanged.

## Review locally

Run `npm run dev`, then open `/available-art/#studio-editions`,
`/collections/forest-and-flowers/#studio-editions`, and each eligible artwork
page's `#studio-edition` anchor. Production checkout remains inactive.

This revision supersedes the earlier Studio reference-photo and public charity
presentation described in `studio-editions.md` and the initial card-resolution
measurements in `artwork-image-protection.md`. The earlier public-source exposure
findings still apply; no pre-existing artwork assets were removed or changed.

Do not merge or deploy this revision without explicit artist approval.
