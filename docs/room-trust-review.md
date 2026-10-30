# Room detail review — October 30

- The Oceans: expanded the wall buffer between the left window and the sofa/artwork group. The photograph is now centered at 64% with width 55%, entirely outside the direct diagonal light patch. No lighting overlay is applied to the painting in this scene. Room scale remains illustrative.
- Arctic Waves: the photo included a narrow support sliver at its lower edge. Created a derivative from the existing 2303 × 3486 crop, removing 14 pixels above and 21 below (2303 × 3451). The painted area and white canvas border remain; no generated repair or color edit. Updated hero, collection and room references together, replacing the old CSS clipping workaround.
- Reviewed all 16 active room backgrounds for book lettering. Dark Scales was an attempted rendering of “The Kinfolk Home” with malformed letters; its foreground stack also had invented text. Mermaid Tail and several Regal rooms had similar issues.
- New versioned backgrounds use plain cloth book covers for Dark Scales, Mermaid Tail, Arctic Waves, Golden Sand Beach, Manta, Carnations, Navy, Sahara and Verdant. Removed book stacks from Ciaran and Beach Day after a first edit retained faint letter-like marks. Summer Swells, Water’s Edge, Sunset Waves and Arctic Ocean already had plain covers at asset resolution; retained them.
- Built-in image-generation edits are recorded in room-trust-prompts.json. Artwork was never included in those generation inputs. Original assets remain unchanged.

Validation: 24 tests, TypeScript, production build, full-size asset inspection, and browser checks of The Oceans, Arctic Waves and Dark Scales.
