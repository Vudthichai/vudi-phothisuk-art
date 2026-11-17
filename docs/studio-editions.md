# Studio Editions: staged presentation and future commerce

## Review this phase

Run `npm run dev` and open `/available-art/#studio-editions`,
`/collections/forest-and-flowers/#studio-editions`, or any of the five eligible
artwork pages followed by `#studio-edition`. All presentations say Coming Soon.
No checkout, payment fields, provider SDK, live products, order storage, automated
contributions, or fulfillment connections are implemented. Publishing requires
separate approval; this branch must not be merged or deployed automatically.

`src/studio/editions.ts` defines five reproduction identities separately from the
original artwork inventory. Titles and existing responsive photographs are read
from the authoritative Forest collection records. Originals, descriptions,
availability and acquisition controls are unchanged. The original acquisition
section appears before the supplementary print section on artwork pages.

The five unsigned open-edition reproductions are Mother Nature, Ethereal Bloom,
Tiger Lily, 75 Leaves, and A Forest Forgotten ($40 each). Only their five-print
collection bundle ($175) is prepared. Tiger Lily and 75 Leaves originals remain
Not for Sale. Photographs show the artwork, not fabricated print mockups.

Collector's Editions are deliberately absent from these online presentations.
Their separate plan is signed/numbered editions of 30 per artwork, $75 each,
exclusively in person at the December 5 exhibition. They must never share Studio
Edition checkout identities or be included in its online bundle.

## Assets and decisions still required

No reference photographs are missing. Before accepting orders, obtain approved
print-ready masters and verify resolution, color proofs, complete composition,
borders and bleed for the selected physical products. Web derivatives are not
assumed suitable for printing. Finished print photography/mockups can follow
physical sample approval; do not invent paper, size or production claims now.

Confirm paper, dimensions, production method, sample quality, provider, delivery
regions, shipping charges, tax handling, fulfillment timing, returns and damage
policies. Approve margins at $40/$175 after actual production, fees and shipping.
No delivery or product-specification promises are made in this phase.

Contribution intentions: A Forest Forgotten 20% of profit to Junglekeepers;
75 Leaves 75% of profit to a veterans foundation still to be selected. Approve the
beneficiary, exact profit calculation and eligible costs, bundle allocation,
refund treatment, timing, wording and any necessary organization permissions
before activation. These are intentions, not completed donations or endorsements.
The existing original painting contribution statements are separate and unchanged.

## Future Square / POD integration plan — documentation only

1. **Approved catalog.** Map reproduction IDs to approved Square/POD variants on
   the server. Keep original artwork inventory independent. The bundle expands
   to five individual print line items for fulfillment; agree revenue allocation
   before calculating contributions. Open edition does not imply unlimited
   provider stock or immediate availability.
2. **Payment.** A Square-hosted checkout is a possible lightweight approach.
   Use server-controlled prices and idempotent checkout creation. Future secrets
   belong on the server, never in Vite/browser variables. Validate authorized
   sandbox flows before separately approving live products or payments. Do not
   collect raw card information in this website.
3. **Shipping.** Choose an artist-approved flat-rate policy or quote the selected
   provider with validated destination and cart before finalizing the total.
   Square checkout can collect shipping addresses and accept a shipping fee;
   that alone does not calculate or purchase POD shipping. Refresh expiring
   quotes and handle unsupported destinations before taking payment.
4. **Payment confirmation.** A return/confirmation URL is not proof of payment.
   Verify Square webhook signatures using the raw body, notification URL and
   signature key. Require the appropriate completed payment bound to the known
   order, currency and line items. Ignore unrelated in-person transactions.
   Deduplicate event deliveries and persist idempotent fulfillment state.
5. **Fulfillment.** Printful is an illustrative provider to evaluate, not a chosen
   or connected service. Check fine-art product suitability with physical
   samples. Its draft-order/confirmation flow can separate preparation from
   fulfillment; confirmation can charge the merchant. Do not confirm orders or
   enable automatic fulfillment without explicit approval. Provider/API version
   selection and infrastructure remain future decisions.
6. **Order records.** Select durable storage and retry processing in a future
   approved implementation. Track internal, payment and provider IDs plus paid,
   fulfillment-draft, approved, production, shipped, canceled and refunded
   states. Handle duplicate events, delayed payment, provider outages, refund
   races and manual recovery without double production.
7. **Confirmations and tracking.** Agree whether Square, the provider or the site
   sends each receipt and shipping message. Avoid duplicate or conflicting
   promises. Update tracking from verified provider events. Store only necessary
   customer information with appropriate access and retention; no card data.
8. **Contribution ledger.** Record artist-approved profit inputs, allocation,
   actual costs/fees, refunds and resulting intended amounts by edition. Review
   and reconcile before any manual transfer. Record transfer evidence separately;
   no automated transfers, invented accounting rules or donation claims now.

Before launch, test successful/declined/delayed payments, forged/replayed events,
double clicks, bundle quantities, shipping/tax changes, unavailable variants,
refunds, provider failures and confirmation messages. Obtain separate approval
for commerce activation and publication. No subscriptions or paid services have
been introduced by this phase.

## Official references reviewed

- [Square CreatePaymentLink](https://developer.squareup.com/reference/square/checkout/create-payment-link)
- [Square checkout options: shipping address and fee](https://developer.squareup.com/docs/checkout-api/optional-checkout-configurations)
- [Square webhook signature validation](https://developer.squareup.com/docs/webhooks/step3validate)
- [Square payment events](https://developer.squareup.com/docs/payments-api/webhooks)
- [Printful API: orders, confirmation, shipping rates and webhooks](https://developers.printful.com/docs/)

## Image protection review

See [the image pipeline and public-source audit](artwork-image-protection.md) for
measured resolutions, existing oversized-file exposure, reversible image-only
saving/dragging deterrents, and the recommended separately reviewed cleanup.
No existing public image files have been removed or changed.
