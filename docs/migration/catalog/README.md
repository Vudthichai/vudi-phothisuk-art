# Artwork catalog — Phase 1

This is source inventory for human review, not imported portfolio content. No application, Squarespace, DNS or Netlify settings changed. No photographs fetched, extracted from the uploaded ZIP, or committed.

## Coverage and provenance

The public sitemap lists 32 URLs. We inspected `/home`, three collection pages and 15 standalone artwork pages. The sixteenth (`/ciaran`) returned HTTP 429. A collaboration-caption recapture also returned 429; all further site requests stopped. See `coverage.json` for inspected, excluded and failed paths. This is a partial inventory, not proof of complete website or physical-artwork coverage.

| Collection | Identifiable records | Detail coverage |
| --- | ---: | --- |
| Forest & Flowers | 0 | Not found in sitemap or inspected navigation; no speculative URLs or artwork invented |
| The Oceans | 11 | All 11 standalone pages captured |
| The Regal Collection | 5 | 4 standalone pages captured; Ciaran details blocked by rate limit |
| Canvas Collaborations | 7 named projects | Names observed in preceding public inspection; exact caption recapture pending. Projects may contain multiple canvases |

`inventory.json` groups records by collection and preserves published text as paragraph strings and separate technical/sales wording. Description paragraphs sometimes begin with the title and a colon; that is intentional source preservation. Do not remove that prefix or alter trailing spaces. HTML snippets in `sources/*.json` preserve inline formatting and paragraph boundaries; rendered text extraction decodes HTML entities without editorial changes. These are HTML-derived source snapshots, not screenshots or complete page archives. The source timestamp records collection run time in UTC. Collaboration title evidence is explicitly the preceding inspection transcript, not a newly archived caption.

`image-manifest.json` contains 56 distinct image URLs associated with retrieved artwork pages. Declared dimensions, alt text, focal points and other HTML attributes are metadata claims, not verified binary properties. Collection/homepage image references also remain in their source snapshots; not all are assigned to works. No visual matches have been checked. `redirect-ledger.json` preserves all 32 exact sitemap URLs/paths and leaves future destinations unassigned.

## Identity and data model

`model.ts` provides React-compatible TypeScript interfaces without coupling the catalog to the UI. UUIDv5 IDs are assigned from initial source keys; freeze these IDs when URLs or titles change rather than regenerating identity from a new name. A collaboration project ID identifies the project, not a confirmed single physical canvas. Split project/canvas entities after owner review if necessary. Multiple artworks may reference the same image record. Missing values are null or explicitly empty; inquiry text never implies availability. “Sold” is historical website wording, not independently confirmed current inventory.

Descriptions are not approved publication copy. No approved exhibition descriptions were supplied. When provided, retain both sources and select the approved Forest & Flowers exhibition version for future publication. Do not overwrite historical source paragraphs.

## Image-to-artwork matching plan

1. Use the uploaded `VPA Website Update.zip` as the candidate original source when file handling is authorized. This phase does not open or download it.
2. Enumerate collection folders and filenames; assign stable original-image IDs. Filenames and folder membership are clues, not sufficient visual evidence.
3. Match candidate originals against website references after image access is confirmed, comparing composition, texture, crop, orientation and distinctive marks. Record supporting page URL, candidate original path, evidence, confidence and competing matches. Distinguish full artwork, detail, installation, collaboration video still and unrelated photo.
4. A current manifest match means only “this image element occurs on this artwork page.” Quality, visual identity, primary/detail role and future placement remain unapproved. Never select the first image automatically as a hero.
5. Ask the owner to resolve uncertain matches and confirm source, quality and placement before downloading/processing images. Prefer approved originals over Squarespace derivatives. Record derivative provenance/checksums only after authorized handling.

## Next migration steps

Respect robots.txt and site throttling. Resume only after a meaningful cooldown or owner-provided source export; do not retry around a 429. Capture Ciaran and the exact collaboration captions first, then inspect the event/history pages excluded from this phase for additional works and Forest & Flowers references. Reconcile remaining sitemap/navigation links and log duplicates and omissions before claiming completeness.

Resolve `missing-information.md`, review `editorial.md`, approve descriptions and image matches, then plan old-to-new redirects. Import approved records and image derivatives in a later PR. Test in a preview; human content and visual approval are separate from CI success. No live cutover or automatic merge is authorized here.

## Validation

From the repository root:

```sh
python3 scripts/validate-catalog.py
npx tsc --noEmit --strict --skipLibCheck --target ES2022 --moduleResolution bundler --module ESNext --resolveJsonModule --allowSyntheticDefaultImports docs/migration/catalog/typecheck.ts
```

The validator checks source-paragraph fidelity, unique IDs, references, collection membership, source paths, and undownloaded/unapproved image flags entirely offline. It cannot validate unseen images or certify completeness. The TypeScript check verifies the actual JSON inventory and manifest against `model.ts`.
