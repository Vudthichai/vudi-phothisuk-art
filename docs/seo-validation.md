# SEO/GEO validation evidence

Verified **2026-11-14** on `feature/seo-geo-foundation`, starting from `9b209df`. No merge, deployment or production setting changes were performed.

## Checks and results

| Check | Result |
| --- | --- |
| `npm run build` | Passed: TypeScript, Vite client build, Vite SSR bundle, static generation. 35 public routes and a separate 404 document. |
| `npm test` | 14 files, 90 tests passed (82 existing plus eight analytics tests). Existing navigation, mobile, artwork, gallery, availability and motion checks retained. |
| `npm run test:seo` | Five artifact suites passed, covering every public page: unique titles/descriptions, canonical/social tags, meaningful initial HTML, linked JSON-LD, asset existence, XML parsing/namespaces/image entries, crawler groups, migration rules and incomplete facts. |
| `npm run test:http -- http://localhost:8888` | Passed against local Netlify Dev: all 35 canonical routes and slash variants return/converge to HTTP 200 with matching canonicals; 32 catalog-backed legacy aliases return 301 to the correct existing route; three unknown/nested/missing-asset requests return HTTP 404/noindex without canonical; sitemap/robots return correct content types. |
| `npm run test:browser -- http://localhost:8888` | Passed with temporary Playwright tooling and Chromium 154. Eleven representative direct routes; client navigation updates title/canonical/social/schema; desktop and 390px mobile menu/viewer checks; Escape and inquiry links; no hydration or application errors. Artwork heading/story visible with JavaScript disabled. |
| Visual comparison | Separate `git archive` build of baseline `9b209df`; six routes at 1440×1000 and 390×844, reduced motion, fonts/eager images ready. All 12 before/after viewport screenshot pairs pixel-identical. Heading geometry identical; no horizontal overflow. |
| Design/assets/catalog preservation | Initial SEO pass compiled CSS byte-identical to baseline (`index-B7unbGMz.css`). GA4 follow-up adds scoped consent styles only; no existing style rules, artwork data, photography, prices, availability, typography or inquiry destinations changed. |
| `git diff --check` | Passed. |

Visual routes: homepage, Forest & Flowers, Mother Nature, The Oceans, Beach Day, Exhibitions. Screenshots cover opening viewports, not exhaustive full-page/interactivity states. Direct browser checks additionally cover Dragon Lily, Sahara, About, Contact and Available Art. A mobile photograph button opens the viewer; the desktop-only enlarge caption is intentionally hidden by existing CSS on mobile.

Temporary evidence files are under `/tmp/vpa-seo-evidence/` in this task environment, not committed or published. Example: `collections--forest-and-flowers--mother-nature-390-after.png`. Temporary tooling was installed outside the repository; no new dependency/framework or lockfile changes.

## Reproduce the local hosting check

After `npm ci` and `npm run build`, use Netlify CLI to serve `dist`:

```sh
netlify dev --offline --dir dist --port 8888 --framework '#static' --no-open
npm run test:seo
npm run test:http -- http://localhost:8888
```

In this managed environment, CLI 27.19.0 attempted to download an Edge Functions runtime despite `--offline` and failed. There are no Edge Functions in this project. Local testing therefore used the CLI's `--internal-disable-edge-functions` flag to exercise its static file/redirect proxy without that unrelated runtime. This is a local test flag, not a repository or production setting.

Netlify Dev does not perfectly reproduce edge Pretty URL behavior. It serves both directory slash forms with HTTP 200; both advertise the same trailing-slash canonical. The production audit observed slashless → slash 301s. **Do not add explicit slash-only redirect rules:** Netlify's normalized redirect matching can loop. Recheck actual edge normalization after a separately approved preview/release.

The browser check optionally loads `playwright` or a module URL from `PLAYWRIGHT_MODULE`; `CHROMIUM_PATH` optionally selects a system browser. Example used here after a temporary user-local Playwright install:

