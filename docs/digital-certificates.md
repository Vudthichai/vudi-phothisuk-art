# Forest & Flowers digital certificates

## Source-of-truth boundary

The printed QR codes are permanent. Do not generate replacement codes or derive a production manifest from artwork slugs. Decode the supplied physical certificate PDFs first. The route paths, trailing slashes, certificate references, edition media, and physical print dimensions must be checked against those originals.

`src/coa/routes.json` is the only certificate route/record manifest. An awaiting-source manifest is deliberately empty: no guessed certificate is advertised as verified. Once all sources are decoded, set status to `verified` and populate exactly 10 original and 5 Collector’s Edition records. `src/coa/records.ts` rejects missing evidence, duplicate routes/references, inconsistent QR URLs, missing physical dimensions, and original dimensions that disagree with the artwork catalog.

All 15 supplied physical PDFs have been decoded and verified. The individual ZIP transfers succeeded after the combined archive exceeded the transfer limit. The checked-in manifest contains exactly the 15 decoded destinations, with their original trailing slashes and source PDF SHA-256 hashes. Dragon Lily’s manifest evidence uses the finalized print-ready PDF. Its confirmed medium and matching description are recorded in the website catalog, and its permanent QR URL is preserved.

## Private ingestion

Keep original COA PDFs and print-production masters outside the repository and `public/`. QR decoding tools are development-only; no new website runtime dependency is required.

```sh
PYTHONPATH=/tmp/vpa-coa-tools python scripts/extract-coa-qr.py /workspace/coa-input --output /workspace/coa-input/qr-evidence.json
```

The decoder uses PyMuPDF, Pillow, and zxing-cpp. It rasterizes existing pages at increasing resolutions, decodes their actual QR symbols, checks 15 distinct HTTPS destinations and the 10/5 split, and saves hashes and extracted text privately. It never generates QR symbols or publishes PDF bytes. Unexpected URL structure is reported rather than silently rewritten.

Review that private evidence and each physical PDF before copying only the verified fields into the manifest. Do not copy owners, signatures, full certificate text, or private filenames into public JSON. No separate serial/reference identifier appears in the supplied physical PDFs. Each exact decoded permanent QR URL therefore serves as its digital certificate reference; no serial number was invented. Original dimensions and medium must describe the original; Collector’s Edition dimensions and medium must describe the print, never be inferred from the original or Studio Print options.

## Reusable implementation

- `src/coa/CertificatePage.tsx`: artwork-specific content, an expandable unsigned digital reference record, original/edition designation, collection link, and optional AR link.
- `src/coa/CertificatePage.css`: scoped, responsive ivory/forest-green presentation using existing fonts.
- `public/forest-preview/collection.json`: canonical original artwork title, photograph, description, medium, and dimensions. Tiger Lily and 75 Leaves are corrected to 18 × 24 in. Their Studio Print options are unchanged.
- `src/seo/catalog.ts`: verified certificate records enter the existing static page generator, producing a separate `index.html` for each exact permanent route. Existing directory/Pretty URL routing handles direct opens and refreshes; no SPA fallback or replacement QR is added.

The digital record is HTML, not a downloadable signature-ready PDF. It explicitly does not replace a signed physical certificate or verify ownership. Collector’s Edition URLs describe the edition of 20, not an individual copy number. The original painting photograph is identified as an artwork reference on edition pages; it does not impersonate print-product photography.

`arUrl` is optional. Leave it absent until a working, tested HTTPS AR destination is approved. No inactive AR button is rendered. Future descriptions, video, or AR can be changed behind the permanent certificate URL without changing any printed QR.

## Preview and validation

```sh
npm run dev -- --host 0.0.0.0
npm run typecheck
npm test
npm run build
npm run test:seo
npm run test:coa
```

Open a path copied directly from the verified manifest on the local preview. Check direct opening, refresh, trailing slash, correct photograph, dimensions, designation, reference, digital disclosure, keyboard use, and 320/390/1440px layouts for all 15 records. Before deployment, repeat HTTP checks against the approved Netlify preview; a Vite development server alone cannot establish edge redirect behavior.

