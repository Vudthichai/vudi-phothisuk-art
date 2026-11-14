# Vudi Phothisuk Art — project context

Last verified: **2026-11-14**. Read this file and `AGENTS.md` before changing the project.

## Current baseline and approval boundary

- Repository: https://github.com/Vudthichai/vudi-phothisuk-art; default branch `main`.
- This SEO/GEO phase starts from verified `origin/main` **9b209df1716e694985a31305b76c9053bb720c59** (2026-11-12, Beach Day marked sold).
- The starting cloud `work` checkout was clean at `0110e0c`, seven commits behind. It was preserved; `feature/seo-geo-foundation` was created directly from fetched `origin/main`.
- Technical implementation and a draft PR are authorized. **Merging, deployment, domain/DNS/forwarding, production settings and commerce changes are not authorized.** No deployment accompanies this phase.
- Recent commits use `[skip netlify]`. Keep this marker on this phase's commits to suppress automatic Netlify builds. A merge/release must be separately approved; never infer the deployed SHA from Git history alone.

## Architecture and sources of truth

- React 19, React Router 7, TypeScript, Vite; existing CSS and component layouts remain the visual implementation.
- `src/App.tsx`: shared route tree. `src/main.tsx`: browser hydration (or fresh rendering in development).
- `src/entry-server.tsx`: build-time React rendering of the same application, with `StaticRouter`.
- `src/data.ts` assembles collections. **Do not maintain a second catalog.**
- `src/oceans.json`: eleven Oceans paintings; `src/regal.json`: five Regal paintings.
- `public/forest-preview/collection.json`, imported via `src/forest/collection.ts`: ten public Forest & Flowers paintings. The directory name is historical; these images are used publicly.
- Public routes: homepage, collection index, three collections, 26 artworks, Available Art, About, Exhibitions, Contact (35 pages total).
- Available Art currently includes confirmed available Oceans/Regal records only. Forest inquiry records use a different availability model; changing this policy needs artist confirmation.
- Catalog `sourceUrl` values are historical provenance; SEO derives legacy redirects from those values and does not treat them as current canonicals.

## Brand and preservation

Premium, elegant gallery experience; Bodoni Moda with existing supporting fonts; forest green `#12351d`, warm ivory `#f7f5ef`; Make Some Art Today (MSAT), authentic signature and floral monogram.

Preserve artwork titles, symbolism, descriptions, pricing, dimensions, availability, and original imagery. Do not generate/repaint artwork, guess corrections, crop away canvas borders, or imply verified room scale. Preserve original photos; generate derivatives only when authorized. See `AGENTS.md` for the full rules.

## Build, deployment and SEO

See [architecture and deployment](docs/architecture-deployment.md), [SEO/GEO decisions](docs/seo-geo.md), and [validation evidence](docs/seo-validation.md).

- Node 24; `npm ci`; `npm test`; `npm run build`; `npm run test:seo` after the build.
- Netlify configuration: `netlify.toml`; build `npm run build`, publish `dist`.
- Build creates client assets, a temporary ignored `.prerender` server bundle, and static HTML, sitemap, robots, headers and redirects in ignored `dist`.
- Canonical host: `https://vudiphothisukart.com`; trailing slash for HTML pages.
- `src/seo/catalog.ts` derives route metadata, structured data, image sitemap entries and verified legacy aliases from existing catalog data.
- `scripts/sharing-previews.json` holds curated sharing image/alt choices only. Descriptions and artwork facts are not duplicated there.
- GA4 direct tag implementation added to PR #60 with owner-confirmed ID `G-0S3J4CK8RP` (stream: Vudi Phothisuk Art — Website). Owner confirmed Enhanced measurement OFF and approved the consent notice on 2026-11-14. No GTM or verification tokens. Not deployed; live collection remains unverified.
- Analytics requires Netlify production/main build, exact HTTPS apex origin, and visitor consent; local/preview builds are disabled. Keep Enhanced measurement OFF: page views are manual and deduplicated. No ad consent, URL query/hash values, mailto contents, custom PII or sale/lead claims. See `docs/analytics-growth.md` for events, disclosure, withdrawal and verification.

## Completed in this phase

Static initial HTML for all public routes; unique standard/social metadata; canonical consistency on direct loads and client navigation; image sitemap; explicit search/training crawler separation; source-backed legacy redirects; HTTP 404 configuration; artist/artwork/collection/breadcrumb/exhibition schema; catalog warnings; recovery documentation and validation checks. Follow-up on the same PR adds consent-gated production-only GA4, safe catalog events, analytics tests and account verification guidance.

## Remaining work / unresolved facts

- Verify Netlify site ID, deployed SHA, release method, domain aliases, deploy context restrictions, and real edge routing when a preview/release is approved. Do not alter production settings.
- Dragon Lily: dimensions and medium missing; copy provisional. Eight Forest availability records remain unconfirmed. Build reports these; no guessed facts or offers are emitted.
- Open historical draft PRs at inspection: #2 source inventory, #19 contact photo edge treatment. They have not been merged or assumed approved.
- Verify Google Search Console and Bing Webmaster Tools ownership; submit sitemap only after approved release; inspect indexing and Google-selected canonicals. Public search checks are not proof of index status.
- GA4 account/property/stream and Enhanced measurement OFF are owner-confirmed. Review remaining account-side privacy/retention/tag settings and verify real delivery only after approved release. Local tests intercept Google traffic; no live hits were generated. See [measurement and remaining work](docs/analytics-growth.md).
- Actual search/AI inclusion, field Core Web Vitals, physical mobile testing and hosted rich-result testing remain external validation tasks.

## Historical documentation

Older `docs/private-forest-collection.md`, `docs/homepage-direction.md` and early milestone notes are historical, not current deployment/catalog instructions. The private Forest gate was removed before this phase. Use source, current context and dated validation first; preserve older notes as decision history.
