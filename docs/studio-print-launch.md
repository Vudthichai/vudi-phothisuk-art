# Studio Print launch checklist

This is the clean implementation from production commit `3060ae2`. The five
unsigned Studio Prints are Mother Nature, Ethereal Bloom, Tiger Lily, 75 Leaves,
and A Forest Forgotten. Prices and the catalog SKUs live in
[studio-catalog.json](../server/commerce/studio-catalog.json). Collector’s Editions
have no checkout mapping.

The reviewed order contains the address, one artwork/size, a quantity of one, and
itemized print, shipping, and tax amounts. The server only accepts configured
contiguous-U.S. state/ZIP pairs. It uses approved shipping rates and tax policy
rather than exposing a supplier quote as customer shipping. Before issuing the
Square link it verifies the selected Lustre 240gsm catalogue variant, master
availability, current Standard USD supplier quote, customer cap, and supplier
cap. A Square event must authenticate and independently match a completed,
unrefunded payment and the stored order to open one Prodigi draft. Approval is a
separate operator action. It rechecks the payment, draft contents, approved cost,
and current USD draft total. It verifies artwork access before locking approval
and submits the existing draft without editing its items.

## Setup, in order

1. Leave all deploys **off** while reviewing the code. The checked-in launch
   policy has the confirmed Square seller and location IDs and no approved
   destinations. Nothing can be purchased with the checked-in defaults.
2. Obtain the Production access token and active U.S. Square location ID from
   the existing Square Developer Console app. Obtain the corresponding seller’s
   merchant ID from Square. Confirm real payment processing is enabled at that
   location. Get the v5 live key from Prodigi’s live dashboard, prefix it with
   `live_` once, and confirm the billing method in Prodigi. The same provider key
   is used with the documented v4 Standard quote endpoint and the v5 order API.
