# Analytics, verification and growth

Last verified **2026-11-14**. GA4 implementation is part of draft PR #60, not yet merged or deployed. No live data collection or account verification is claimed.

## Confirmed configuration and decisions

Owner-provided stream: **Vudi Phothisuk Art — Website**, `https://vudiphothisukart.com`, measurement ID **G-0S3J4CK8RP**. This public ID is not a credential. Account/property/stream setup is owner-confirmed, not independently inspected through Analytics account access.

Repository inspection found no existing GA4, GTM, consent integration or duplicate Google tag. Use a lightweight direct asynchronous `gtag.js` loader, no analytics package or tag manager. Owner approved the small consent notice, equal Accept/Decline buttons and preference control. Owner **confirmed Enhanced measurement OFF** during this phase; it was initially on. Keep it off for this manual implementation.

Google's [manual page-view guide](https://developers.google.com/analytics/devguides/collection/ga4/views) requires suppressing automatic page views to avoid duplication. This implementation sets `send_page_view: false` and relies on the confirmed disabled Enhanced measurement to prevent history/outbound/search/form events and raw link values. Do not re-enable automatic measurement, configure a second Google destination/tag or create account-side duplicate events without reviewing the code.

## Production and consent boundaries

- `vite.config.ts` compiles analytics eligibility only for **build commands with Netlify `CONTEXT=production` and `BRANCH=main`**. Netlify supplies those variables. No production settings were changed. Plain `npm run build`, development, branch deploys and deploy previews compile disabled, even if served at the production origin.
- Runtime additionally requires the exact origin **https://vudiphothisukart.com** (HTTPS, apex, default port). Localhost, www, Netlify aliases and preview origins cannot load the tag, even with saved acceptance. Unknown contexts fail closed. A manual deployment built outside the verified production context will collect nothing until its build process is deliberately reviewed.
- Basic consent mode: no Google tag, preconnect, event buffer or Google requests until explicit or unexpired saved acceptance. The notice/preference control appears only in eligible production. Core gallery/navigation/inquiries work regardless of choice.
- Consent choice only is stored locally under `vpa.analytics-consent.v1`, up to **180 days**. Re-prompt on missing/expired/invalid choice. Storage failures retain a session choice. Decline/withdrawal sets the GA disable flag, denies analytics storage, removes this property's root GA cookies (host/domain variants) and drops queued unsent manual events while the tag is loading. Google code already loaded cannot be un-downloaded.
- GPC or Do Not Track `1` overrides acceptance. Advertising storage, ad user data and ad personalization stay denied; Google Signals and ad personalization signals stay off. See [Google consent guidance](https://developers.google.com/tag-platform/security/guides/consent).
- No custom names, email addresses, mailto values, inquiry contents, browser-entered text, user IDs, prices, sensitive URL parameters or unknown route paths are sent. Known catalog URLs/titles/IDs are allowlisted; page URLs omit all query strings and fragments. The only attribution exception is the approved, validated campaign convention below, supplied through recognized Google campaign configuration fields after acceptance. External referrers are reduced to origins; internal referrers use the previous known canonical (or generic `/404/`). Unknown routes do not produce manual views and use a generic safe context if the tag was previously loaded.
- **Page URLs still contain no query parameters or fragments.** After consent, `landingCampaign()` reads the browser-provided document navigation timing URL (current URL fallback where unsupported), validates only the approved UTMs, and maps them to Google’s recognized `campaign_source`, `campaign_medium`, `campaign_name`, `campaign_content` configuration fields. These persist in the Google tag configuration during SPA navigation. No app campaign capture, analytics buffer or campaign storage occurs before consent; navigation timing is existing browser state, not an application analytics queue. Unsupported/invalid campaign fields, `campaign_id` and `campaign_term` are explicitly cleared, rather than falling back to raw query values. No click IDs, names or email/inquiry values are forwarded. See the release checklist for approved link examples and browser limitations.

The notice identifies Google, optional cookies/usage processing, the stored choice, withdrawal, contact email and Google's linked privacy information. [Google Analytics terms](https://marketingplatform.google.com/about/analytics/terms/us/) require suitable privacy disclosures and necessary notice/consent; the owner remains responsible for the site's full privacy policy. It is a functional technical baseline, not a certification of legal compliance. The owner should review the public disclosure and applicable US/international obligations, Google processing terms, retention, international transfers and any jurisdiction-specific notices before release. Do not claim cookie identifiers or Google's processing of network information are anonymous merely because custom PII is excluded. Google itself processes technical/device/network information after acceptance.

## Event contract

| Event | Trigger | Custom parameters | Interpretation |
| --- | --- | --- | --- |
| `page_view` | Accepted direct load or real React Router pathname change to a known page | Safe `page_location`, catalog `page_title`, safe `page_referrer` | One page view; query/hash-only changes do not count. |
| `artwork_view` | Same eligible route view on an individual artwork | `artwork_id`, `collection_id` | Artwork page viewed, not evidence of purchase intent or time spent. |
| `collection_view` | Same eligible route view on an individual collection | `collection_id` | Collection page viewed. Index `/collections/` has just a page view. |
| `exhibition_interest` | Exhibition page viewed | `exhibition_id=forest-and-flowers-2026-12-05`, `interest_action=view` | Exhibition content viewed; not RSVP, attendance or qualified lead. |
| `artwork_inquiry_click` | A catalog-identified artwork email link is clicked | `artwork_id`, `collection_id`, `source_page` (known path only) | Intent only; no guarantee an email opened or was sent. |

`send_to` always targets the confirmed ID. Module-level consecutive-canonical deduplication protects initial loads and React StrictMode; A→B→A counts three visits. Consent acceptance records only the current page, without replaying unconsented browsing. Withdrawal/reacceptance begins a new consent period and can record the current page again. One document listener is installed/cleaned up by React; it never changes inquiry URLs, intercepts navigation, or reads mail subjects/bodies. Collection-wide/general commission/contact links are not misattributed to a specific artwork.

There are **no `purchase`, `generate_lead`, sale, submitted-inquiry or RSVP events**. Qualified incoming inquiries and completed sales still require a private, verified sales register or future backend integration. Do not relabel a click as a completed inquiry/sale. Do not add personal inquiry details to GA4.

## Account-side checklist before/after approved release

1. Keep Enhanced measurement **off** (owner-confirmed). Check the Google tag destination settings do not independently generate history/page-view, outbound, form, site-search or email-link events. No duplicate GTM/site-installed tag or account-side event-creation rules.
2. Review Google Signals, advertising/product links, data sharing, data processing terms, retention, email/query data redaction and region-specific controls in the account. This code disables ad signals but cannot change account-wide settings. Confirm property timezone/reporting ownership and retain only needed data.
3. Register event-scoped custom dimensions if needed: `artwork_id`, `collection_id`, `exhibition_id`, `interest_action`, `source_page`. Avoid unnecessary high-cardinality dimensions. Optionally mark `artwork_inquiry_click` as a key event explicitly described as an **intent click**, not a lead or sale.
4. Define internal/developer traffic filters carefully; test before activating permanent exclusions. Website exclusions protect local/previews, but a staff visit to production after consent can still count. No debug mode is enabled by default.
5. After separately approved production release, confirm Netlify built with the verified context/branch. In a clean browser, verify no Google requests before a choice/after decline; accept, then check a single tag, one direct view and one SPA view per navigation, correct catalog IDs, sanitized URLs and withdrawal/cookie deletion.
6. Use consented test visits with Tag Assistant/GA4 Realtime and temporarily configured DebugView. Confirm actual Google network payloads and absence of automatic duplicate events. Do not infer delivery from local command tests. Events may be blocked by browser policies/extensions. Restore normal non-debug operation after testing.

## Tests and limits

- `npm test` includes analytics tests for StrictMode, consent, route returns, query/hash privacy, intent events, withdrawal, preview/local exclusion, browser privacy signals, expired choice and blocked storage.
- `scripts/check-analytics-browser.mjs` simulates the production origin against local build files with **every network request intercepted**. Google's tag is a local command recorder; no requests or test hits reach Google or the production site. Test an enabled fixture using `CONTEXT=production BRANCH=main npm run build`, then run with `--production`. Test ordinary/preview builds without that flag. Optional Playwright tooling is the same as `docs/seo-validation.md`.
- Browser simulations verify page commands, a single loader, UI/withdrawal behavior and build/origin gates. They do not execute Google's real library or verify account settings, ingestion, attribution, real-time reports or field performance. Do not deploy test fixtures. Finish by rebuilding without simulated production environment variables.
- The external Google script loads only after acceptance, asynchronously. No SDK dependency or artwork asset change. Record measured build sizes in `docs/seo-validation.md`; a local size comparison does not establish real-world Core Web Vitals.

## Search and growth work still pending

Search Console ownership/live homepage test/indexing request are owner-confirmed. After approved release, submit/verify the new sitemap and inspect representative page indexing/canonicals; Bing Webmaster Tools ownership remains unverified. Netlify API confirms site ID/published main SHA; owner confirms production branch main and automatic publishing enabled. Follow the release checklist before merge, since merge can publish immediately.

Before December 5: resolve Dragon Lily facts/eight Forest availability records, approve technical release, verify live search/analytics, establish a baseline, and conduct separately authorized venue/calendar/collector outreach. No external messages or indexing submissions were made by this implementation. National/international acquisition content and shipping/payment policies remain future verified work.

## Approved gallery/collector campaign convention — 2026-11-14

Owner explicitly approved the following exact conventions for outreach. This is not a general-purpose UTM parser.

| URL key | Allowed values | Google configuration |
| --- | --- | --- |
| `utm_source` | `gallery-outreach` or `collector-outreach` | `campaign_source` |
| `utm_medium` | `email` | `campaign_medium` |
| `utm_campaign` | `forest-flowers-2026` | `campaign_name` |
| `utm_content` | optional `gallery-001`…`gallery-999` for gallery source; `outreach-001`…`outreach-999` for collector source | `campaign_content` |

Codes identify non-personal gallery/outreach batches only; never encode a recipient/name/email in a code or assign individual collector identifiers. The three base fields are required together, case-sensitive, with no whitespace. Duplicate approved keys, oversized queries (>2048 characters), missing/invalid required values, empty/invalid/mismatched content reject the entire campaign. Other query keys are ignored and never sent. Valid percent-encoding decodes to the same allowlisted values; no free text is accepted.

Google documents these as recognized campaign configuration overrides, not custom event dimensions: [GA4 configuration reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/config#campaign_source). No custom dimensions are needed for standard campaign source/medium/name/content. Actual GA4 attribution/report ingestion remains a consented production verification step. No new session or duplicate page view is forced to attach a campaign. The document landing campaign is retained after accepted configuration; internal query-only changes do not create new campaigns/views. A full navigation to a new document can establish its own campaign after consent. Browsers without navigation timing use the current URL at acceptance, so attribution can be lost if the visitor navigated away before accepting on those browsers; no unconsented storage is used to compensate.

Owner reports Search Console ownership verified, the live homepage test passed and indexing requested; GA4 account/property/stream created and Enhanced measurement disabled. These are owner-confirmed account actions, not independently observed account reports; an indexing request does not prove indexing. See [release-checklist.md](release-checklist.md) for remaining release gates.
