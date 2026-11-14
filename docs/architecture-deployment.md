# Architecture and deployment

Verified 2026-11-14; SEO baseline `9b209df`.

## Rendering

The existing React/Vite application is retained. `App.tsx` is used by both BrowserRouter and build-time StaticRouter. Vite builds the browser bundle, then the SSR entry into `.prerender/entry-server.js`; `scripts/write-sharing-pages.mjs` renders each catalog-derived route into `dist/<route>/index.html`.

These files contain the same page components, artwork photographs, visible copy, navigation and inquiry links as the browser application. JavaScript hydrates the existing markup; it does not replace it with a separate SEO template. Layout/media preferences start deterministically and update in effects so hydration works across mobile/reduced-motion settings. Development with an empty root still uses `createRoot`.

`RouteMetadata` updates title, description, canonical, social tags and JSON-LD after client navigation. Existing component title effects remain compatible; the shared metadata effect follows the page route tree.

The former generic noscript heading is removed because full page content is now present without JavaScript. Interactive features still require JavaScript.

## Commands

- `npm ci` (Node 24 recommended; repository minimum 22.12).
- `npm run dev -- --host 0.0.0.0`: development SPA.
- `npm test`: existing component/navigation suite.
- `npm run build`: TypeScript + client assets + build-time static generation.
- `npm run test:seo`: generated artifact validation; run after build.
- `npm run test:http -- <base-url>`: read-only route/status checks against Netlify Dev or an approved preview.
- `npm run test:browser -- <base-url>`: optional Playwright browser checks; see validation instructions for tooling.
- `npm run preview`: Vite preview is useful for appearance, but **does not emulate Netlify redirects/status rules**.

No new runtime packages or framework were introduced. `.prerender` and `dist` are generated/ignored. `dist` is the only publish directory; the server bundle is not deployed.

## Hosting and HTTP contract

`netlify.toml` keeps the existing Node/build/publish settings. The old wildcard HTTP-200 SPA rewrite is removed. Generated `dist/_redirects` contains:

1. Exact 301 redirects for each catalog `sourceUrl` path, with and without trailing slash.
2. A non-forced `/* /404.html 404` fallback. Existing static files shadow this rule.

`301!` means forced legacy redirection. Targets always differ from sources and point directly to existing static routes. Sitemap and canonical/social URLs use the same trailing-slash policy. Netlify normalizes slashes before matching redirect rules, so explicit `/page` → `/page/` rules are deliberately avoided: they can loop. Directory/Pretty URL handling is left to the host. Netlify Dev serves both forms with HTTP 200 and the same trailing-slash canonical; production was observed to redirect to the directory form during audit, and must be rechecked after an approved release. Unknown paths retain the requested URL and receive the 404 document/status. The 404 has no canonical or schema and contains `noindex`; `_headers` additionally marks `/404.html` noindex.

Do not add a second SPA fallback in the Netlify UI. Unknown client-side navigation can display NotFound/noindex but cannot retroactively change an already received HTTP status; direct network requests are the authoritative status check.

## Release boundary

Production HTTPS and apex/www convergence were verified read-only during audit. Netlify headers are present. The exact production site ID, deployed SHA and release method are not yet independently verified through the hosting account. Current source commits contain `[skip netlify]`; observed live metadata/sold status do not establish a particular automatic deployment process.

This branch must not merge or deploy without approval. Its commits retain `[skip netlify]`; do not remove that marker to obtain a preview. After separate preview authorization, verify all route/status rules with the real Netlify edge and test social crawlers. Domain/DNS, Squarespace and commerce settings remain outside scope.
