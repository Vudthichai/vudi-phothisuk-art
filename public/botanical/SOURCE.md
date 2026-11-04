# Botanical animation assets

Generated with OpenAI image generation on November 4, 2026, specifically for the owner's request for photorealistic botanical animation assets. These are generated decorative cutouts, not photographs of the artist's work or specimens from the paintings.

Three green leaves and two pink/apricot petals were generated together on a transparent asset sheet, separated into individual cutouts, trimmed, reduced to at most 160px on the long side plus a transparent 4px margin, and encoded as quality-84 WebP with alpha. Near-zero alpha background residue was cleared before export. No original artwork photographs were modified.

- leaf-serrated.webp — 127 × 168, 5,712 bytes
- leaf-curled.webp — 92 × 168, 4,006 bytes
- leaf-rounded.webp — 168 × 155, 7,176 bytes
- petal-pink.webp — 168 × 133, 5,322 bytes
- petal-apricot.webp — 168 × 151, 5,990 bytes

Total: 28,206 bytes. Each asset is reused for mobile menu openings on the homepage and Forest & Flowers page, and for Mother Nature transitions only. Assets have real alpha transparency; the original generated sheet is retained in the execution workspace.

## Phase 1 library migration

The active effects now resolve assets through `src/botanical/registry.ts`. Three of these generated cutouts were copied byte-for-byte into the new leaf/petal directories; these legacy originals remain unchanged for provenance. The expanded library and current inventory are documented in `src/assets/botanical/SOURCE.md`.
