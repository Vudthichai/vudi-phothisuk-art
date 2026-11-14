# PR #60 — final release checklist

Last verified 2026-11-14. **No merge, Netlify build trigger, publish action, DNS or production setting change is authorized by this preparation task.** PR changes remain on `feature/seo-geo-foundation`.

## Evidence and unresolved gates

- GitHub confirms PR #60 head `552efd4c495fe2256aa4fd596e4863adc8122525` had a successful `netlify/vudi-phothisuk-art/deploy-preview` status. Netlify's redirect/header checks succeeded and identify deploy `6af8ad9bcc486fa438994562`, project `vudi-phothisuk-art`.
- Preview: https://deploy-preview-60--vudi-phothisuk-art.netlify.app
- Deploy details: https://app.netlify.com/projects/vudi-phothisuk-art/deploys/6af8ad9bcc486fa438994562
- This proves a GitHub/Netlify integration built that SHA; it does **not** prove the preview alias still serves that SHA or prove production branch/publishing settings. A green old status must not be presented as a new head's validation.
- The initial cloud CONNECT 403 was resolved when the owner added the three Netlify hosts to the running environment. Normal verified-TLS HTTP access now works. Existing preview JS `index-D_XU_ZAR.js` and CSS `index-DjBSrVmo.css` are byte-identical to a separate rebuild of `552efd4`; Netlify API reports that exact commit/context. Thus the alias was verified against source, not merely a green status.
- Owner confirmed in Netlify: project `vudi-phothisuk-art`, repo `Vudthichai/vudi-phothisuk-art`, production branch `main`, published production `9b209df`, and automatic production publishing enabled (UI: “Lock to stop auto publishing.”). Read-only Netlify API independently reports site ID `b29576b1-1206-4298-8484-335bebbbc72c` and published deploy `6af5e552f0faa7ee815b22f3` at full SHA `9b209df1716e694985a31305b76c9053bb720c59`, branch main, context production. No settings were changed. Recheck these values immediately before execution, especially the rollback deploy.
- Owner confirms Search Console ownership verified, live homepage test passed, indexing requested, GA4 account/property/web stream created, and Enhanced measurement disabled. These are owner-reported actions; they do not establish page indexing or real analytics receipt.

## Approved outreach links

Only this convention is accepted (owner-approved): source `gallery-outreach` or `collector-outreach`, medium `email`, campaign `forest-flowers-2026`; optional source-matched anonymous content code `gallery-001`…`gallery-999` or `outreach-001`…`outreach-999`.

Gallery example:

```text
https://vudiphothisukart.com/collections/forest-and-flowers/?utm_source=gallery-outreach&utm_medium=email&utm_campaign=forest-flowers-2026&utm_content=gallery-001
```

Collector batch example:

```text
https://vudiphothisukart.com/collections/forest-and-flowers/?utm_source=collector-outreach&utm_medium=email&utm_campaign=forest-flowers-2026&utm_content=outreach-001
```

Use non-personal gallery/outreach batch codes, never names, email addresses or individual recipient identifiers. Prepare links now, but attribution starts only after the approved implementation is released and a visitor accepts analytics. No retroactive attribution for earlier visits. Keep Enhanced measurement **OFF**. No automatic outbound/form/search tracking or second Google tag.

## Hosted preview verification (read-only)

1. Resolve the current PR head via GitHub; require a successful preview status for that exact SHA.
2. Fetch `/build-info.json`: require `commit` equal to the PR head, `context=deploy-preview`, `branch=nonproduction`, `analytics_build_enabled=false`. An older build without this file cannot validate the new release-preparation revision; wait for an authorized/automatic preview update, not a production publish. No deployment is triggered by these tests.
3. After local `npm run build`, run:

```sh
EXPECTED_COMMIT="$(git rev-parse HEAD)" NODE_USE_ENV_PROXY=1 npm run test:http -- https://deploy-preview-60--vudi-phothisuk-art.netlify.app
npm run test:browser -- https://deploy-preview-60--vudi-phothisuk-art.netlify.app
```

