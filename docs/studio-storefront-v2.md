# Studio Editions storefront V2

## Audit before editing

Already present: five standalone product pages, listing and product links,
original-to-print previews, original artwork URLs and inquiry controls, intended
size selectors with null variant prices, Starting at $40 / Coming Soon, approved
clean print designs, responsive two-column product layout, zoom viewer, six new
SEO routes/social cards, separate pending charity configuration, and a private
Mother Nature CSS framing study. No checkout or supplier integration exists.

Needed refinement: print-to-print navigation, an explicit Earlier Collections
region, image normalization for the eight inquiry-only Forest original cards,
approval-aware multi-view gallery slots, conditional lifestyle hover, and future
supplier-independent contracts. Approved framed/lifestyle photography is missing.
No Nashid Chroma screenshots were available as workspace files in this request;
no branding or layout was copied from that store.

## Implemented

- Reused the existing shared product layout for all five prints. Navigation order:
  Mother Nature → Ethereal Bloom → Tiger Lily → 75 Leaves → A Forest Forgotten,
  wrapping both directions. Thumbnail links are explicitly labeled Previous/Next
  Studio Edition; View All Studio Editions remains visible at both ends.
- Added `gallery.ts`: clean view always uses the approved print design; additional
  framed/lifestyle/detail slots render only with artist-approved status. No
  invented wall scene, original-canvas fallback or misleading empty image slot.
  Product view buttons support click, touch and keyboard; the existing viewer
  enlarges the selected approved image and supports zoom/pan.
- Listing cards retain image/title/starting price/status only. When an approved
  lifestyle asset is configured, fine-pointer hover or keyboard focus can swap
  to that image. Reduced motion avoids transitions. Touch cards remain a direct
  product link; explicit product-page view buttons provide the alternative view.
  Since no lifestyle assets are approved, all current cards remain clean images.
- Forest original cards use equal 4:5 image containers, absolute image placement
  and object-fit: contain. Their narrower portrait proportions fit by height,
  normalizing visible height while preserving the full source, canvas border and
  signature. No source image, color, crop or collection order was changed.
- Available Art now has three named regions: Forest originals, Forest Studio
  Editions, Earlier Collections. Earlier Oceans/Regal cards keep their existing
  relative order, featured horizontal Oceans presentation and inquiry links.
  Heading levels were adjusted to reflect the hierarchy, preserving styling.
- Kept original availability records unchanged: eight Forest originals are still
  recorded as provisional and are presented by inquiry. Tiger Lily and 75 Leaves
  originals remain Not for Sale and absent from this inquiry grid. Six confirmed
  earlier available paintings remain, not counting the five separate prints.
- Existing original photography, descriptions, inquiries, footer/header and SEO
  route catalog are preserved. Print master files remain outside public assets.

## Missing approved visual assets — do not fabricate

All five clean print-design files are available and correctly matched. The
remaining missing product views are:

| Print | Framed product image | Shared-scene lifestyle image |
| --- | --- | --- |
| Mother Nature | Not supplied/approved | Not supplied/approved |
| Ethereal Bloom | Not supplied/approved | Not supplied/approved |
| Tiger Lily | Not supplied/approved | Not supplied/approved |
| 75 Leaves | Not supplied/approved | Not supplied/approved |
| A Forest Forgotten | Not supplied/approved | Not supplied/approved |

Supply a straight-on shared neutral interior/frame scene with measured reference
scale and mounting geometry, or five consistently photographed framed prints.
Approve Mother Nature first, at intended 9×12 and 12×16 sizes, before assigning the
same scene to other designs. Maintain exact complete design placement/border and
label mockups as such. A source scene without measurements cannot establish real
physical print scale. The existing CSS framing study is relative-size only,
development-only, and is not published as photography. It remains available via
`npm run dev` at `/dev/studio-template`.

Optional real print-detail photographs are missing for all five prints. Until
provided, the existing detail control enlarges the exact approved design; it does
not invent paper grain, finish, ink, signature or physical-production detail.

