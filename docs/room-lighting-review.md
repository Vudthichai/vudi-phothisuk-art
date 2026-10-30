# Staged canvas lighting revision — October 30

User requested the earlier centered Oceans room again and subtler painting exposure in five room scenes. This supersedes the expanded-wall experiment documented in room-trust-review.md; its unused asset is retained.

- The Oceans: restored the original centered sofa background, placement and mild ambient shading.
- Summer Swells: removed the previous 1.10 brightness boost; exposure 0.96 with a mild left-to-right shade gradient (0.10 maximum).
- Mermaid Tail: exposure 0.94 with right-to-left shading (0.13 maximum), leaving the window-facing edge brighter.
- Beach Day: exposure 0.94 with left-to-right shading (0.13 maximum). Removed the old lower-left corner mask in favor of a continuous directional gradient.
- Arctic Waves: exposure 0.94 with top-right to bottom-left shading (225 degrees; 0.17 maximum).
- Water’s Edge: exposure 0.92 with right-to-left shading (0.13 maximum).

These are reversible CSS presentation layers on staged copies, including canvas borders. No source image, hero, collection photograph, room background or artwork texture was regenerated or color-corrected. The layers approximate ambient exposure; they cannot reconstruct the microscopic relief shadows already recorded in a photograph.

Validation: 24 tests, TypeScript and production build passed; visually inspected all six room pages in the browser.

Follow-up: Summer Swells was slightly too dim in review. Raised exposure from 0.96 to 1.00 and eased maximum shading from 0.10 to 0.08. All other room lighting retained as approved; Mermaid Tail unchanged.
