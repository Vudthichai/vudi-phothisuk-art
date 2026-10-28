# Vudi Phothisuk Art

Milestone 1: a React, Vite, TypeScript and CSS portfolio foundation. All dependencies are free and open source. No backend, API keys or paid services are required.

## Develop

Use Node.js 24 (minimum 22.12) and npm. In this checkout:

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

`npm run typecheck` checks TypeScript; `npm test` runs component/navigation tests; `npm run build` type-checks and produces `dist/`; `npm run preview -- --host 0.0.0.0` serves that build for local checking. Use the existing checkout; a new worktree is unnecessary.

## Structure

- `src/main.tsx`: shared layout and routes.
- `src/components/`: navigation/layout, reusable gallery and artwork cards.
- `src/pages/Pages.tsx`: homepage, collection framework, information pages, not-found handling and per-page titles/descriptions.
- `src/data.ts`: typed collection and artwork records. Artwork arrays intentionally remain empty until verified assets and details are supplied.
- `src/styles.css`: responsive desktop, tablet and mobile layouts, keyboard focus styles and reduced-motion support.

Collection URLs: `/collections/forest-and-flowers`, `/collections/oceans`, `/collections/regal-collection`, `/collections/canvas-collaborations`. Supporting pages: `/available-art`, `/about`, `/exhibitions`, `/contact`.

The homepage visual is explicitly an empty photography placement, not an artwork. Do not invent artwork details, availability, contact information or exhibition history. No audio or complex animations are implemented.

## Images and search

Add authorized images to `public/artworks/` and verified records to `src/data.ts`. Export appropriately compressed AVIF/WebP variants, provide meaningful alt text and intrinsic dimensions, and populate `srcSet` and `sizes` for responsive delivery. Cards use native lazy loading and asynchronous decoding. Do not lazy-load a future above-the-fold hero image; give it priority. There are currently no artwork files to optimize.

Page titles and descriptions update on navigation, with default HTML metadata. This milestone is a client-rendered SPA: route-specific social previews and metadata for crawlers that do not execute JavaScript require future prerendering. Add canonical URLs and a sitemap only after the production domain is approved.

## Netlify deployment

Create a separate development site or use a Deploy Preview for this branch. Do not connect the existing live domain, alter DNS, or change Squarespace. `netlify.toml` sets Node 24, `npm run build`, `dist`, and an SPA rewrite so direct collection URLs load successfully. No environment variables are needed.

After deploying a preview, open a collection URL directly and refresh it; check navigation, mobile layout, keyboard focus and metadata. The wildcard rewrite serves the SPA for unknown URLs too; React displays its not-found screen (HTTP status remains 200).

Review the draft PR before merging. Publishing to the live domain and replacing Squarespace are separate future approvals.
