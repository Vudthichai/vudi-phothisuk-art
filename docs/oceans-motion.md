# The Oceans cinematic entrance

A collection-specific entrance using the approved cinematic ocean direction. It
is confined to `/collections/oceans`; the home page, other collections, and
artwork detail pages retain their existing layout.

## Visual and motion behavior

- Original AI-generated ocean atmosphere images are decorative collection assets,
  not photographs of the artist's paintings or a claimed real-world location.
  The desktop image was approved in the chat; a separately composed portrait
  companion provides framing for narrow screens. Both come from the same
  original art direction. No artwork pixels or colors were changed.
- Responsive WebP posters use 480/768/1024-pixel portrait and
  960/1440/1774-pixel landscape variants. The browser selects a source before
  loading; the hero has high fetch priority and reserves its own layout space.
- Passive scroll events schedule one animation-frame update. A short sticky
  entrance gently moves the ocean image and title, revealing a paper-colored
  shore before the gallery. Desktop uses a 55%-viewport travel distance;
  mobile uses 26%. Scrolling remains native, with no wheel/touch interception.
- Low-opacity CSS mist moves slowly only while the entrance is on screen.
  This prototype animates layered still imagery; it is not fluid simulation or
  filmed wave footage. No sound or video downloads are included.
- The collection's artwork figures reveal once with a small upward movement.
  Their pixels, white borders, colors, captions, descriptions and sales metadata
  are unchanged. They remain still after appearing.

## Accessibility and fallbacks

- A visible motion control pauses atmospheric and scroll motion. The browser's
  reduced-motion preference and data-saving/2G connection hints select the still
  experience automatically. Preference changes are observed during the visit.
- Reduced/still mode removes the additional sticky travel distance and reveals
  all artwork immediately. The same readable poster and page content remain.
- Without IntersectionObserver, every artwork stays visible. Content is visible
  by default; reveal attributes are applied only to offscreen cards.
- The Explore link goes directly to the collection, respects motion preferences,
  and moves keyboard focus to the gallery. Navigation remains reachable on
  desktop and via the mobile menu. No automatic audio.

Existing PR #4 retains the preceding clean canvas crops and curated photo pages.
No merge, production publication, DNS or Squarespace changes are part of this
implementation. Physical-device checking remains useful before production.
