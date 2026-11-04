# Forest & Flowers — temporary preview entrance

The artist explicitly requested a simple browser-side visibility deterrent for a
short friends/family preview, replacing the earlier encrypted server-side gate.

## Use

After the PR is merged and the normal Netlify deployment publishes, visit
`/collections/forest-and-flowers` and enter **Evergreen** (capital E). No Netlify
environment variables, server functions, keys or account changes are required.
Use **Lock collection** to clear access, or **Exit collection** to return to the
existing collections page. Access is remembered in sessionStorage for the current
tab session, including reloads and artwork routes. It is not permanent login.
If storage is blocked, access works for the current view but cannot be remembered.

## Actual privacy limits

This is intentionally NOT password security. The password is in browser JavaScript;
`public/forest-preview/collection.json` and optimized images are publicly downloadable
without it. The public GitHub repository also contains these files. The artist
accepted that tradeoff after clarification. Do not use this mechanism for confidential
content. Existing noindex/nofollow/noarchive metadata and hosting headers remain on
the entrance/artwork routes, with matching headers on static preview assets. These
are indexing requests, not access controls. No new navigation or sitemap entries
were added. The existing navigation/collection status remains unchanged.

The former encrypted package, function, signing/encryption logic, Netlify function
configuration and development adapter were removed. Old Netlify environment variables,
if configured, are unused; there is no need to change them for this preview.
Private keys and original source uploads remain outside Git. They are not published
by this change. The earlier private backup is separate from these public optimized
copies and can remain in the artist's private storage.

## Content and photographs

All ten records, original descriptions, provisional copy flags, dimensions and
availability are unchanged. The first nine descriptions/introduction come from the
artist's PDF; the exact Junglekeepers donation statement is preserved. The final
painting's copy remains provisional and its dimensions/medium unconfirmed.
Eight works show availability to be confirmed and title-specific Inquire for Pricing
links. The two Not for Sale works have no pricing inquiry controls. No numerical
prices or new availability claims were added.

Twelve photographs (24 responsive variants) reuse the optimized temporary images
already prepared: existing Mother Nature, eight photographs extracted from the
artist's PDF, and three uploaded full/angle/detail views for the final painting.
No cropping, recoloring, distortion, replacement art or new image generation.
Original uploaded PDF/JPEGs remain outside Git.

For final photography, replace variants under `public/forest-preview/images/` and
update src/width/height/alt in `public/forest-preview/collection.json`. Components
do not need rewriting. Every image retains its natural proportions with contain.
Existing layout, content, inquiry controls and optional one-shot leaf/petal drift
are unchanged. Rejected/experimental effects remain out of the visitor experience.

## Local review and validation

`npm run dev` now works directly. Open `/collections/forest-and-flowers`; no env file
or special server command. `npm run build` and `npm run preview` work with no private
runtime settings too.

Run `npm test`, `npm run build` and `node scripts/check-private-previews.mjs`.
Tests cover wrong/right passwords, direct artwork entrance, reload/session access,
local relock, content failure, unavailable storage and the existing inventory.
Existing Phase 2–4 experimental previews remain excluded from production. No changes
to homepage, public Mother Nature interaction, Oceans, Regal, Available Art, shared
navigation, footer or artwork descriptions.
