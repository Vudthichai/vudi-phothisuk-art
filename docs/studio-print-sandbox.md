# Studio Print sandbox

The site uses React, React Router and Vite. Netlify builds and prerenders the existing pages from `main` for production and makes separate pull request previews. The Forest & Flowers and Available Art links already point to the five `/studio-editions/<artwork>/` product pages. Both size selectors feed the same selection. Square hosted checkout is new and appears only in a configured sandbox preview.

| Open-edition Studio Print | Price |
| --- | --- |
| 9 × 12 in. | $45 |
| 12 × 16 in. | $75 |

The five supported prints are Mother Nature, Ethereal Bloom, Tiger Lily, 75 Leaves, and A Forest Forgotten. Collector’s Editions, originals, and collection bundles have no checkout or fulfillment mapping. The standalone price change makes the previous large-bundle savings claim obsolete. Its existing $425 price remains marked Coming Soon.

## Before enabling a preview

1. In the [Prodigi sandbox dashboard](https://sandbox-beta-dashboard.pwinty.com/), confirm the exact U.S.-shippable 9 × 12 and 12 × 16 variants of **Lustre Photo Paper, 240gsm**. The [public paper page](https://www.prodigi.com/products/prints-and-posters/photo-prints/lustre-photo-paper/) confirms the paper and SKU family but does not establish either exact variant. Do not derive SKUs from the documented prefix. Use the SKU returned by the catalogue and verify it with `GET https://api.prodigi.com/v5/catalogue/variants/<exact-SKU>`. Checkout independently checks the SKU, paper, dimensions, U.S. availability, and required default print area. If either exact size is unavailable, obtain confirmation from Prodigi and agree a product change before proceeding.
2. Locate the five approved print masters and any existing size-specific masters. The repo contains display derivatives and [source-image checksums](./studio-size-gallery-audit.json), so use the original uploaded JPEG/PDF bytes from the private source storage. For optimal 300 DPI, target 2700 × 3600 pixels at 9 × 12 and 3600 × 4800 at 12 × 16, or equivalent PDF print dimensions. Both are 3:4. Check orientation, color profile and safe area against Prodigi’s variant and artwork requirements. The order uses `fitPrintArea` to preserve the full composition, which can leave borders on a mismatched aspect ratio. Use the same source URL for both sizes only if the approved master meets both requirements. Use signed HTTPS URLs on one allowlisted, private object-storage host with enough validity for draft creation, retry and approval. Use immutable object paths. Renew signatures on the same path and verify that unsigned downloads fail and signed downloads reach the exact file without redirects. Do not put the URLs or masters in Git or public site assets.
3. In the [Square Developer Console](https://developer.squareup.com/apps), select a U.S. Sandbox test seller and location. Copy its merchant ID, location ID and Sandbox access token. Create a sandbox webhook subscription for `payment.created` and `payment.updated` at the exact preview URL `https://<preview-host>/api/studio-print/webhook`. Save its signature key. A redeploy at the same host keeps the endpoint URL.
4. Decide the supported test ZIPs, shipping charges and tax test rules. Assign an explicit entry per state and ZIP. A shipping fee is the configured base plus the configured additional charge for each extra print. The same customer shipping charge is used for either size within a ZIP. Square calculates additive sales tax at the supplied server-side rate and includes shipping in the taxable base when configured. ZIP entries represent sandbox scenarios. Real sales require a separate confirmed destination-tax, address validation and shipping policy. Prodigi wholesale charges are tracked independently of customer shipping and tax.

## Preview environment

Set these variables in Netlify’s preview environment. Scope secret values to Functions, and the public toggle to Builds. Keep keys, approved file URLs and test addresses out of source control, browser build variables and screenshots.

| Variable | Value |
| --- | --- |
| `VITE_STUDIO_SANDBOX` | `true` at build time. This is the only browser-visible setting. |
| `STUDIO_SANDBOX_ENABLED` | `true` for the preview functions. Defaults to disabled. |
| `SQUARE_SANDBOX_TOKEN`, `SQUARE_SANDBOX_LOCATION`, `SQUARE_SANDBOX_MERCHANT` | Sandbox token, location ID and merchant ID from the same seller. |
| `SQUARE_WEBHOOK_KEY` | Square sandbox webhook signature key. |
| `STUDIO_WEBHOOK_URL` | Exact HTTPS subscription URL, ending in `/api/studio-print/webhook`, with no trailing slash or query. |
| `PRODIGI_SANDBOX_KEY` | The key issued by the sandbox dashboard, with the required `sandbox_` prefix. Do not use a live key with a changed prefix. |
| `STUDIO_ADMIN_TOKEN` | Generate a 256-bit server-only bearer token with `openssl rand -hex 32`. Store it as an operator secret and rotate it if disclosed. |
| `STUDIO_DATA_KEY` | Generate a separate 256-bit hex key with `openssl rand -hex 32`. Keep it stable for orders encrypted under it. Replacing it without a migration makes those orders unavailable for fulfillment. |
| `STUDIO_PRINT_HOST` | Exact public DNS hostname for private signed downloads. The host must serve approved immutable JPEG or PDF objects over standard HTTPS without redirects. |
| `STUDIO_MAX_QUANTITY` | Quantity per order, from 1 to 10. Defaults to 10. |
| `STUDIO_MAX_FULFILLMENT_CENTS` | Required per-order supplier cap in USD cents. Set it after reviewing sandbox wholesale costs. Approval requires a verified positive USD supplier total at or below this cap. |
| `STUDIO_FULFILLMENT_ENABLED` | Set to `true` explicitly to enable sandbox checkout, draft creation and approval. Defaults to paused. |
| `STUDIO_VARIANTS` | JSON object with `9x12` and `12x16` keys and their confirmed Prodigi catalogue SKU values. |
| `STUDIO_PRINT_FILES` | JSON with keys `mother-nature`, `ethereal-bloom`, `tiger-lily`, `75-leaves`, `a-forest-forgotten`. Each maps to an object with `9x12` and `12x16` HTTPS download URL values. |
| `STUDIO_DESTINATIONS` | JSON keyed by state and 5-digit ZIP. Fictional test policy example `{"PA-15201":{"shippingCents":800,"additionalCents":100,"taxBps":750,"taxShipping":true}}`. |

Netlify provides `CONTEXT`. The function accepts preview/branch deploys and Netlify development contexts only. It uses the Square sandbox API and accepts only sandbox checkout URLs and Prodigi sandbox keys. Netlify Blobs stores the order by Square order ID in a sandbox store named for the Square merchant and location. New records encrypt shipping and contact details with AES-256-GCM and store an identifier derived from the print-file host and immutable path. Download URLs are supplied to Prodigi at draft creation from function settings. The record also includes the payment ID and fulfillment status. Reconcile and remove any pre-hardening sandbox records containing plaintext after resolving their pending payments. Keep the existing order records through Square’s webhook retry window. Use fictional customer details and clear test records when the sandbox exercise is complete. The existing static 404 routing and QR paths stay in place.

## Run one sandbox order

1. Run `npm ci`, `npm run test:studio-sandbox`, `npm test`, and `npm run build`. Configure the environment above in the pull request preview and redeploy the preview. Verify that `GET /api/studio-print/status` returns `sandbox: true` and the configured `maxQuantity`.
2. Open `/studio-editions/mother-nature/` on that preview. Select **12 × 16 in.**, quantity **1**, and enter a fictional name and email and a provider-accepted U.S. test address in a configured ZIP. Use the 9 × 12 option for a second run.
3. Choose **Continue to Square sandbox**. Verify that Square displays the correct size, $75 unit price, shipping, tax and total. Pay using the [Square sandbox test card instructions](https://developer.squareup.com/docs/devtools/sandbox/payments). The sandbox payment must show `COMPLETED` in Square. Changing receipt email on the Square page does not change the shipping/contact details already entered for fulfillment.
4. Check the Square webhook subscription's delivery log and save the Square order ID and payment ID. In the Prodigi sandbox dashboard find the draft whose merchant reference is the Square order ID. Verify the SKU, quantity, artwork preview, postal address, status and supplier cost when available. The webhook creates a draft only.
5. From a private terminal, set `PREVIEW_URL` to the preview origin, `ORDER_ID` to the Square order ID, and load `STUDIO_ADMIN_TOKEN` from your secret store or with `read -rs STUDIO_ADMIN_TOKEN`. Refresh before approving, then submit the sandbox draft explicitly. The same endpoint returns the latest status, costs and tracking if Prodigi supplies them.

```sh
curl --fail-with-body -sS "$PREVIEW_URL/api/studio-print/admin" \
  -H "Authorization: Bearer $STUDIO_ADMIN_TOKEN" -H 'Content-Type: application/json' \
  --data "{\"action\":\"refresh\",\"orderId\":\"$ORDER_ID\"}"

curl --fail-with-body -sS "$PREVIEW_URL/api/studio-print/admin" \
  -H "Authorization: Bearer $STUDIO_ADMIN_TOKEN" -H 'Content-Type: application/json' \
  --data "{\"action\":\"approve\",\"orderId\":\"$ORDER_ID\"}"
```

## Pause and recovery

Send `{"action":"pause"}` to the authenticated admin endpoint to pause checkout, draft creation and submission immediately across preview instances. Resume with `{"action":"resume","confirm":"resume-sandbox-fulfillment"}` after checking the underlying incident. The function environment flag must still be `true`. The pause does not cancel requests already sent to Square or Prodigi, disable links already issued by Square, or stop dashboard activity. During an emergency, also pause work in Prodigi and revoke outstanding Square links as appropriate.

If a paid order has no draft, inspect the Square delivery and Netlify function logs. Retry the Square event or send `{"action":"retry-draft","paymentId":"<Square payment ID>"}`. The function rechecks the authoritative payment and uses the same Prodigi idempotency key per Square order. Signed webhook deliveries older than 72 hours are ignored. For an older verified order use the admin retry.

A definite supplier validation rejection releases the approval lock. Fix the supplier issue and approve again when the new draft still matches the verified order. A timeout, conflicting response, or server failure leaves the approval pending. A refresh can reconcile confirmed supplier progress after the in-flight request window. If Prodigi confirms the previous attempt was **never accepted**, wait at least two minutes from the prior attempt, confirm the verified draft in Prodigi, then send `{"action":"reset-approval","orderId":"<Square order ID>","confirm":"confirmed-no-submission"}`. This clears the pending state without submitting. Approve separately. A successful approval cannot be retried. Refresh manually for supplier status and shipment tracking.

## Security audit and release checks

- **Integrity and replay.** Square signatures cover the exact notification URL and raw request bytes. The handler checks the seller, event age, payment completion, refunds, tips, currency, total, and the authoritative order’s item, price, quantity, shipping charge and tax. Draft creation uses an atomic payment claim and supplier idempotency. Approval rereads the payment and compares the Prodigi recipient, destination, SKU, asset and quantity against the encrypted Studio order. An atomic approval claim prevents concurrent submissions.
- **Access and abuse.** JSON body limits apply before parsing. Netlify limits the function to 40 requests per minute per IP and domain. The configured preview origin is enforced, and checkout requires a same-origin request. Admin accepts a dedicated 256-bit bearer token without cookie authentication and rejects browser Origin headers. Provider calls use fixed HTTPS API origins, reject redirects, and encode or validate provider identifiers. Signed asset URLs come only from server configuration. The browser and backend both restrict the payment redirect to the Square sandbox checkout origin and path. Server error bodies and logs omit raw input, credentials, signed URLs and provider response bodies.
- **Dependency and secret scans.** The package audit initially flagged Vitest and its dependencies. Vitest 5.1.1 cleared the reported findings. Gitleaks scanned locally reachable Git history, including `main` and the feature branch. Its 80 historical matches were verified as public image basenames rather than credentials. The GitHub integration could not read repository secret-scanning alerts. Ask a repository administrator to check the remote alert inventory and branches outside the local scan scope.
- **Before production.** Run a credentialed order for both sizes and verify the actual catalog, Prodigi draft response and cost fields, accepted asset/address response, real download permissions, Netlify rate-limit enforcement, and the pause/recovery procedure. Approval fails closed if Prodigi does not return the expected draft details or a positive total in USD. The current budget is a per-order check against the supplier’s returned total. It does not impose aggregate spend or lock a provider quote. Configure production address deliverability, jurisdiction tax and shipping policy, per-operator identity/MFA, restricted provider access and retention/deletion procedures before live sales. A refund or provider-side edit can still occur after the final check, so reconcile provider activity and refunds operationally.

References: [Prodigi Print API v5](https://www.prodigi.com/print-api/docs/) · [Square Checkout API](https://developer.squareup.com/docs/checkout-api) · [Square webhook signature validation](https://developer.squareup.com/docs/webhooks/step3validate) · [Netlify rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/)
