# Rainforest V4 — tree and mist

Experimental entry: `/rainforest-v4.html`. Working V3 remains `/rainforest-v3.html` and PR #107 (`60d8334`) is the checkpoint. Production AR, QR destinations and certificates are unchanged. All experimental entries/assets are excluded from production builds.

## Presentation

- Fixed default height: 1.56 target-image widths, exactly the settled V3 size. There is no entrance scaling at any stage. Only optional manual pinch changes scale; Reset restores the default without replaying the fade.
- Fully formed tree fades in over .7 tracked seconds using a smooth opacity curve. Original opaque PBR material properties are restored afterward; no texture/color changes.
- Constant angular velocity about the local vertical through the root base: one revolution every 11 seconds. The angle is unwrapped, with no easing, wrapping reset, stop or loop-boundary acceleration.
- Tracking loss hides the scene and pauses the presentation clock. Reacquisition resumes phase without replaying the fade. The root still follows the tracked picture, never the camera.
- Reduced motion shows the opaque tree immediately, disables rotation and freezes mist.
- Four independently drifting, depth-tested mist wisps stay under the tracked root but outside the rotating model group. Stronger root/lower-trunk foreground layers and restrained canopy layers share the existing 64 KiB procedural texture. No additional downloads or volume rendering.
- V4 never instantiates V3's mushrooms or flowers. No birds, petals, extra trees or other scenery.

The V3 handheld pose profile, tracker tolerances, recording/save/share pipeline, bounded pinch and normal Exit/Record/Reset UI are preserved. V1–V3 retain their prior behavior. `?debug=1` enables internal preview diagnostics; `?mist=0` provides a mist-off performance comparison. No settings panel is shown normally.

## Future music, without audio now

`src/ar/experimental/sculptureTimeline.ts` owns the timing configuration and one authoritative `elapsedSeconds` value. Both fade and rotation derive from it. Future music can follow this clock and its tracking-pause policy without replacing rendering or maintaining a separate competing animation timer. This implementation creates no audio element, AudioContext, microphone request or audio playback.

## Validation

Unit tests check fixed scale during the entire fade, exact .7-second opacity timing, constant angular velocity across several revolution boundaries, phase/fade retention across loss, reduced motion, fixed root contact, independent mist, no botanical instances and restoration of opaque rendering. Existing V3 tests protect the fallback.

`scripts/check-rainforest-v4-browser.py` uses the same synthetic moving/tilting certificate and occlusion fixture as V3. It checks fixed size, continued rotation beyond a full turn, no replay after loss, recording or native fallback, camera shutdown, metrics and V3 access. This is not a physical handheld test or iPhone benchmark.

```sh
python scripts/make-rainforest-handheld-feed.py --base-image /tmp/living-camera-base.png --output /tmp/rainforest-v4-handheld.y4m --cycles 4
python scripts/check-rainforest-v4-browser.py \
  --base http://localhost:5187 \
  --camera-feed /tmp/rainforest-v4-handheld.y4m \
  --output /tmp/rainforest-v4-review
```

Physical iPhone 15 review remains required: hold the 5×7 certificate in one hand, scan with the other, inspect the .7-second materialization and root contact, watch multiple 11-second revolutions, briefly occlude/reveal the artwork, pinch/Reset, and record/save/share a 10–12-second clip. Compare mist on/off for visibility, sustained frame rate and thermal behavior. A 30 FPS render cap or software-renderer sample is not proof of 30 FPS on iPhone. No live deployment or merge is authorized.
