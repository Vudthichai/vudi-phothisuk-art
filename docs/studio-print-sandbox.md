# Studio Print sandbox

The site uses React, React Router and Vite. Netlify builds and prerenders the existing pages from `main` for production and makes separate pull request previews. The Forest & Flowers and Available Art links already point to the five `/studio-editions/<artwork>/` product pages. Both size selectors feed the same selection. Square hosted checkout is new and appears only in a configured sandbox preview.

| Open-edition Studio Print | Price |
| --- | --- |
| 9 × 12 in. | $45 |
| 12 × 16 in. | $75 |

The five supported prints are Mother Nature, Ethereal Bloom, Tiger Lily, 75 Leaves, and A Forest Forgotten. Collector’s Editions, originals, and collection bundles have no checkout or fulfillment mapping. The standalone price change makes the previous large-bundle savings claim obsolete. Its existing $425 price remains marked Coming Soon.

## Before enabling a preview

1. In the [Prodigi sandbox dashboard](https://sandbox-beta-dashboard.pwinty.com/), confirm the exact U.S.-shippable 9 × 12 and 12 × 16 variants of **Lustre Photo Paper, 240gsm**. The [public paper page](https://www.prodigi.com/products/prints-and-posters/photo-prints/lustre-photo-paper/) confirms the paper and SKU family but does not establish either exact variant. Do not derive SKUs from the documented prefix. Use the SKU returned by the catalogue and verify it with `GET https://api.prodigi.com/v5/catalogue/variants/<exact-SKU>`. Checkout independently checks the SKU, paper, dimensions, U.S. availability, and required default print area. If either exact size is unavailable, obtain confirmation from Prodigi and agree a product change before proceeding.
2. Locate the five approved print masters and any existing size-specific masters. The repo contains display derivatives and [source-image checksums](./studio-size-gallery-audit.json), so use the original uploaded JPEG/PDF bytes from the private source storage. For optimal 300 DPI, target 2700 × 3600 pixels at 9 × 12 and 3600 × 4800 at 12 × 16, or equivalent PDF print dimensions. Both are 3:4. Check orientation, color profile and safe area against Prodigi’s variant and artwork requirements. The order uses `fitPrintArea` to preserve the full composition, which can leave borders on a mismatched aspect ratio. Use the same source URL for both sizes only if the approved master meets both requirements. Provide HTTPS download URLs accessible to Prodigi, such as signed URLs with enough validity for draft creation, retry and approval. Do not put the URLs or masters in Git or public site assets.
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
| `STUDIO_ADMIN_TOKEN` | Random server-only bearer token, at least 32 characters. Generate with `openssl rand -hex 32`. |
| `STUDIO_VARIANTS` | JSON object with `9x12` and `12x16` keys and their confirmed Prodigi catalogue SKU values. |
| `STUDIO_PRINT_FILES` | JSON with keys `mother-nature`, `ethereal-bloom`, `tiger-lily`, `75-leaves`, `a-forest-forgotten`. Each maps to an object with `9x12` and `12x16` HTTPS download URL values. |
| `STUDIO_DESTINATIONS` | JSON keyed by state and 5-digit ZIP. Fictional test policy example `{"PA-15201":{"shippingCents":800,"additionalCents":100,"taxBps":750,"taxShipping":true}}`. |

Netlify provides `CONTEXT`. The function accepts preview/branch deploys and Netlify development contexts only. It uses the Square sandbox API and accepts only sandbox checkout URLs and Prodigi sandbox keys. Netlify Blobs stores the order by Square order ID in a sandbox store named for the Square merchant and location. The private record includes the shipping address, print-file binding, payment ID, and fulfillment status. Use fictional customer details and clear test records when the sandbox exercise is complete. The existing static 404 routing and QR paths stay in place.

## Run one sandbox order

1. Run `npm ci`, `npm run test:studio-sandbox`, `npm test`, and `npm run build`. Configure the environment above in the pull request preview and redeploy the preview. Verify that `GET /api/studio-print/status` returns `{"sandbox":true}`.
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

If a paid order has no draft, inspect the Square delivery and Netlify function logs. Retry the Square event or send the authenticated admin body `{"action":"retry-draft","paymentId":"<Square payment ID>"}`. Draft creation uses the same Prodigi idempotency key per Square order, including during concurrent delivery. If submission times out, refresh first. An ambiguous approval has a one-minute retry cooldown and a retry still requires a draft that Prodigi reports as submittable and a matching unrefunded Square payment. Successful approvals cannot submit again. Refresh manually for supplier status and shipment tracking. Sandbox shipment data may be empty.

The automated tests use provider fixtures and assert both prices, all ten artwork/size combinations, address rules, payment independently retrieved from Square, webhook signatures, duplicate notifications, refund handling, provider failure retry, approval concurrency, and production/missing-configuration behavior. A credentialed provider run is required to verify real SKU availability, approved files, hosted checkout rendering, tax and shipping behavior, and supplier draft acceptance.

References: [Prodigi Print API v5](https://www.prodigi.com/print-api/docs/) · [Square Checkout API](https://developer.squareup.com/docs/checkout-api) · [Square webhook signature validation](https://developer.squareup.com/docs/webhooks/step3validate)
