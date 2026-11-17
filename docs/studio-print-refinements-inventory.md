# Studio Prints and original inventory review

## Original artwork inventory

Baseline: main at b808f5d. No existing retail price was listed in either collection’s data or rendered original listings. Only records explicitly marked `available` receive the proposed $2,000 price. Availability is unchanged.

| Collection | Painting | Existing listed price | Availability | Proposed retail | Artwork URL |
| --- | --- | --- | --- | --- | --- |
| The Oceans | Summer Swells | Not listed | Sold | Unchanged — excluded | [View artwork](https://vudiphothisukart.com/collections/oceans/summer-swells/) |
| The Oceans | Manta | Not listed | Sold | Unchanged — excluded | [View artwork](https://vudiphothisukart.com/collections/oceans/manta/) |
| The Oceans | Dark Scales | Not listed | Sold | Unchanged — excluded | [View artwork](https://vudiphothisukart.com/collections/oceans/dark-scales/) |
| The Oceans | Mermaid Tail | Not listed | Available | $2,000 | [View artwork](https://vudiphothisukart.com/collections/oceans/mermaid-tail/) |
| The Oceans | Beach Day | Not listed | Sold | Unchanged — excluded | [View artwork](https://vudiphothisukart.com/collections/oceans/beach-day/) |
| The Oceans | Arctic Waves | Not listed | Available | $2,000 | [View artwork](https://vudiphothisukart.com/collections/oceans/arctic-waves/) |
| The Oceans | Water’s Edge | Not listed | Available | $2,000 | [View artwork](https://vudiphothisukart.com/collections/oceans/water-s-edge/) |
| The Oceans | Golden Sand Beach | Not listed | Sold | Unchanged — excluded | [View artwork](https://vudiphothisukart.com/collections/oceans/golden-sand-beach/) |
| The Oceans | Sunset Waves | Not listed | Sold | Unchanged — excluded | [View artwork](https://vudiphothisukart.com/collections/oceans/sunset-waves/) |
| The Oceans | Arctic Ocean | Not listed | Available | $2,000 | [View artwork](https://vudiphothisukart.com/collections/oceans/arctic-ocean/) |
| The Oceans | The Oceans | Not listed | Available | $2,000 | [View artwork](https://vudiphothisukart.com/collections/oceans/the-oceans/) |
| The Regal Collection | Carnations | Not listed | Sold | Unchanged — excluded | [View artwork](https://vudiphothisukart.com/collections/regal-collection/carnations/) |
| The Regal Collection | Navy | Not listed | Sold | Unchanged — excluded | [View artwork](https://vudiphothisukart.com/collections/regal-collection/navy/) |
| The Regal Collection | Sahara | Not listed | Available | $2,000 | [View artwork](https://vudiphothisukart.com/collections/regal-collection/sahara/) |
| The Regal Collection | Verdant | Not listed | Sold | Unchanged — excluded | [View artwork](https://vudiphothisukart.com/collections/regal-collection/verdant/) |
| The Regal Collection | Ciaran | Not listed | Sold | Unchanged — excluded | [View artwork](https://vudiphothisukart.com/collections/regal-collection/ciaran/) |

Six eligible works total $12,000 at the proposed retail price. Beach Day is sold in the current catalog and is excluded. No uncertain availability records were found in these two collections. These are catalog statuses, not a new stock verification. Existing dimensions, medium, descriptions and photography are preserved.

## Studio pricing audit

- Shared confirmed starting price: $40 USD. Coming Soon remains visible.
- Both 9 × 12 and 12 × 16 options have null size-specific prices. They remain explicitly provisional; the selected-size note states pricing is unconfirmed.
- No checkout, offers schema, fulfillment integration or invented size price.
- Existing five-print bundle remains $175, unchanged.

## Description and image integrity

Each product reuses the first two original painting paragraphs without editing their language. The heading identifies them as descriptions of the original painting; a separate sentence identifies the print as a fine-art reproduction. The original-only charity paragraph for A Forest Forgotten is not copied into print marketing. No physical sculptural texture, individual signature or paper stock is promised for the reproduction.

All approved room composites and authentic print-design files are unchanged. Only CSS adds contact/ambient shadows and a neutral surround to Artwork Detail. Images retain their entire aspect ratio and original pixel colors. In a Space remains the primary view; no room photograph is altered.

## Delivery scope

This extends unmerged draft PR #69. Its earlier Forest & Flowers pricing commit remains intact; this refinement makes no changes to those original prices. No merge or production deployment is authorized by this task.

All six eligible records have an existing artwork URL, photograph, description,
dimensions and medium. The missing baseline price is explicitly recorded above.

## Verification and previews

TypeScript, 122 tests across 21 files, the 41-page production build, SEO checks and
`git diff --check` pass. Chromium checks at 390, 768 and 1440 CSS pixels cover all
five product titles, gallery controls, four related cards excluding the current
work, standalone paper shadows, no checkout, all six original prices and absence
of horizontal overflow/runtime exceptions. Actual iOS Safari hardware was not
available. Existing Forest availability/Dragon Lily metadata warnings are unchanged.
No dependencies or image assets were added or changed.

Review screenshots are in `/workspace/previews/studio-refinements/`, with paired
390/1440px views for the Studio collection, Mother Nature, Artwork Detail,
Explore the Collection, Oceans, Regal and Available Art originals.

## Every changed file in the draft PR

| File | Change |
| --- | --- |
| `public/forest-preview/collection.json` | Earlier approved eight Forest original prices, unchanged by this refinement. |
| `src/forest/types.ts` | Earlier optional Forest price field, retained. |
| `src/forest/ForestCollection.tsx` | Earlier Forest collection/detail price presentation, retained. |
| `src/forest-collection.test.tsx` | Earlier eight-price and not-for-sale checks, retained. |
| `src/oceans.json` | Proposed $2,000 prices on five explicitly available originals. |
| `src/regal.json` | Proposed $2,000 price on Sahara only. |
| `src/data.ts` | Optional original-artwork USD price field. |
| `src/components/OriginalPrice.tsx` | Shared available-only formatted price presentation. |
| `src/components/OceanCollection.tsx` | Price beside available Oceans painting metadata. |
| `src/components/RegalCollection.tsx` | Price beside available Regal painting metadata. |
| `src/pages/Pages.tsx` | Original detail-page price using shared availability guard. |
| `src/pages/AvailableArt.tsx` | Matching prices in earlier-collection listings. |
| `src/studio/StudioStore.tsx` | Studio Print identification, original descriptions, reproduction explanation, explicit provisional sizes and new related collection. |
| `src/studio/StudioStore.css` | Scoped paper depth, description styling and responsive four/two-column related grid. Removes obsolete neighbor styles. |
| `src/studio/gallery.ts` | In a Space / Artwork Detail labels; images unchanged. |
| `src/studio/StudioEditions.tsx` | Reusable card with optional Studio Print identification only in related products. |
| `src/studio/StudioPrintNavigation.tsx` | Removed obsolete previous/next navigation. |
| `src/studio/ExploreStudioCollection.tsx` | Four related Studio Print cards excluding the current artwork. |
| `src/seo/catalog.ts` | Studio Print browser titles, descriptions and Product names. |
| `src/studio-store.test.tsx` | Titles, descriptions, provisional price consistency and no checkout checks. |
| `src/studio-v2.test.tsx` | All four related links, current-product exclusion and gallery behavior. |
| `src/mother-nature-reference.test.tsx` | New gallery labels while preserving exact image references. |
| `src/availability.test.tsx` | Six $2,000 listings/detail pages; sold pages retain no price/inquiry. |
| `docs/studio-print-refinements-inventory.md` | Full inventory, pricing audit, scope, file summary and validation. |
