# Direct approved 12 × 16 to 9 × 12 scaling

The collection images and 12 × 16 product views use the same lossless approved room composites. Earlier smaller variants rebuilt the paper from authentic print masters, causing differences in paper tone, borders, and inner shading. This method instead resamples the approved photographed frame and complete print as a single object.

- Source: native 1122 × 1402 collection WebPs, verified against their reviewed PNG decoded-RGB hashes. No screenshot extraction or artwork regeneration.
- Large frame bounds: (213, 100)–(917, 1044), 704 × 944 pixels. Smaller bounds: (301, 218)–(829, 926), 528 × 708 pixels. Both centers: (565, 572). Each linear dimension is exactly 75%.
- Paper, print colors, typography, border, monogram, signature, and inner-frame shading are scaled together, without new color correction.
- A foreground branch crossing a tiny portion of the large frame's far-left edge is removed from that frame-only strip using the same frame's column samples. The supplied clean-room branch stays stationary.
- The cast shadow follows a traced silhouette from the approved photograph, scaled around the same center. Its neutral opacity is sampled from the approved shadow against the supplied clean plate. Wall texture is not copied into the shadow; this avoids rectangular patches from fine texture differences between photographs. The cast shadow is a reconstructed lighting layer, not a claim of pixel-for-pixel photographic extraction.
- The artist-supplied clean room supplies the wall behind the smaller object. All pixels outside the smaller composite region remain identical to that clean plate. The approved large photograph has slight background differences from the separate clean plate; switching sizes is therefore not a claim of pixel-identical background across those two supplied photographs.
- All existing 12 × 16 and collection files are untouched. Only fifteen 9 × 12 derivatives change. Prices, selection state, galleries, content, and inventory stay unchanged.

Run `python tools/studio-gallery/approved_small.py --review-dir /tmp/approved-small` with existing Pillow and NumPy. It verifies approved source hashes, exact scaled-frame pixels, and unchanged surrounding room, and records `approved-small-mockup-audit.json`. The older `size_variants.py` and its historical audits describe the superseded rebuilt-paper method; use this generator for current smaller assets.

Native comparison proofs: `/workspace/previews/approved-small/comparison.html`. Actual product-page desktop/mobile captures: `/workspace/previews/approved-small-site/comparison.html`. Review is required before merge or production publishing. The PR #81 checkpoint tag remains available.

Validation: all 129 tests (23 files), TypeScript/production build, SEO checks, and whitespace validation passed. Actual browser checks passed on all five products at 390/768/1440px, including $45/$95, hero/thumbnail synchronization, Artwork Detail persistence, exact small-view restoration, no page reload, and no overflow. Independently detected frame ratios were 0.7488–0.7494 wide and 0.7518–0.7519 high after screen-pixel rounding, with centers aligned within 1.5px. Existing catalog metadata warnings are unchanged.
