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

## Physical canvas and distinct interiors revision

The artist authorized applying room-specific light to the mockup canvas rather
than displaying a uniformly exposed photo in every room. The original hero photo
and its source assets remain unchanged. A shallow edge behind the photograph,
small contact/cast shadows, a directional neutral shading layer, and a modest
Summer Swells mockup-only exposure lift now connect the canvas to its scene.
Shadow direction reverses for right-window rooms. Container-relative units keep
edge thickness and shadow size proportional as the scene resizes. No generated
paint texture or simulated animated iridescence is added.

Dark Scales, Mermaid Tail, Beach Day, Arctic Waves, and Sunset Waves receive
new distinct interiors: a coastal rattan alcove, mint/blush beach-house corner,
garden café, coastal dining room, and colorful music lounge. Golden Sand Beach
uses diffuse overcast daylight instead of strong warm shadows. Prior scene assets
are retained. All new backgrounds are empty; the original artwork remains a
separate image. Built-in image-generation prompts are in `room-v3-prompts.json`.

The Oceans uses an explicitly assumed 96-inch sofa reference. Its recorded
72-inch width is modeled at 75% of the sofa span; its recorded height and original
photo aspect ratio are preserved. The generated sofa is not a measured real-world
object, so this remains illustrative, as labeled.
