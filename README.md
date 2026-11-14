# Vudi Phothisuk Art

Existing React/Vite/TypeScript art portfolio deployed on Netlify. Start with [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) and [AGENTS.md](AGENTS.md); older development notes may describe superseded states.

Use Node 24 (minimum 22.12) and npm:

```sh
npm ci
npm run dev -- --host 0.0.0.0
npm test
npm run build
npm run test:seo
```

The build generates static HTML for the existing public React routes, standard/social metadata, JSON-LD, an image sitemap, robots policy and Netlify redirects/404 handling. It uses the existing artwork catalogs and curated sharing images; no backend is required. The confirmed GA4 ID is configured in code; analytics activates only on production/main builds at the live apex origin after visitor consent. See the analytics documentation before release.

See [architecture/deployment](docs/architecture-deployment.md), [SEO/GEO](docs/seo-geo.md), [validation](docs/seo-validation.md) and [remaining account-dependent work](docs/analytics-growth.md).

`npm run preview -- --host 0.0.0.0` serves the built site for appearance checks; it does not implement Netlify HTTP rules. Production merge/deployment, DNS/domain and commerce changes require explicit approval.