```sh
PLAYWRIGHT_MODULE=file:///tmp/vpa-seo-tools/node_modules/playwright/index.mjs \
CHROMIUM_PATH=/usr/bin/chromium \
XDG_CONFIG_HOME=/tmp/vpa-chrome-config XDG_CACHE_HOME=/tmp/vpa-chrome-cache \
npm run test:browser -- http://localhost:8888
```

The existing site has no favicon declaration/file. The browser check excludes only an implicit `/favicon.ico` console 404; missing page artwork and hydration/application errors are not ignored. No new favicon/design decision was introduced.

## Structured data and data gaps

JSON syntax, entity links, schema types, catalog-derived values and known event details are checked locally. Dragon Lily omits unknown medium/size and provisional description from VisualArtwork; eight unconfirmed Forest availability records produce build warnings. No offers, guessed dimensions, prices, sale status, credentials, shipping policies, artist business address or admission information are emitted.

Full hosted Schema.org/Google rich-result inspection remains a post-preview task. VisualArtwork semantics do not imply rich-result eligibility. No URL submission, indexing request or public search-account change was made.

## Performance and remaining limits

- Browser tests use desktop Chromium and a 390px viewport, not physical iOS/Android devices, touch hardware, assistive technology or a full browser matrix. Reduced-motion screenshots do not prove all animations or gestures.
- No field Core Web Vitals, production mobile throttling score or real-user performance result is claimed. Current JS is about 417.64 kB / 124.27 kB gzip versus baseline 406.24 kB / 121.02 kB gzip: approximately +3.25 kB gzip. CSS is unchanged. Initial HTML now includes visible content and schema (representative uncompressed pages: homepage ~12 kB, Mother Nature ~16 kB, Oceans collection ~28 kB).
- No hosted preview was deployed because the owner explicitly prohibited deployment. Local Netlify checks are production-like, not proof of final edge behavior, UI-config overrides, production DNS, indexing or crawler inclusion.
- Search Console, Bing Webmaster Tools, GA4 and Netlify account-level verification remain pending. Sitemap submission and analytics installation must follow verified account access and approved release.

## GA4 follow-up validation — 2026-11-14

Owner confirmed `G-0S3J4CK8RP`, approved the small notice and confirmed Enhanced measurement OFF. Eight analytics tests cover consent/storage/StrictMode, route transitions and safe payloads, intent-only clicks, withdrawal, privacy signals and exclusions. Existing 82 tests remain unchanged.

`CONTEXT=production BRANCH=main npm run build` was tested through `scripts/check-analytics-browser.mjs --production` using intercepted local fixtures at the production origin. Tests passed for zero tag requests before acceptance, exactly one loader and initial view, one view per navigation/back, catalog-only inquiry events, no lead/sale events, safe URL values, withdrawal/cookie deletion, saved decline, localhost/preview exclusions and GPC. All requests were intercepted; Google's real library was replaced by a command recorder, and no Google or live-site traffic occurred. A separate deploy-preview build stays disabled even at the production origin with saved acceptance. The final workspace was restored to an ordinary disabled build.

The enabled production fixture measured approximately **424.01 kB JS / 126.62 kB gzip**, compared with the pre-GA4 SEO fixture **417.64 kB / 124.27 kB gzip**: about **+2.35 kB gzip**. Scoped consent CSS adds about **0.24 kB gzip**. No dependency or artwork image changes. Google's asynchronous external script loads only after acceptance; its actual payload/performance, GA4 ingestion/reports and field Core Web Vitals require an approved live release.

A mobile consent notice screenshot is available at `/tmp/vpa-ga4-consent-mobile.png` in this task environment (not published). Local/previews show neither tag nor consent controls. The gallery's existing markup/photography/links remain unchanged apart from nonvisual catalog-identification attributes on inquiry links. All 12 viewport comparisons were rerun after the GA4 addition with analytics disabled and remained pixel-identical to the original baseline. The existing HTTP and browser/JS-disabled checks also passed again. Before release, review the owner's privacy disclosure/account retention settings. Do not enable Enhanced measurement alongside manual tracking.