3. The confirmed Square merchant ID and location ID are set in [studio-policy.json](../server/commerce/studio-policy.json).
   The configured private-test origin is [Deploy Preview #103](https://deploy-preview-103--vudi-phothisuk-art.netlify.app).
   Keep production bound to the existing website origin. Verify the existing **Production
   environment** Square webhook is set for `payment.created` and `payment.updated`
   at that approved origin plus `/api/studio-print/webhook`. Copy the signature
   key directly to Netlify. A live test uses Square’s production provider
   environment even though the website stays on a Deploy Preview. When
   separately approved for public launch, update the subscription to the exact
   production URL and use its current signature key. No Prodigi webhook is needed.
4. In **Netlify → Project configuration → Environment variables**, use
   **Functions → Deploy Previews** for the private test. Add no Production value
   until explicitly approved. Mark the five credential/key variables as secrets.

   | Variable | Value |
   | --- | --- |
   | `STUDIO_MODE` | Omit or use `off` while preparing. Use `live-test` only with explicit authorization, on the fixed preview. `live` is accepted only on a trusted production deploy and requires separate authorization. |
   | `SQUARE_ACCESS_TOKEN` | Production access token for the configured seller. |
   | `SQUARE_WEBHOOK_SIGNATURE_KEY` | Exact subscription’s signature key. |
   | `PRODIGI_API_KEY` | Live-issued key, with the `live_` prefix. |
   | `STUDIO_MASTER_KEY` | Generate with `openssl rand -hex 32`. Separate keys are derived for recipient encryption, artwork signing, and test invites. Keep this key stable for existing records, and separate between contexts. |
   | `STUDIO_ADMIN_TOKEN` | Generate independently with `openssl rand -hex 32`. Use from a trusted operator terminal. |

5. With `STUDIO_MODE=off`, invoke the authenticated, read-only `preflight` admin
   action below on Deploy Preview #103. No mode change or destination
   configuration is needed. It checks the Square seller and active
   USD location, both Prodigi SKU dimensions and paper, available U.S. Standard
   quote/currency and fulfillment countries, and the existence of all five
   verified private masters. This checks that webhook configuration is present. Authenticating an actual
   Square delivery remains a separate test. Do not paste keys or share invite links in chat or Git.
6. Review and record the actual approved shipping rates and landed supplier
   allowances for **each size** in each permitted ZIP. Have the applicable sales
   tax policy approved first, including whether shipping is taxable. The
   approved test policy contains only `PA-15024`, with $12.85 customer-paid
   shipping, 7% sales tax including shipping, and supplier allowances of $25.85
   and $26.85 for the two sizes. Each `destinations` entry has
   `shippingCents` and `approvedSupplierCents` maps containing `9x12` and
   `12x16`, a `taxBps` integer, and a boolean `taxShipping`. A quote issued
   for U.S. shipping is country-level; verify supported destinations and all-in
   supplier charges before approving their rules.

## Diagnose Prodigi authentication

Preflight uses two Prodigi versions. v5 calls `GET /v5/catalogue/variants/{sku}`
on `api.prodigi.com` with the complete live-prefixed key in `X-API-Key`. v4
calls `POST /v4.0/quotes` on that same live host with the prefix stripped from
the configured key. The v4 docs select live vs. sandbox by host. v5 selects it
by key prefix. Both calls are read-only for fulfillment purposes.

If you see a generic 502, select Deploy Preview #103 and the `studio-print`
function under Netlify **Cloud compute → Functions**. Filter for
`[studio-print provider]`. A catalogue rejection is logged as a v5 GET with
its catalog SKU. A quote rejection is logged as a v4 POST. The log contains
only the fixed endpoint, public SKU where applicable, and HTTP status. If v5
passes and v4 rejects, the key used by v4 needs separate verification with
Prodigi support. Keep credentials out of log excerpts and tickets.

## Operator commands and controlled test

Run in Bash. Enter the approved preview URL without its trailing slash, then
paste the admin token at the hidden prompt.

```bash
read -r -p 'Studio Print origin: ' STUDIO_ORIGIN
read -r -s -p 'Studio Print admin token: ' STUDIO_OPERATOR_TOKEN
printf '\n'
studio_admin() {
  printf 'header = "Authorization: Bearer %s"\n' "$STUDIO_OPERATOR_TOKEN" |
    curl --config - --fail-with-body -sS "$STUDIO_ORIGIN/api/studio-print/admin" \
      -H 'Content-Type: application/json' --data "$1"
}
studio_admin '{"action":"preflight"}' | jq -e '
  if (.artwork | length == 5 and all(.[]; .ready == true)) then .artwork
  else error("Expected five ready private artwork masters") end
'
```

- Verify the configured provider results and private files first. If any SKU,
  cost, download, or currency is unsupported, leave checkout off. Receipt and
  paid webhook behavior require a real authorized checkout. Draft URL fetch,
  draft cost response, and approval/submit behavior require a real provider
  draft. Delivery and tracking require actual fulfillment.
- With separate permission to test a card, request
  `studio_admin '{"action":"test-invite"}'`. Privately open
  `/studio-editions/mother-nature/#studio-test=<invite>` on the approved preview.
  The browser removes the fragment and keeps the invite in memory. Use your
  approved address. The mode allows one Mother Nature 9 × 12 print at $45, with
  a **$65 customer total cap** and **$35 supplier cap**. An atomic test claim
  allows one reviewed order per test run, and retries of that order reuse the
  Square idempotency key. Reconcile an uncertain link in Square before trying
  again. An issued Square link can outlive a site pause or browser review, so
  deactivate it in Square if the test is abandoned.
- Use `studio_admin '{"action":"list"}'` to find the Square order ID.
  Run `view` with that `orderId` to verify payment, address (in the provider draft),
  the Prodigi draft, artwork proof, and costs. Only with separate authorization
  submit via `studio_admin '{"action":"approve","orderId":"<Square order ID>"}'`.
  Check the quoted supplier charge against the cap, including any charges
  identified by Prodigi. If the final charge cannot be verified, stop. The
  planned maximum exposure is $80 across the two transactions, subject to
  supplier billing after submission. The integration never submits from a webhook.
- Use `view` for tracking, and send it with the existing business email. Square
  handles the payment receipt; verify it arrives in the controlled purchase.
  `pause` stops new checkout and fulfillment from this function. Reconcile any
  already issued links separately. For a paid missing draft, use
  `retry-draft` with the Square payment ID. If an approval timed out, use
  `refresh` first; an ambiguous submission remains locked unless reconciled.
  Consult Prodigi before using `reset-approval` with
  `confirm: "confirmed-no-submission"`.
- Clear the local operator token with `unset STUDIO_OPERATOR_TOKEN STUDIO_ORIGIN`
  and close the test. Decide separately whether to enable the public store.

The existing private `studio-print-masters-sandbox` site-wide Blob store is
reused without copying, overwriting, or publishing the originals. The optional
local uploader `scripts/upload-studio-masters.mjs` is only for a missing original.
Supply a local `NETLIFY_SITE_ID` and short-lived `NETLIFY_AUTH_TOKEN` if needed;
these are not deployment variables. New drafts carry a stable, per-order
artwork URL backed by a 48-hour access lease. Approval can extend that lease
without changing the URL, up to a hard deadline 30 days after creation. At
least 24 hours must remain at approval, including for existing signed URLs.
These are operational windows, not a guarantee of Prodigi fetch timing.
Do not put a
whole-preview password in front of the webhook or signed artwork routes, as
Square and Prodigi must be able to reach them.

## Recover the controlled test draft

After separate authorization to repair draft `75431017083608576`, run
`python3 -I scripts/recover-mother-nature-draft.py` from this branch. The script
verifies the paid order and authenticates the original private artwork, then
asks separately before adding the replacement line and removing the exact
broken line. It never submits the draft. Reconcile any uncertain result in
Prodigi before further writes. Preview approval conflicts report a sanitized
`code` and `stage`; the function logs those labels without customer data.

## Local checks

```sh
npm ci
npm run test:studio
npm test
npm run build
npm run test:seo
npm run test:coa
npm run test:ar
npm audit
```

The integration suite stubs all provider calls and uses an in-memory Blob store.
It does not contact Square or Prodigi, mint live checkout links, or create orders.
