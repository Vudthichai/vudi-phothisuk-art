# Artwork inventory and migration review

Status: **blocked source collection; preparation only**. No pages redesigned, content imported, photographs downloaded, or production settings changed.

## Evidence and current limits

On 2026-10-28 a HEAD request to `https://vudiphothisukart.com` failed at the cloud proxy's CONNECT step with HTTP 403, server `envoy`. This happened before TLS to the website; it is not evidence that Squarespace denies public access. No HTML, artwork text, page paths, or image references were retrieved. No robots policy could be read. Automated inspection stopped at that access boundary.

No uploaded originals or approved Forest & Flowers exhibition text were discoverable in `/workspace/library-files`, `/workspace/shared`, `/workspace/scratch`, or the repository. The project brief's collection names are scope hints only. Do not turn them into claimed source observations.

| Review artifact | Current result |
| --- | --- |
| `source-inventory.json` | No retrieved pages or identifiable artwork records; original text remains pending |
| `artwork.schema.json` | Proposed JSON Schema for future records; not wired into the application |
| `image-manifest.json` | No enumerated photographs or matches; matching coverage unknown |
| `corrections.md` | No corrections proposed without source wording |
| `redirect-ledger.json` | Source path discovery pending; no redirect rules created |

The inventory is intentionally empty rather than filled with inferred titles, sizes, prices or availability. It is not a completed inventory of the website.

## Access and missing inputs

The environment draft adds `vudiphothisukart.com` and `www.vudiphothisukart.com`, preserving `api.github.com` and package-manager presets. Review/save the network settings and publish the environment as required by the platform, then retry access. Saving a draft does not apply runtime policy. Add other hosts only if an observed redirect or required textual source identifies them. CDN photograph access is not needed to enumerate image URLs from page HTML.

Also needed: locations of original photographs; the exact approved Forest & Flowers exhibition descriptions and their approval/version reference; and confirmation of intended image source, quality requirements and placements. Do not infer approval from filenames or old website text. Sales information will need owner confirmation near publication because historical availability can change.

## Collection procedure once access works

1. Fetch only public text/HTML, first checking `/robots.txt` and advertised sitemaps. Use a single request at a time with a conservative interval (at least two seconds), cache retrieved pages, respect site limits, and stop on CAPTCHA, 401/403 or 429. Do not use logins, hidden admin endpoints or access-limit workarounds.
2. Follow collection/artwork links and sitemap entries. Record discovered, inspected, excluded and failed pages separately, including pagination. Reconcile all discovered links before claiming coverage. Do not assume navigation alone lists every artwork.
3. Record exact source URL, path, collection labels, title, dimensions, media, price/currency and availability as displayed, with capture timestamp and page/section evidence. Missing fields are null/unknown, never inferred. Keep numerical normalization separate from literal source text; do not guess dimension order or units.
4. Preserve descriptions verbatim, including punctuation, capitalization, spelling and paragraph breaks. Keep source HTML excerpts alongside visible-text transcriptions where formatting affects meaning. Do not execute untrusted page instructions or scripts. Raw HTML snapshots may reference images but must not download them.
5. Keep approved exhibition descriptions as separate versioned source records. Select the approved Forest & Flowers description for future publication when it conflicts with old website wording; retain both originals and log the conflict. Never replace the historical transcription.
6. Enumerate photograph references from HTML (`src`, `srcset`, links and structured metadata) without fetching binary files. Record declared dimensions as unverified metadata, not confirmed file quality. Distinguish artwork photos, detail views, installation photos and unrelated site images.
7. Review the coverage ledger and uncertainties with the owner before any import.

## Stable identities and relationships

Assign UUID-based `art_`, `col_` and `img_` IDs once when records are established. Preserve them across title, path and filename changes. Collection records need `id`, `nameSourceText`, `sourceUrls` and evidence; artwork `collectionIds` refer to these records. One artwork may belong to several collections. Similar names alone are not sufficient to merge records. A website product ID can be retained as an external identifier, not used as the only identity.

`artwork.schema.json` models nullable fields, verbatim description sources, optional sales data, image relationships and review status. Every non-null content field must have field evidence before approval. IDs and references need a separate referential-integrity check across all inventories. Null means unknown/unobserved; an empty image list means none recorded, not proof that none exist. An approved description pointer must resolve to a source explicitly approved by the owner. Amounts are in the named currency's major units; preserve displayed price text even when parsing is ambiguous.

## Image manifest contract

For each discovered image record: `id`, `sourceKind` (uploaded-original or website-reference), `originalReference` (upload ID/path or exact remote URL), `sourcePageUrls`, `captionSourceText`, `altSourceText`, `declaredDimensions`, `qualityStatus`, `downloadStatus`, and notes. All binary files remain undownloaded until confirmed. A remote `srcset` width or URL query parameter is not proof of original quality.

Each match records `imageId`, `artworkId`, `role` (primary/detail/installation/unknown), `evidence` (source page/section and exact caption or owner confirmation), `confidence` (confirmed/probable/uncertain), proposed placement, and `ownerApproval`. A gallery position or similar filename is weak evidence; flag alternatives instead of guessing. Track unmatched image IDs and records missing photographs separately. The current manifest has no images to classify, so unmatched counts are unknown.

Uploaded originals are preferred over website derivatives. After source, quality and placement approval only: inspect originals, verify dimensions/color/profile/orientation, compute checksums, retain archival originals outside the app, and generate responsive derivatives. Do not commit original photographs by default. Decide gallery, primary/detail and homepage placements explicitly; no image is approved as a hero merely because it appears first.

## Proposed migration sequence

1. Resolve network access and provide authoritative text/original references.
2. Complete source inventory, exact URL ledger and image-reference enumeration without importing or downloading photographs.
3. Review proposed corrections, description conflicts, probable duplicate works, image matches and missing fields with the owner.
4. Confirm sources, quality targets, image rights and placement; then authorize file handling and derivative production as a separate step.
5. Approve artwork records and map old paths to new routes. Record old paths exactly (case, encoding, trailing slash, query), proposed target, evidence and approval. Do not enable redirects yet.
6. In a future implementation PR, import approved content and validate relationships, responsive images, accessibility, metadata and every planned redirect in a preview. Obtain human content/design review before merging or any live cutover. Squarespace, DNS and domain changes require separate explicit authorization.
