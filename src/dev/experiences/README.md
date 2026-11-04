# Phase 4 — private individual artwork experiences

## Readiness audit

- Production-used: the Phase 1 leaf/petal registry and BotanicalFall. These are
  generated photographic cutouts already used by public menus/Mother Nature.
- Approved only as a motion prototype: finite cutout foliage. Its new placement
  around a painting still needs composition review; optional and off by default.
- Experimental: photographic vine path reveal, illustrated PathVine/photographic
  leaf hybrid, bark ridge dissolve. Rendering/tests are not production approval.
- Asset-blocked: white-flower opening and mushroom emergence. Rejected lily/mushroom
  sheets must never enter this gallery's experience playback. Neither is approved.
- Existing local review: `/dev/flower-bloom.html` and `/dev/forest.html`. New gallery:
  `/dev/artwork-experiences.html`. None is a production build entry or public route.

The tracked repository contains a usable Mother Nature photograph/detail. No actual
Ethereal Bloom, Moss & Mushrooms, Wild Tiger Lilies or 75 Leaves photographs were
found. Their shared 503-byte SVG is explicitly a text-only development placeholder,
not a depiction of a painting. No replacement photographs or art were generated.

## Open and review

Run `npm run dev -- --host 127.0.0.1`, then open
`http://127.0.0.1:5173/dev/artwork-experiences.html`. The forest preview links here.
Select one of five paintings. Start/replay is manual, never automatic. Skip shows
static artwork immediately. Preview reduced motion suppresses effects locally;
OS reduced motion is also honored live and cannot be overridden by that checkbox.
Changing painting unmounts the old player, effects and timers. Hiding the browser
page stops playback; returning never auto-resumes.

| Painting / direction | Playable now | Readiness / remaining work |
| --- | --- | --- |
| Mother Nature — The Forest Awakens | Four leaves/petals and private detail/full reveal; optional foliage | New composition experimental; public transition untouched. |
| Ethereal Bloom — Into the Light | No bloom | Photograph and coherent approved white-flower sequence/poster needed; lighting waits for imagery. |
| Moss & Mushrooms — Hidden Life | Optional experimental bark test over labeled placeholder | Mushroom emergence blocked. Need original photo, continuous growth/moss imagery and bark composition approval. |
| Wild Tiger Lilies — Unfolding Color | Two existing orange petals, one green leaf | Original photo and composition review missing. No full lily bloom. |
| 75 Leaves — A Quiet Tribute | Three leaves, exactly one larger delayed golden leaf | Original photo and composition review missing. No additional movement or implied 75-particle simulation. |

No new experience is designated production-approved. Approved readiness on a step
means the existing botanical effect/asset is in use; it does not approve the new
painting assignment. Experimental steps require explicit checkbox opt-in, and that
checkbox never overrides rejected/needs-assets sequence metadata. Moss's bark test
reveals only the development placeholder until the correct photograph is supplied.
No rejected storyboard playback is imported here.

## Reuse

`model.ts` defines ArtworkExperience and a discriminated step union. Configurations
are development-only IDs, titles, optional introduction, current/future photograph,
readiness, missing requirements, reveal timing and an optional array of timed steps.
An empty step array is a valid static experience. These IDs are private integration
keys, not newly published collection records.

`configurations.ts` holds the five directions without changing public artwork data.
Each step has `at` and `duration` in seconds, an ID, family, readiness and a note.
Family-specific payloads go directly to existing BotanicalFall, ForestFoliage,
FlowerBloom, MushroomGrowth or BarkReveal renderers. To enable a future flower or
mushroom sequence, both its step readiness and underlying sequence status must pass.

`ArtworkExperience.tsx` only orchestrates mounts with finite timers. It pre-decodes
all selected scene assets before starting, mounts steps at their configured time,
unmounts them at the end, and clears pending timers/loads on replay, skip, selection,
reduced motion, page hiding or unmount. Existing renderers still own their motion.
Failures stop effects while retaining the accessible artwork. Timing does not
require a JS frame loop. No dependencies or audio were added.

The artwork is always a separate, accessible unchanged image using contain and its
natural aspect ratio; the private Mother Nature detail overlay uses opacity only.
It is a separate experiment, not a copy/replacement of the public image interaction.
Decorative layers are clipped, pointer-transparent and hidden from assistive tech.
The stage reserves its aspect ratio, preventing motion-induced layout shifts. The
local reduced-motion checkbox simply avoids mounting effects and shows the complete
artwork/static placeholder; it does not alter global OS/browser preferences.

## Validation and activation boundary

Run `npm test`, `npm run build`, then `node scripts/check-private-previews.mjs`.
Tests cover inventory, restrained golden-leaf count, nested approval gates, timed
start/replay/skip, missing images, explicit bark opt-in, reduced motion, document
inactivity/unmount cleanup, decode failure and static/no-animation configuration.
Chromium checks at 375px, 390px and 1440px cover all five scenes, loaded real or
placeholder images, no overflow, playback, switching, skip/replay, bark opt-in,
blocked growth and both reduced-motion modes. Mother Nature playback produced zero
layout shifts and no console exceptions were observed. Actual Safari/device review
remains pending; no claim of visual approval follows from browser tests.

Production JS/CSS hashes remain unchanged. The isolation check excludes new player
markers, dev HTML and the distinctive placeholder filename from dist. Public routes,
content, availability, inventory, navigation and MotherNature.tsx/CSS are untouched.
Before public activation, supply the four original photographs, approved white-flower
and mushroom sequences, review each composition on real mobile devices and obtain
explicit approval for public integration. This phase publishes no collection pages.
