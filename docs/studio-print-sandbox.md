# Studio Print sandbox

The five open-edition Studio Prints are Mother Nature, Ethereal Bloom, Tiger Lily, 75 Leaves and A Forest Forgotten. Originals, Collector’s Editions and collection bundles are outside this checkout. Collector’s Editions are available exclusively in person.

| Size | Retail price | Owner-confirmed Prodigi dashboard SKU |
| --- | ---: | --- |
| 9 × 12 in. | $45 USD | `GLOBAL-PAP-9X12` |
| 12 × 16 in. | $95 USD | `GLOBAL-PAP-12X16` |

Change retail prices in [the server catalog](../server/commerce/studio-catalog.json) and rebuild the preview. Product pages and selectors use that catalog. The server independently sets all Square prices and records the accepted amount so later changes do not reprice a paid order.

## What the provider can verify

Prodigi v5 handles catalogue validation, draft creation, manual submission and status. Each new quote checks the catalogue SKU for size, Lustre Photo Paper 240gsm, default print area and U.S. availability. The authenticated admin `catalogue` action runs those checks for both sizes and returns catalogue dimensions, print requirements and an itemized quantity-one USD quote with the carrier and fulfillment countries when supplied. These are candidates from the authenticated dashboard until an API response verifies them.

Checkout requests **Standard** shipping from the documented Prodigi v4 sandbox Quotes endpoint with destination `US` and currency `USD`. That endpoint quotes by country and does not take a ZIP or supply a delivery date in its documented response. The preview accepts only explicitly configured ZIPs in the contiguous U.S. and Washington, D.C. Shipping is shown as a U.S. country-level quote before payment. Validate multiple representative destinations with Prodigi before launch. If they incur destination surcharges or require different services, use a verified address-level quote or an approved contracted zone table before enabling those destinations. The app does not substitute a flat fee or advertise a delivery date.

The dashboard observations of £4 and €7 are unverified for U.S. fulfillment. The Quotes API has a separate requested currency and defaults to merchant settings when one is omitted. U.S. production, the dashboard's display currency, the quote currency, and the final settlement currency are separate facts. The app requests USD, validates every amount used, and blocks checkout if the provider does not return a usable USD quote. It does not perform FX. If USD quotes or USD order totals are unavailable, confirm the billing currency with Prodigi and choose an authoritative conversion and buffer policy before proceeding. Keep an allowance for supplier taxes, FX or card charges and cost changes. The code will not infer those costs.

