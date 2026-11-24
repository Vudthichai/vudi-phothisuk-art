# Rainforest AR V2 — mist-only review

This experimental route builds on V1 (PR #102, `9958478`). It does not replace the production golden tree, certificate entry points, or V1. No birds, extra trees, flowers, mushrooms, growth animation, or automatic spin were added.

## Preview and rollback

- `/rainforest-v2.html`: curated collector-facing experience; Start camera, then Exit, Record, Reset. Explicit camera permission remains required.
- `/rainforest-v2.html?debug=1`: opt-in development/preview diagnostics, placement sliders, quality control and Cinematic mist checkbox. Never linked from certificates.
- `/rainforest-v2.html?mist=0`: same composition without mist; no mist texture allocated. Useful for physical-device A/B comparisons.
- `/rainforest-ar.html`: unchanged V1 UI and defaults, with no mist. Also linked from a V2 loading error.

Both experimental HTML entries and their model/chunks are excluded from production builds. The existing Vite production alias is retained; `node scripts/check-rainforest.mjs --production` checks this after a production build. Existing production certificate URLs and experiences.json are untouched.

## Composition and interaction

`CINEMATIC_PLACEMENT` in `src/ar/experimental/rainforest.ts` sets height 2.6 target widths, x 0, y -0.55 and trunk yaw -12 degrees. The existing root normalization and +90-degree local X orientation place the tree perpendicular to the image with its base on the tracked surface. There is no automatic rotation.

`pinch.ts` installs surface-only two-finger scaling between 0.75 and 1.5 times that default (height 1.95–3.9). Scale changes do not translate the roots or change yaw. Reset restores placement and gesture state. Single-finger dragging and rotation have no effect. Gestures are disabled when tracking is lost or capture controls are hidden. Nonpassive touch and Safari gesture handlers suppress browser zoom only on the camera surface; controls remain outside it. Disposing removes handlers and restores touch-action.

## Mist implementation and budget

`mist.ts` generates one 128 × 128 RGBA texture once (65,536 bytes, no mipmaps) shared by four low-opacity camera-facing wisps: roots, lower trunk and two canopy layers. Added rendering cost is four sprite draws / eight triangles, no additional downloaded assets. Existing optimized GLB is unchanged (12,058,396 bytes, 229,534 triangles).

Wisps use depth testing against the opaque tree, disable depth writes, and have soft transparent edges with alpha capped by material opacities 0.08–0.12. Drift, breathing and opacity changes are slow; reduced motion freezes them. Mist scales with the tree, not the camera view. It does not change MindAR's raw camera input. Disabling mist hides its draws; starting with `?mist=0` skips allocation. Texture and materials are disposed with the scene.

V2 keeps the existing capped renderer and camera/record/save/share pipeline. Mist belongs to the same Three.js scene and therefore the composited recording output. The normal UI hides persistent recording help, retaining native screen-recording fallback on failure and an optional screen-recording action in clip review. Camera cleanup, local-only capture and permission handling remain shared with V1.

## iPhone review

1. Open the V2 HTTPS deploy preview in iPhone 15 Safari. Use the Mother Nature certificate image already verified for V1.
2. Start camera; grant permission. Hold the printed certificate flat and frame its artwork. Confirm roots sit on the paper and initial guidance disappears on detection.
3. Move the phone gently; inspect bark/vines/roots and faint drifting mist. No developer sliders should appear.
4. Pinch with two fingers: confirm limits, stationary anchor and Reset. No dragging or rotation.
5. Record, stop, save and share a clip; verify both camera image and mist/tree appear. Exit and confirm the camera indicator stops.
6. Compare `?mist=0` and `?debug=1`, using the checkbox for live A/B and Copy diagnostics for render/tracking samples. Test recording in both configurations. Test reduced motion and denied camera permission.
7. If V2 performs poorly, use `/rainforest-ar.html`; V1 remains intact.

## Validation boundaries

Automated tests cover shared texture/disposal, depth/opacity settings, reduced motion, pinch limits, anchor invariance, control isolation, diagnostic opt-in and reset cleanup, plus the existing AR suites. Browser checks use Chromium software rendering with a synthetic feed of the authentic certificate target. These prove integration behavior, not iPhone Safari GPU performance or a 30 FPS result. V1 was reported working by the owner on iPhone 15; V2 frame rate, mist readability at real camera exposure, sustained recording performance, Safari pinch behavior and thermal/memory stability still require that device.
