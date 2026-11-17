# Studio storefront refinement — review branch

## Routes and hierarchy

- `/studio-editions/` is the dedicated five-print listing.
- `/studio-editions/{mother-nature,ethereal-bloom,tiger-lily,75-leaves,a-forest-forgotten}/`
  are standalone products, separate from the original artwork URLs.
- Eligible originals retain all existing photography, copy and acquisition
  information. Their compact print preview now sits immediately after the original
  inquiry (or Not for Sale statement), before neighboring-artwork navigation.
- Available Art groups Forest originals, Forest Studio Editions, then existing
  Oceans and Regal listings in their unchanged internal order. Forest records are
  still provisional; eight original-artwork links are explicitly inquiry-only,
  not claims of confirmed availability. Tiger Lily and 75 Leaves are not offered
  as available originals. Their existing collection/detail pages remain visible.
- No new header item was added. Listing links on collection/Available Art sections,
  image/title links, product breadcrumbs and original-artwork links connect the
  experience without crowding navigation. Existing artwork URLs are unchanged.

## Central configuration

`src/studio/editions.ts` controls products, starting price, Coming Soon status,
product paths, bundle and intended sizes. `studioSizes` contains 9×12 and 12×16
inches; each has `priceCents: null`. Selecting a size does not assign a final price
or change Starting at $40. A concise note says size-specific prices await
confirmation. Both intended sizes can be updated in one place after provider
selection; no provider was selected or connected.

`print-photographs.json` continues to map the five approved artist-supplied print
designs, without original-painting fallbacks. Product galleries reuse the same
responsive web derivatives and accessible fullscreen zoom/pan viewer for closer
inspection. No paper textures, physical-print photographs or details were invented.
There is no checkout, card collection, shipping, order handling or automatic
contribution transfer. The approved five-print bundle remains Coming Soon at $175.

`contributions.ts` separately retains A Forest Forgotten's 20% profit intention for
Junglekeepers and 75 Leaves' 75% intention with an undecided veterans beneficiary.
No new charity language is shown, and final wording/accounting remain unapproved.

## Mother Nature visual template — approval pending

Run `npm run dev`, open `/dev/studio-template`. This reference exists **only in
Vite development**. Its lazy module and CSS are excluded from production bundles;
it has no production catalog entry, prerendered page or sitemap route.

The reusable study puts the exact approved print design in a restrained dark frame
on a warm neutral CSS wall. It uses consistent lighting/shadow treatment and no
invented furnishings. Changing 9×12 to 12×16 increases width/height by 4/3 in the
same reference field. This is relative sizing, **not verified real-room scale**.
The page is explicitly labeled as a presentation study, not an interior photograph.
No AI-generated artwork or mockup photograph was used.

Only Mother Nature is assigned to the wall study. Approve its template before
extending wall mockups to the other four prints. All five core product pages use
the already approved clean print-design presentation; no unapproved framed-room
imagery is exposed on those pages.

### Assets still needed for the final three-image gallery

None of the five approved print-design files is missing. All were verified in the
previous print revision. For actual photographed gallery views, supply/approve:

1. A shared neutral-wall/frame scene with known reference dimensions, camera
   alignment and lighting, or five matched framed-print photographs. Real-room
   scale must be measured rather than inferred from a generated scene.
2. Genuine print-detail photography for Mother Nature, Ethereal Bloom, Tiger Lily,
   75 Leaves and A Forest Forgotten if physical paper/ink/finish is to be shown.

The current clean view is the supplied design, not proof of a manufactured sample.
The detail control offers zoom of that exact design instead of fabricating a paper
surface or publishing a cropped/altered artwork file. A future approved gallery
can attach wall and detail assets by product without changing product routing or
size/pricing logic. No original production masters were added to public assets.

## SEO and review

Six new pages are prerendered using the existing pipeline, with unique titles,
canonical URLs, descriptions, sitemap/image entries and new 1200×630 sharing
images composed from the approved complete designs. Product schema has no Offers
or final variant price claims. The 35 existing public routes are preserved.
Unknown products retain the existing not-found handling. Dev study is excluded.

Local review: `/studio-editions/mother-nature/`, the original Mother Nature page's
`#studio-edition` section, `/available-art/`, and `/dev/studio-template` (dev only).
Screenshots are supplied in the task response. No merge or publication is
permitted until explicit approval; the Mother Nature wall template is still a
proposal, not an approved rollout to all artworks.