Prodigi v5 documents that order writes use catalogue SKUs and downloadable artwork URLs. Managed product variant and managed asset IDs are not resolved when creating or editing drafts. The five saved dashboard products can still be used for operator reference. [Prodigi v5 API](https://www.prodigi.com/print-api/docs/) · [Prodigi v4 Create Quote](https://www.prodigi.com/print-api/docs/v4/#create-quote)

## Configure the Netlify preview

1. In the [Square Developer Console](https://developer.squareup.com/apps), select the app’s **Sandbox** tab and a U.S. test seller. Get the Sandbox access token from **Credentials** and the associated location ID from **Locations**. Get the matching seller’s merchant ID from the sandbox account or the Square Merchants API. Under Sandbox webhook subscriptions, add `payment.created` and `payment.updated` at `https://<preview-host>/api/studio-print/webhook` and copy its signature key.
2. In [Prodigi’s sandbox dashboard](https://sandbox-beta-dashboard.pwinty.com/), retrieve the sandbox key under **Settings → Integrations → API**. Use the sandbox-issued key with the v5 `sandbox_` prefix in Netlify. The server uses the same underlying key without the prefix on the dedicated v4 sandbox quote host. Verify both endpoints with the admin `catalogue` action below.
3. Retrieve the approved high-resolution Studio Print JPGs from private storage. Verify against the original source and [asset audit](studio-size-gallery-audit.json). For 300 DPI, aim for at least 2700 × 3600 pixels for 9 × 12 and 3600 × 4800 for 12 × 16, preserving the approved 3:4 design. Use the provider-returned print-area specifications if they differ. The same approved master can serve both sizes if it meets both specifications. Verify the full artwork, orientation, safe area, and color proof. Keep each object at an immutable versioned path and verify anonymous downloads fail. Create expiring, read-only HTTPS URLs for individual objects on one private storage host. Confirm signed downloads return the exact JPG bytes without redirects. Keep URLs valid through test checkout and fulfillment. Renew signatures against the same object path. Do not use thumbnails, watermarked versions or Collector’s Edition files.
4. In Netlify **Project configuration → Environment variables**, restrict the variables to Deploy Previews and use the Functions scope for secrets and server configuration. Set only `VITE_STUDIO_SANDBOX` in the Builds scope. Enter secrets directly in Netlify or the approved secret manager. Redeploy the preview, leaving production variables unset.

| Variable | Value |
| --- | --- |
| `VITE_STUDIO_SANDBOX` | `true` for the preview build. The browser receives this toggle and public catalog data only. |
| `STUDIO_SANDBOX_ENABLED` | `true` for preview functions. |
| `STUDIO_CHECKOUT_ENABLED`, `STUDIO_FULFILLMENT_ENABLED` | Set explicitly to `true` to run a sandbox purchase. Defaults are paused. |
| `SQUARE_SANDBOX_TOKEN`, `SQUARE_SANDBOX_LOCATION`, `SQUARE_SANDBOX_MERCHANT` | Sandbox credentials and IDs from the same test seller. |
| `SQUARE_WEBHOOK_KEY`, `STUDIO_WEBHOOK_URL` | Signature key and exact HTTPS subscription URL with path `/api/studio-print/webhook`, without query or trailing slash. |
| `PRODIGI_SANDBOX_KEY` | Sandbox-issued key formatted as `sandbox_<sandbox-key>`. |
| `STUDIO_ADMIN_TOKEN`, `STUDIO_DATA_KEY` | Generate two separate 256-bit hex secrets with `openssl rand -hex 32`. Use the admin token only from a trusted terminal. Plan migrations before rotating the data key, as existing records require it. |
| `STUDIO_PRINT_HOST` | Exact hostname for the signed private JPGs. |
| `STUDIO_PRINT_FILES` | JSON object keyed by `mother-nature`, `ethereal-bloom`, `tiger-lily`, `75-leaves`, and `a-forest-forgotten`. Each contains `9x12` and `12x16` signed HTTPS object URLs. |
| `STUDIO_DESTINATIONS` | JSON keyed by state and 5-digit ZIP. Set verified sandbox tax scenarios explicitly. Example test rule `{"PA-15201":{"taxBps":750,"taxShipping":true}}` uses a fictional tax rate. Set `taxBps:0` only where the test policy explicitly calls for no tax. |
| `STUDIO_MAX_QUANTITY` | Integer from 1 to 10. Defaults to 10. |
| `STUDIO_MAX_FULFILLMENT_CENTS` | Required per-order wholesale spend cap in USD cents. |
| `STUDIO_DAILY_FULFILLMENT_CENTS` | Required cumulative cap in USD cents, at least the per-order cap. The reservation day is UTC. |

## First provider-backed sandbox purchase

1. Run `npm ci`, `npm run test:studio-sandbox`, `npm test`, `npm run build`, `npm run test:coa`, and `npm run test:ar`. On the configured preview, `GET /api/studio-print/status` must return `sandbox: true` and the quantity limit.
2. Set `PREVIEW_URL` to the preview origin and load `STUDIO_ADMIN_TOKEN` from the secret manager. Run the catalogue check before offering a purchase. Compare both API results with the product and asset details in the dashboard.

```sh
curl --fail-with-body -sS "$PREVIEW_URL/api/studio-print/admin" \
  -H "Authorization: Bearer $STUDIO_ADMIN_TOKEN" -H 'Content-Type: application/json' \
  --data '{"action":"catalogue"}'
```

3. Open `/studio-editions/mother-nature/`. Pick 12 × 16 inches, quantity one, and enter fictional contact details with a provider-accepted address in a configured ZIP. Read the returns policy. Select **Review shipping and total**. Verify $95, a separate shipping amount, configured sales tax and the total. Within 10 minutes choose **Continue to Square sandbox**. Confirm the same breakdown and use a [Square sandbox test card](https://developer.squareup.com/docs/devtools/sandbox/payments). Repeat for $45 at 9 × 12.
4. Confirm Square reports a completed payment and check its hosted receipt flow. Check webhook delivery and find the unsubmitted draft by its Square order ID in the Prodigi sandbox. Verify recipient, price and shipping, SKU, quantity, and the exact artwork proof. Square’s editable receipt email does not change the shipping details submitted to the site.
5. Set `ORDER_ID` to the Square order ID. Inspect the order, then approve it manually after review. Repeat `view` later for updated tracking or use `refresh` to save the supplier snapshot.

```sh
for action in view approve; do
  curl --fail-with-body -sS "$PREVIEW_URL/api/studio-print/admin" \
    -H "Authorization: Bearer $STUDIO_ADMIN_TOKEN" -H 'Content-Type: application/json' \
    --data "{\"action\":\"$action\",\"orderId\":\"$ORDER_ID\"}" || break
done
```

The authenticated order view reports Square fees where available, retail, collected shipping, customer tax, quoted production/shipping, supplier-reported amounts, payment and approval status, and shipment tracking. Missing provider fields remain unknown. Provider-reported costs are not labeled as invoiced actuals. Reconcile against the final Prodigi invoice and Square settlement. Estimate contribution as print sales plus collected shipping, less supplier production, shipping, supplier taxes/fees included in the supplier total, and Square processing fees. Exclude customer tax from sales when calculating margin. If shipping equals supplier shipping, the starting contribution is **$45 or $95 less production and the other charges**. There is no defensible numeric margin until credentialed supplier figures and payment fees are available.

## Security, pause and reconciliation

- The server binds a 10-minute quote to an encrypted recipient, catalog selection, print-file identity, currency and reviewed amount. Retries of the same quote use one Square idempotency key. The site honors the amount shown by an issued Square link. Square links may outlive the pre-checkout quote expiry, so review or revoke outstanding links from Square during an incident.
- The signed webhook validates raw bytes, seller and event age, rereads payment and Square order, then claims the order and creates an idempotent v5 draft. Manual approval independently rereads the payment and verifies the draft recipient and order details. No card details pass through the site.
- `pause-checkout` stops new quotes and links while permitting fulfillment of prior payments. `pause` stops checkout and fulfillment. Resume with `{"action":"resume-checkout","confirm":"resume-sandbox-checkout"}` or `{"action":"resume","confirm":"resume-sandbox-fulfillment"}`. These controls do not cancel already issued links or provider requests already in flight.
- Approvals require a verified positive USD draft cost at or below the per-order cap and reserve against the atomic UTC-day cap. Uncertain and rejected attempts retain their reservations for that day. Same-day retry for the same order reuses its reservation, increasing it only if needed. This caps site approval reservations against provider-reported amounts. It cannot constrain vendor-side changes, final settlement differences, or dashboard submissions.
- Retry a missing draft with `{"action":"retry-draft","paymentId":"<Square payment ID>"}`. Definite validation rejection allows approval retry after correction. For ambiguous submission, refresh first. If Prodigi confirms no submission was accepted, wait at least two minutes and use `{"action":"reset-approval","orderId":"<id>","confirm":"confirmed-no-submission"}`. Approve separately. Provider progress discovered during refresh prevents a duplicate submission.
- The API requires the exact preview origin, bounds request bodies and applies Netlify per-domain/IP rate limiting. It uses a private operator bearer token, no browser admin cookies, fixed API hosts and redacted errors. Quote and order data use separate encrypted records in the private Netlify store. Delete expired quote records on a routine schedule through the operator’s Netlify Blobs access, then purge test orders after reconciliation and webhook retry retention. Do not delete an active daily budget or unresolved order record.

## Production readiness checklist

- Verify the two SKUs and both size checkouts with sandbox credentials, provider quote fields, USD draft cost and actual supplier billing fields. Validate print quality and U.S. routing with representative addresses. Verify Netlify rate limits and the two pause controls.
- Verify Square’s receipt settings. The operator can retrieve tracking in the admin order view and send it to the buyer using an approved support channel. Automatic shipment emails still require a configured notification workflow. Do not advertise them before that workflow is tested.
- Establish legally reviewed tax, cancellation and shipping policies, address deliverability, refund handling, operator identity/MFA, payment reconciliation and PII retention. Keep automated fulfillment disabled.
- Confirm that Prodigi accepts the Square Debit Card and that sufficient cleared funds are available. Keep a funding buffer for settlement delays, refunds and exchange-rate or production cost changes. No billing method is configured here.
- Review the provider-backed results before requesting production approval. The code and endpoints remain sandbox-only.
