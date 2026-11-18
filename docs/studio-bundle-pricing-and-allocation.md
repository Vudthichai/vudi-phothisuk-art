# Studio size pricing and collection bundles

The shared `studioSizes` metadata confirms 9 × 12 at $45 and 12 × 16 at $95.
Product pages show the selected size's price and announce it through the existing
live size note. Individual cards retain Starting at $45 — Coming Soon. All five
prints use the same size/price definitions. Checkout remains absent.

| Bundle | Prints | Retail value | Collection price | Savings |
| --- | --- | --- | --- | --- |
| 9 × 12 inches | All five, one each | $225 | $175 | $50 |
| 12 × 16 inches | All five, one each | $475 | $425 | $50 |

Both options remain Coming Soon. No buy-four/get-one promotion is introduced.

## Future revenue allocation; no donation calculation

Each bundle records all five edition/artwork IDs, quantity one, standalone-retail
allocation weights, and their common denominator. Weights are 4,500/22,500 for
9×12 and 9,500/47,500 for 12×16: each print accounts for one fifth of its bundle.
A future sales adapter can apply these ratios to actual bundle revenue and retain
an auditable per-print allocation. Monetary rounding must reconcile to the actual
bundle revenue; the adapter is not implemented here.

The 75 Leaves line references its existing 75%-of-profits commitment with recipient
unannounced. A Forest Forgotten references its existing 20%-of-profits commitment
to Junglekeepers. The metadata does not equate allocated revenue with profit.
`profitCalculation.status` is blocked pending confirmed production costs, payment
fees and fulfillment expenses. There are no cost defaults, profit amounts, donation
amounts, payment hooks or transfer functions. A future implementation must confirm
expense attribution and accounting inputs before calculating contributions.

## Description integration and future photography

A Forest Forgotten now commits 20% of profits from its original artwork,
individual Studio Prints and applicable bundle share to Junglekeepers. The prior
10%-of-original-sale commitment is superseded. Original pages use one shared
statement covering the original and its Studio Prints; print pages retain their
print-specific 20% wording. Available Art's original card has a concise giving
note. The scope is explicit in contribution metadata and carried into bundle
allocation lines. 75 Leaves remains 75% of Studio Print profits with recipient
unannounced; it does not acquire an original-artwork donation commitment.

The original story paragraphs remain unchanged; giving stays in a separate section.
No original painting prices or availability change. POD costs remain unknown.
No cost defaults, profit calculations, donation amounts or transfers are added.

`studioCollectionBundle.galleryWallImage` is an optional approved image slot, set
to null. Its conditional figure renders nothing until an authentic, approved image
is supplied. There is no placeholder, empty visual space, new image or mockup.
Existing room images remain unmodified; their physical frame size is unverified,
as documented in the prior mockup inspection. No image is rescaled in the room
when a different print size is selected.

## Validation

TypeScript, 128 tests across 23 files, the 41-page production build, SEO checks and
git diff --check pass. Targeted tests verify size switching, bundle totals/savings,
allocation weight reconciliation and blocked calculations, no checkout/placeholder,
and print-only giving on both original-page contexts. Original price/availability
and existing image/gallery tests remain passing. No production deployment or merge.
Browser verification at 390/768/1440 CSS pixels confirms both bundles on Studio,
Available Art and Forest collection pages, $40/$95 switching for all five products,
unchanged approved room image references, integrated print giving on both original
contexts, preserved original pledge/Not for Sale, and no horizontal overflow or
runtime exceptions. Desktop/mobile screenshots are provided in the task response.
Actual iOS Safari hardware was not available.
