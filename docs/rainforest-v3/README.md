# Rainforest AR V3 — The Living Hologram

Experimental only. `/rainforest-v3.html` uses the same authentic Mother Nature target and optimized ancient tree as V2. Production AR, certificate/QR destinations, product pages and source imagery are untouched. V2 (`/rainforest-v2.html`, PR #106 checkpoint `d42e18a`) and V1 remain available. All three experimental HTML entries and the rainforest model/chunks are excluded from production builds.

## Composition

`LIVING_CONFIG` in `src/ar/experimental/living.ts` is the internal creative configuration:

- Reference: the current V2 curated height, 2.6 target-image widths. These units do not assert a physical tree/certificate measurement.
- Initial height: 50% of that reference = 1.30 target widths.
- Settled height: 60% = 1.56 target widths.
- Duration: 2.6 seconds of tracked presentation, paused on reported tracking loss.
- Cubic ease-out growth and one 360-degree trunk-axis turn, slowing to rest. Fade completes progressively without recoloring/replacing PBR textures. Original opacity/transparency/depth-write settings are restored at completion.
- Reduced motion: show the settled, fully opaque tree immediately, no spin or drift.
- Root base remains at x 0 / y -0.55 on the artwork plane, with the existing upright orientation. The model transforms around that root; there is no camera-facing lock or continuous spin.
- A brief interruption hides the target, resets pose filtering, and pauses reveal time. Reacquisition resumes the same reveal state; a completed reveal is not replayed. Reset restores placement and optional pinch state, not the entrance animation. Explicitly restarting the camera starts a fresh scene.

The mist is a sibling of the turning model under the upright tracked root. It scales with the miniature scene but never inherits entrance yaw. Four depth-tested wisps at roots, lower trunk and canopy share one generated 128×128 RGBA texture (64 KiB). No volume marching, extra downloads or large transparency layers.

Five miniature red mushrooms use shared lathed cap and stem geometries. Three warm flowers reuse the existing sculptural curved-petal geometry, with small seed centres. Four instanced draws, no new textures. These are lightweight procedural botanical details, not imported new Drive models or alterations to artwork pixels. No birds, falling particles, extra trees or scenery.

## Handheld tracking

V3 uses the existing image-relative pose filter with a more responsive handheld profile: a lower deliberate-motion threshold, while still smoothing small stationary noise and confirming isolated gross jumps. Existing V2 tuning is unchanged. MindAR warmup/miss tolerances are 3/3 for V3 versus 5/8 in V1/V2. This reacquires more quickly and hides stale placement sooner.

MindAR supplies a pose or a missing-target update, not a calibrated confidence score in this integration. No numeric confidence is invented. Root anchoring and perspective still come from image tracking, not world mapping. Faster response versus tremor suppression is a real tradeoff that must be checked on the physical handheld certificate.

## Minimal flow and review flags

Open the HTTPS V3 preview, tap Start camera, grant permission, and show the Mother Nature artwork on the certificate. Permission still requires explicit interaction. There are no placement/rotation steps. Once tracking begins, only Exit, Record and Reset remain; optional bounded pinch scales the settled default .75–1.5× (height 1.17–2.34). Brief guidance disappears on detection.

- `/rainforest-v3.html`: complete default reveal.
- `?revealRotation=0`: same fade/growth, no entrance turn (developer A/B flag; no visitor settings UI).
- `?mist=0`: disable mist for performance comparison.
- `?debug=1`: opt-in preview diagnostics; not linked in normal UI or certificates.
- `/rainforest-v2.html`: preserved working fallback, also offered after a V3 scene loading error.

Recording/save/share use the existing local canvas-composite path and native screen-recording fallback. The reveal, mist and miniature details are in the same scene, so supported composite capture includes them. Nothing is uploaded automatically.

## Validation and repeatability

Unit tests cover scale reference, 2.6-second timing, one turn then rest, optional no-turn and reduced motion, loss/reacquisition without replay, unchanged root pivot, unrotated mist, PBR restoration, miniature counts/materials/disposal, normal UI, and synthetic handheld translation/tilt response.

The browser check uses a synthetic authentic certificate image with changing perspective/translation and a three-second blank occlusion. It is a moving-certificate integration check, not footage of a real hand or iPhone. To reproduce with the private existing 640×960 synthetic fixture:

```sh
ffmpeg -i /tmp/rainforest-oblique.y4m -frames:v 1 /tmp/living-camera-base.png
python scripts/make-rainforest-handheld-feed.py --base-image /tmp/living-camera-base.png --output /tmp/rainforest-handheld.y4m
python scripts/check-rainforest-v3-browser.py --base http://localhost:5186 --camera-feed /tmp/rainforest-handheld.y4m --output /tmp/living-review
```

Requires Python Pillow, NumPy and Playwright, ffmpeg, Chromium and a served preview build. Camera screenshots/full reports remain in the chosen local folder, not published or committed.

## Physical iPhone 15 review required

Hold the actual 5×7 certificate flat in one hand, keeping fingers clear of the artwork. With the other hand, scan in Safari. Verify automatic placement, perceived 50→60% growth, fade, one slowing turn, root contact, readable small red/warm details and mist that does not obscure the painting. Hold steady, move the paper gently, move the phone around it, then briefly cover/reveal the image. Check response versus lag and confirm no repeat entrance. Compare the stationary-reveal flag. Pinch and Reset are optional; the initial experience must work without them.

Record 10–12 seconds, save/share, and Exit. Test reduced motion, denied camera permission, glare/low-light recovery, memory/thermal behavior and sustained 30 FPS with and without recording/mist. The renderer's 30 FPS cap is not a measured 30 FPS result. Software Chromium cannot establish iPhone GPU performance, camera tracking quality, native sharing or physical root contact. No 30 FPS or verified handheld-stability claim is made without those device results.

### Observed software review

The synthetic moving-certificate browser run passed with no page errors: no automatic camera, normal minimal controls, 1.30→1.56 observed height range, settled 360° turn, occlusion recovery without replay, Reset without replay, decoded 332×720 composited clip, camera shutdown, stationary reveal flag and V2 fallback access. The manual-stop clip was 2.887433 seconds; sustained 10–12-second device capture and native sharing are not verified by that clip.

The settled diagnostic sample reported nine draws, 240,674 triangles, six geometries and five textures (229,534-tree triangles plus 11,132 botanical triangles; four two-triangle mist sprites). Local model download/parse was 4.41 seconds in that run. The software-rendered sample was approximately 1.59 FPS and cannot establish iPhone GPU performance or a 30 FPS result. Private screenshots and full measurements: `/workspace/previews/rainforest-v3/`. A compact numeric summary is committed in `verification.json`.

Final checks after syncing main `1abd245`: all 178 tests across 32 files, production/preview builds, SEO, all 15 COA routes, and model/target integrity passed. Production exclusion was also checked. A final scoped 15-test run passed after honoring the internal rotation configuration by default.
