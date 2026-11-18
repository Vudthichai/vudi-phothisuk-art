# Studio mockup lighting review

## Checkpoint and rollback

Approved baseline: PR #81, commit `5badc03e04e5af4fb6210ef94221ac3606f5eaca`, tagged `checkpoint/studio-mockups-pr81`. This review branch changes only the room mockup lighting treatment, its generated derivatives, and provenance audit. To discard this experiment, close this PR; production is unchanged. If approved and merged later, revert this lighting commit to restore the checkpoint treatment.

## Restrained 9 × 12 lighting pass

The artist confirmed the existing collection renderings as the approved 12 × 16 reference. Those files and the 12 × 16 product checkpoint are unchanged. Only 9 × 12 variants receive this experiment.

- Blank paper is slightly warmer, with a gentle upper-left to lower-right falloff. Printed artwork is excluded from the paper mask; no global color correction, texture, sharpening, or blur is applied.
- Inner left/top frame shading gains a little depth, staying within the paper opening.
- The down/right cast shadow is slightly broader and softer (11 versus 9 native pixels), offset 12/18 pixels rather than 10/14. Its opacity increases from 20% to 25%, while contact-shadow opacity reduces from 13% to 11% to avoid a hard outline. The new values apply only to the smaller frame and scale with its dimensions.
- The room source, frame position, complete print design, size ratio, gallery UI, prices, and charity commitments remain unchanged.

Before/after proof sheets and desktop/mobile rendered previews are prepared outside the production build under `/workspace/previews/lighting-review/` and `/workspace/previews/lighting-site/`. This remains a visual experiment awaiting artist approval; no production publishing is authorized.

## Verification

Pixel comparisons against the checkpoint confirm all fifteen 12 × 16 derivatives remain byte-identical, all five 9 × 12 painted interior windows remain pixel-identical, and room pixels outside the conservative shadow/frame region remain unchanged. The collection image directory and gallery/UI code are not modified. The existing 75% dimensions and centered placement remain in the geometry audit.

Existing 129 tests, TypeScript/production build, and SEO checks pass. Actual browser checks cover all five products at 390, 768, and 1440 pixels, including both prices, synchronized thumbnails, view persistence, no reload, and no horizontal overflow. Review previews are not production pages.