Register approved public-resolution views under `additionalStudioViews[edition.id]`
with unique IDs, kind/label, image variants, approval and verified size IDs.
Framed/lifestyle slots require verification for the selected size; unverified
sizes omit that view. Changing size resets the clean view rather than reusing a
wrong-scale scene.
Unapproved slots do not render. No generated images were used in this update.

## Future outsourced fulfillment — contracts only

`server/commerce/contracts.ts` is type-checked but never imported into browser
code. It is a contract outline, not a backend. There are no network calls,
credentials, provider mappings, endpoints, vault keys or live orders.

- **Public product catalog:** stable edition ID, starting price, editable intended
  sizes, approved web views and Coming Soon. Future approved finish/frame option
  catalogs can supply IDs; no paper/finish/frame option is invented now. Keep
  actual final option prices null until approved. Original artwork stock remains
  separate from print variants and supplier stock.
- **Private supplier binding:** selection (product/size/optional finish/frame) maps
  to supplier product/variant IDs, supported countries and an opaque private
  production-asset vault key. Actual print files and signed transfer URLs must
  never enter the public catalog, repository, HTML, JS or browser analytics.
  Future server-side authorized transfer should be short-lived and logged.
- **Adapter boundary:** submit a verified paid order idempotently, normalize
  authenticated supplier tracking events, and submit only approved replacement
  requests. A provider will be selected later; there is no implementation now.
  Payment verification must precede fulfillment; a redirect is not proof of pay.
- **Order lifecycle:** payment-pending → paid → submission-pending → submitted →
  in-production → shipped → delivered; cancellation/refund/needs-review branches.
  Persist IDs and event deduplication in future approved durable storage. Handle
  supplier timeouts/retries, duplicate webhooks and refund/production races with
  reconciliation/manual recovery, never silent duplicate orders.
- **Damage replacements:** bind evidence and line ID to the original order;
  approval is pending/approved/declined. Validate policy and supplier liability
  before production; use separate idempotency keys and preserve financial audit
  trails. No automatic replacement, return or delivery promises are made now.
- **International shipping:** later confirm provider countries, region routing,
  print quality samples, taxes/customs, address validation, currencies, real quotes,
  delivery estimates and failure handling. No unsupported global-shipping claim.
- **Customer notifications:** provider/payment/order events should drive one
  agreed receipt/status sender, with approved branding, delivery estimates and
  tracking. Customer data requires limited access/retention. No email capture or
  notification service is activated. Packaging/referrals/affiliates remain future
  approved configuration, not invented partnerships or current features.
- **Contribution reporting:** keep approved beneficiary/percent terms separate;
  ledger allocates revenue, approved costs and refund adjustments per edition.
  Final profit definition/bundle allocation/beneficiary remain pending. Review and
  reconcile before transfers; do not imply endorsement or completed donations.

Before implementation: choose and test physical samples from a fulfillment
partner, approve variant SKUs/specs/prices/margins, packaging and geographic
policies, private asset transfer, checkout platform, durable order store and
webhook security. Test sandbox failures, duplicate events, stock/quote changes,
refunds, replacements and status messages before separately authorized activation.
The existing Square/POD research remains a reference, not a selected provider.

## Review

Local routes: `/studio-editions/mother-nature/`, `/studio-editions/`,
`/available-art/`; original URLs and `/dev/studio-template` (development only).
Screenshots in the task response show the Mother Nature product/navigation and
Available Art refinement. Framed/lifestyle views and their hover swaps cannot be
visually verified until approved assets are supplied. No merge or production
publication without explicit approval.

Validation: TypeScript (including the server-only contracts), all 116 tests,
production build and SEO checks passed. Browser checks at 375/768/1440px covered
all five products, next/previous wraparound, original links, size selection,
image loading, equal contained Forest image heights, preserved 8/5/6 counts and
no horizontal overflow/runtime errors. Targeted gallery tests also check pending
asset rejection and resetting to clean when another size lacks verified imagery.
No actual Safari/device testing was performed; no new dependencies or image
assets were installed. Existing provisional-original metadata warnings remain.

## Product mockup revision

See [mockup review notes](studio-product-mockups.md) for newly composited gallery/
lifestyle views from the approved designs and explicit modeled-size assumptions.