No production deployment or merge is authorized by this implementation task.

## Verified permanent route manifest

| Exact path | Physical dimensions | Medium | Review |
|---|---|---|---|
| `/coa/forest-and-flowers/75-leaves/collectors-edition/` | 9 × 12 in. | Limited-edition print | PDF checked |
| `/coa/forest-and-flowers/75-leaves/original/` | 18 × 24 in. | Mixed-media acrylic with organic plaster on canvas | PDF checked |
| `/coa/forest-and-flowers/a-forest-forgotten/collectors-edition/` | 9 × 12 in. | Limited-edition print | PDF checked |
| `/coa/forest-and-flowers/a-forest-forgotten/original/` | 24 × 36 in. | Mixed-media acrylic with organic plaster on canvas | PDF checked |
| `/coa/forest-and-flowers/blooming-desire/original/` | 24 × 36 in. | Mixed-media acrylic with organic plaster on canvas | PDF checked |
| `/coa/forest-and-flowers/dragon-lily/original/` | 18 × 24 in. | Mixed-media acrylic with organic plaster on canvas | Final PDF checked |
| `/coa/forest-and-flowers/ethereal-bloom/collectors-edition/` | 9 × 12 in. | Limited-edition print | PDF checked |
| `/coa/forest-and-flowers/ethereal-bloom/original/` | 30 × 40 in. | Mixed-media acrylic with organic plaster on canvas | PDF checked |
| `/coa/forest-and-flowers/gilded-bloom/original/` | 24 × 36 in. | Mixed-media acrylic with organic plaster on canvas | PDF checked |
| `/coa/forest-and-flowers/moss-and-mushrooms/original/` | 30 × 40 in. | Mixed-media acrylic with organic plaster on canvas | PDF checked |
| `/coa/forest-and-flowers/mother-nature/collectors-edition/` | 9 × 12 in. | Limited-edition print | PDF checked |
| `/coa/forest-and-flowers/mother-nature/original/` | 24 × 36 in. | Mixed-media acrylic with organic plaster on canvas | PDF checked |
| `/coa/forest-and-flowers/tiger-lily/collectors-edition/` | 9 × 12 in. | Limited-edition print | PDF checked |
| `/coa/forest-and-flowers/tiger-lily/original/` | 18 × 24 in. | Mixed-media acrylic with organic plaster on canvas | PDF checked |
| `/coa/forest-and-flowers/wild-tiger-lilies/original/` | 24 × 36 in. | Mixed-media acrylic with organic plaster on canvas | PDF checked |

The physical Moss and Mushrooms certificate spells out “and”; the page retains the existing canonical website title “Moss & Mushrooms” and its exact decoded `moss-and-mushrooms` URL. No original descriptions, availability, or prices were changed.

## Verification results

- All 15 existing QR symbols were decoded from the supplied physical PDFs; no QR was generated or replaced.
- The production build generates 55 static HTML routes: the original 40 pages plus all 15 certificate destinations.
- Local production-output checks passed for all 15 paths and their slashless variants (30 HTTP checks), plus browser checks of all 15 pages at 390px and 1440px (30 cases). Mobile refreshes and representative 320px layouts passed with no overflow or browser errors.
- Keyboard activation of the digital-record disclosure passed. No inactive AR links or master-PDF download links were present.
- All five existing Studio Print products retained the $45/$95 size-selection behavior. Both corrected original detail pages retained Not for Sale status.
- All 139 tests, TypeScript, the production build, SEO validation, and `npm run test:coa` passed.
- Browser validation used Chromium with mobile emulation; physical Safari hardware was not tested. The certificate routes are deployed. Changes to their content reach production after an approved merge and release. Local directory routing does not certify Netlify edge behavior; check the review deployment before release.

For a local preview, run `npm run dev -- --host 0.0.0.0` and open `http://localhost:5173/coa/forest-and-flowers/mother-nature/original/`. Replace the path with any exact entry from the table above. Development previews and website deployment do not expose or require the private physical PDFs.
