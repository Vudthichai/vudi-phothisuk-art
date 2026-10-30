# Room scale and lighting refinement

Remove all supplementary craftsmanship/detail sections from the Oceans artwork
pages. Retain their source images and records; nothing original is deleted.

Replace percentage-by-eye room placement with the artwork's recorded dimensions.
Each generated scene uses an explicitly assumed 144-inch-wide model wall. Portrait
width is the smaller recorded dimension and landscape width the larger one; the
original image aspect ratio remains intact. The 72-inch panoramic painting renders
three times wider than a 24-inch portrait on this shared reference. Paintings are
centered vertically in the available wall area instead of pinned near the ceiling.

The generated interiors have no measured geometry. This is a coherent model-scale
reference, not a verified representation of the furniture or a real room. The
caption states the artwork dimensions and modeled 12-foot wall. Actual measured
room/furniture references would be required for a true-to-scale installation study.

Brighten the generated room backgrounds slightly (more for Dark Scales and Sunset
Waves), add a subtle wall wash, and reduce the oversized hanging shadows. Lighting
styles affect generated surroundings only. Artwork image pixels, colors and files
remain unchanged; photographed glare and original lighting cannot be corrected by
these room-only adjustments.

## Lighting revision from the artist’s video references

Reviewed three frames (10%, 50%, 90%) from each of the seven supplied videos.
Dark Scales and Mermaid Tail show localized silvery/gold/green highlights that
change with viewing angle; a still room study cannot reproduce this movement.
Videos remain reference material and are not published.

Five empty room backgrounds were edited with the built-in image-generation tool.
Dark Scales and Sunset Waves now have visible brass picture lights with downward
wall illumination. Mermaid Tail, Arctic Waves and Arctic Ocean receive softer,
brighter reflected daylight. Their new assets use `-room-relit-1440.webp` names;
previous backgrounds are retained. Exact prompts are in
`room-relighting-prompts.json`.

Remove the synthetic CSS wall wash and brightness boost from these five scenes:
lighting is now part of the generated background. The same original artwork photo
is still overlaid without filters, recoloring, generated texture or faux shimmer.
The approved dimension-based position and size remain unchanged. These are
illustrative lighting proposals, not measured simulations of paint reflectance.
