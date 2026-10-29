# The Oceans content import

Approved by the artist in the local chat on October 29, 2026, after review of
`The-Oceans-Review.html`: collection introduction, 11 replacement descriptions,
49 photograph assignments, and primary-image recommendations.

All source photographs came from the artist-provided `VPA Website Update.zip`,
under `VPA Website Update/The Oceans/`. Originals were read without modification.
The site ships WebP derivatives at 600, 1200, and 1800 pixels wide (limited to
source resolution). Source filenames and image roles are retained in
`src/oceans.json` for traceability. Four room visualizations are explicitly labeled
as illustrative; their depicted scale is not verified.

Titles, source record IDs, dimensions, medium wording, and observed sold status
were retained from the Phase 1 inventory in `feat/artwork-catalog-phase-1`.
Summer Swells, Manta, and Sunset Waves retain their captured sold status. Other
works offer an inquiry link without claiming current availability. No prices
were captured or invented. Availability should be reconfirmed before launch.

Individual artwork routes live under `/collections/oceans/<artwork-slug>`.
The panoramic artwork called The Oceans remains distinct from the collection.
Old Squarespace paths remain in `sourceUrl`; redirects await the launch plan.

Historical source descriptions remain on the inventory branch; this import does
not overwrite those records. Unverified numerical/scientific assertions were
omitted from the approved editorial copy rather than presented as checked facts.

Routine development and editorial changes can proceed to draft PR previews
without another editorial approval stop. Main-branch merges, production
publication, domain/DNS changes, Squarespace changes, and commerce configuration
still require the artist's explicit approval. No Netlify settings were changed.

## Clean hero photographs

Following the artist's clarification, hero photographs for Dark Scales, Arctic
Waves, and Sunset Waves remove the room and easel while retaining the white
canvas border. A corner-based perspective correction makes the canvas edges
rectangular, using only source-photo pixels and interpolation. No generative
retouching, color adjustment, or alteration of the painted composition is used.
Summer Swells and the other eight hero photographs remain unchanged. Original
source photographs, detail views, and room visualizations remain unchanged.

## Curated artwork pages

The collection and every artwork page use the clean full-canvas presentation.
Only one full view is displayed per painting. Additional artwork photographs are
five distinct close details, cropped to show the artwork without room/easel
backgrounds. Room visualizations are grouped separately and labeled as
illustrative. One repeated Summer Swells room rendering is omitted.

This reduces displayed photos from 49 to 19 (11 full canvases, 5 details, 3 room
visualizations). Unselected photo assets and the artist's original ZIP remain
intact. `oceans-photo-curation.json` records the selection and omissions. No
artwork description, title, sales status, or dimensions change in this pass.

A separate Sunset Waves white-balance comparison was prepared outside the
website. It estimates a small color-cast correction from photographed white
canvas patches, with channel gains limited to ±4%. This is an unverified test,
not a calibrated reproduction. No color adjustments are applied to site assets.
Accurate reproduction should be checked against the physical painting and a
neutral/color-reference photograph when new photography is available.