The browser script supports the inherited HTTPS proxy for a remote HTTPS target. Provide optional Playwright/system Chromium settings as in `docs/seo-validation.md`. HTTP tests cover all 35 public routes, slash variants, 32 source-backed aliases, sitemap/robots content types, and three genuine unknown URL/asset 404s. Inspect sitemap XML/robots content and verify no Google tag requests even with a saved acceptance. Mobile menu, artwork pages/viewer, inquiry links, social/canonical tags and JavaScript-disabled content must pass. Do not enable tracking or override build flags on the preview.

## Production release — execute ONLY after explicit approval

1. In Netlify project **vudi-phothisuk-art**, verify connected repo **Vudthichai/vudi-phothisuk-art**, production branch **main**, Node **24**, build **npm run build**, publish **dist**. Check for UI overrides, stopped builds, disabled auto-publishing and deploy locks. Record the existing published production deploy ID/SHA for rollback. Do not change configuration unless separately approved.
2. Review the final PR head/preview evidence, privacy disclosure and account retention choices. Obtain approval covering **both merge and production publication** if automatic publishing is enabled: merging can publish immediately.
3. Prefer a **squash merge** to main using a clean release message such as `Release SEO/GEO foundation and consent-gated GA4`. Remove `[skip netlify]` / `[skip ci]` from both squash title **and body** (GitHub may prefill preparation commit messages). Do not rewrite feature history or force-push. Confirm the resulting main SHA.
4. Let the connected Netlify **production** build run for that main SHA. If the merge was skipped or a build did not start, stop and inspect project status; with release approval, use the project's **Deploys → Trigger deploy → Deploy site** action for the latest **main** commit (UI labels may vary). Do not trigger a preview-branch build as a substitute. If automatic publishing is disabled, inspect the completed production build first, then use **Publish deploy** only under the same explicit release approval.
5. Require the production build log/context to show `CONTEXT=production`, `BRANCH=main`, `COMMIT_REF=<merged-main-SHA>`. After publication, `/build-info.json` on **https://vudiphothisukart.com** must contain that SHA, `context=production`, `branch=main`, `analytics_build_enabled=true`. Netlify supplies these build variables; do not manually set production flags on preview builds. **Never promote the deploy-preview artifact** or drag-and-drop an ordinary local `dist`: its compiled analytics flag is false and moving the files cannot enable it. Always build fresh in the real production/main context.
6. Run the same read-only HTTP/browser checks on the live origin; confirm domain redirects, genuine 404s, canonical URLs, sitemap and robots. These browser checks do not consent automatically on production. No DNS/forwarding change is required.
7. Use a separate, explicitly consented test visit with the gallery link above. Before acceptance, confirm zero Google tag/collection requests. Accept once; confirm one tag and one page view, safe recognized campaign source/medium/name/content, no arbitrary query/fragment/PII/click IDs, and one further view per SPA/back navigation. A query-only change must not add views. An inquiry click must be an intent event, never `purchase` or `generate_lead`. Decline/withdrawal must stop events and delete this property's GA cookies.
8. Confirm receipt through Tag Assistant plus GA4 Realtime/DebugView, then check standard traffic-acquisition/manual campaign reporting after processing delay. The local command recorder proves configuration, not Google's actual ingestion/session attribution. Disable temporary debugging afterward. Verify custom event dimensions if desired; standard campaign fields need no custom dimensions.
9. Submit/verify the released sitemap in Search Console and inspect representative artwork, collection and exhibition URLs. Existing homepage indexing request is already owner-confirmed; do not claim complete indexing from it. Bing ownership remains pending.
10. If build identity, tracking exclusions, privacy, routing or consent fails, stop acquisition analytics verification and use the recorded previous **production** deploy for rollback only with explicit rollback approval. Do not silently promote a preview or change DNS.

## Build marker implications

Preparation commits contain `[skip netlify]`. Netlify documents skip markers as build controls, but the existing head nevertheless has a successful preview. Treat actual deploy metadata as evidence and markers as requests, not access controls. Do not assume why that build ran (retry, manual action, PR integration or another setting) without account/build-log evidence. No Netlify trigger/publish API is used during release preparation.
