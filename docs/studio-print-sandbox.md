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
3. Retrieve the approved high-resolution Studio Print JPGs from private storage. Verify against the original source and [asset audit](studio-size-gallery-audit.json). For 300 DPI, aim for at least 2700 × 3600 pixels for 9 × 12 and 3600 × 4800 for 12 × 16, preserving the approved 3:4 design. Use the provider-returned print-area specifications if they differ. The same approved master can serve both sizes if it meets both specifications. Verify the full artwork, orientation, safe area, and color proof. Upload the originals directly into the private Netlify Blob store using the procedure below. The script uses immutable keys derived from the approved file checksums. Do not use thumbnails, watermarked versions or Collector’s Edition files.
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
| `STUDIO_ARTWORK_SIGNING_KEY` | Generate a third, distinct 256-bit hex secret with `openssl rand -hex 32`. Set it in Functions → Deploy Previews only and mark it as secret. It signs the temporary JPG links. |
| `STUDIO_DESTINATIONS` | JSON keyed by state and 5-digit ZIP. Set verified sandbox tax scenarios explicitly. Example test rule `{"PA-15201":{"taxBps":750,"taxShipping":true}}` uses a fictional tax rate. Set `taxBps:0` only where the test policy explicitly calls for no tax. |
| `STUDIO_MAX_QUANTITY` | Integer from 1 to 10. Defaults to 10. |
| `STUDIO_MAX_FULFILLMENT_CENTS` | Required per-order wholesale spend cap in USD cents. |
| `STUDIO_DAILY_FULFILLMENT_CENTS` | Required cumulative cap in USD cents, at least the per-order cap. The reservation day is UTC. |

## Upload the five originals privately

The uploader writes the JPGs directly to the Netlify Blobs SDK over HTTPS. It validates all five local files against the approved SHA-256 hashes before writing anything. It caps each file at 15 MB for headroom under the 20 MB streamed-response limit, creates immutable keys using a conditional write, and verifies the bytes read back. It preserves the original pixels, metadata, and JPEG encoding. Both supported sizes use the same approved 3:4 master for each artwork.

1. On your own computer, save the originals in a folder **outside the repository**, keeping the exact filenames in the [source manifest](studio-print-photographs.json). The Mother Nature filename contains two spaces after `STUDIO`. From your local checkout of PR #95, install the pinned dependencies with `npm ci`.
2. In the existing Netlify project, copy its **Project ID** (formerly Site ID) from **Project configuration → General → Project information**. Create a short-lived Netlify personal access token under **User settings → Applications → Personal access tokens** using an account authorized on that project. If your team enforces SAML SSO, grant the token access to that team when creating it. This upload token is only used in your local shell. The deployed function uses Netlify’s own Blob access.
3. From the repository root, run these commands in Bash, substituting your local folder. The token prompt hides typed input.

```bash
unset NETLIFY_BLOBS_CONTEXT
read -r -p 'Netlify Project ID: ' NETLIFY_SITE_ID
read -r -s -p 'Netlify personal access token: ' NETLIFY_AUTH_TOKEN
printf '\n'
NETLIFY_SITE_ID="$NETLIFY_SITE_ID" NETLIFY_AUTH_TOKEN="$NETLIFY_AUTH_TOKEN" \
  node scripts/upload-studio-masters.mjs "/path/to/private/originals"
unset NETLIFY_SITE_ID NETLIFY_AUTH_TOKEN
```

4. Check for five verified messages. Re-running the uploader is safe if interrupted. Revoke the upload token after verifying the storage. Never put the JPGs, token, or signed URLs in Git, the public build, snippets, or shared logs.
5. Set `STUDIO_ARTWORK_SIGNING_KEY`, then redeploy only the draft PR preview. `STUDIO_PRINT_HOST` and `STUDIO_PRINT_FILES` are no longer used and can be removed from that context. Call the authenticated admin endpoint with `{"action":"artwork-status"}` and confirm all five entries report `ready: true`. Quotes and payment links for a master fail closed until that master is uploaded. Any older sandbox quote or order tied to an external artwork path needs manual reconciliation under the prior binding.

If the upload fails, use the operation and HTTP status printed by the uploader. A 401 or 403 from the Netlify API points to authentication or project permissions. A 403 during Blob transfer means the API issued a signed transfer but the storage endpoint rejected it. A 404 on the initial metadata check is expected when the object is absent. A 409 or 412 on conditional creation means the uploader must verify the competing write before accepting it. A verification error with HTTP 200 means the response arrived but its stored metadata or bytes did not match the approved original. The uploader never overwrites a mismatched Blob, and it omits credentials, URLs, and provider response bodies from diagnostics.

The HTTPS download only accepts a signed GET or HEAD from the configured sandbox preview origin. Links are scoped to a single immutable JPG, expire after 48 hours, and allow whoever holds the link to fetch that JPG during the window. Links are sent only to Prodigi and the function disables caching. The admin approval action refreshes the draft item’s URL, verifies the updated draft and spending cap, then submits. A failed URL renewal is retryable and never starts submission. Ambiguous submission still requires reconciliation.

## Diagnose preview status

Confirm Netlify marks the latest PR #95 commit as a Deploy Preview. Visit the public `/api/studio-print/status` once, then open **Logs & Metrics → Functions → studio-print** in Netlify for that preview. Filter for `[studio-print configuration]`. The function logs allowlisted variable names and missing or invalid classifications. It never logs the values, parser errors, or credentials. The public response stays generic.

- **404 Studio Print checkout is unavailable** means `STUDIO_SANDBOX_ENABLED` is missing or differs from the exact string `true`, or trusted Netlify `context.deploy.context` is missing or outside the sandbox allowlist. Check **Functions** scope and **Deploy Previews** context for the activation setting. The function reads Netlify's invocation metadata, so do not create a custom `CONTEXT` environment variable.
- **503 Sandbox checkout configuration is incomplete** means one or more required settings failed validation. Use the named logs and the environment variable table above. A webhook URL origin mismatch returns **404 Not found** and is logged separately.
- **200 sandbox: false** means an activation switch or the private Blob pause is off. Check the named activation settings or the existing sandbox pause controls. A **200 sandbox: true** confirms configuration and checkout activation. Use authenticated `artwork-status` to verify master readiness independently.

After correcting a setting, redeploy PR #95 only and repeat the GET. Do not dump the function environment into a response or share screenshots showing secret values.

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

- Verify the two SKUs and both size checkouts with sandbox credentials, provider quote fields, USD draft cost and actual supplier billing fields. Check the largest master with a provider-backed sandbox draft and delayed approval, including that Prodigi can stream the JPG and retains the renewed URL. Validate print quality and U.S. routing with representative addresses. Verify Netlify rate limits and the two pause controls.
- Verify Square’s receipt settings. The operator can retrieve tracking in the admin order view and send it to the buyer using an approved support channel. Automatic shipment emails still require a configured notification workflow. Do not advertise them before that workflow is tested.
- Establish legally reviewed tax, cancellation and shipping policies, address deliverability, refund handling, operator identity/MFA, payment reconciliation and PII retention. Keep automated fulfillment disabled.
- Confirm that Prodigi accepts the Square Debit Card and that sufficient cleared funds are available. Keep a funding buffer for settlement delays, refunds and exchange-rate or production cost changes. No billing method is configured here.
- Review the provider-backed results before requesting production approval. The code and endpoints remain sandbox-only.
