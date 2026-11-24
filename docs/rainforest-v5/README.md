# Rainforest V5 — final atmospheric polish

Separate experimental entry: `/rainforest-v5.html`. The approved V4 (`437d84b`, PR #108) remains `/rainforest-v4.html`, unchanged as a fallback. No QR, certificate, storefront or production AR entry changes. All experiments and their model/chunks remain excluded from production builds.

## Approved behavior preserved

V5 reuses the identical `LIVING_PLACEMENT`, `sculptureTimeline.ts` and handheld pose/tracker profile: fixed 1.56-target-width height, root position, .7-second fade, one continuous revolution every 11 seconds, no entrance growth or repeat fade. Pinch/Reset, recording/save/share, camera cleanup and minimal controls are reused. The shared engine only supplies the existing camera/scene references to optional scene effects; its tracking, lighting and recording logic is unchanged.

## Atmosphere

`atmosphereMist.ts` adds six independent depth-tested wisps. Persistent contrasting white/gray root layers sit at front and rear depths, rather than hiding inside the opaque trunk. Lighter lower-trunk/canopy layers vary gently. All share one generated 128×128 RGBA texture (64 KiB). A textured, multi-lobed alpha mask avoids a uniform cloud rectangle; gray remains readable on ivory while white reads against bark/dark backgrounds. Depth writes are disabled, depth tests retained. No glowing, volumetric rendering or additional texture downloads.

The mist group follows the tracked root and scales with pinch, but never inherits the tree's yaw. Reduced motion freezes drift. Frozen-pose authoring images compare the actual GLB with mist on/off against both light and dark backgrounds; they are visual checks, not physical indoor-camera validation.

## Ten attached flowers

`flowers.ts` performs ten setup-only ray projections onto the actual optimized tree mesh. Positions/normals are converted into a normalized tree frame. Three root sites, three lower-trunk sites and four branch-height sites are curated; no ungrounded fallback flower is floated in space. The current model resolves all ten sites. Flowers inherit exactly the model's yaw, tracked pose and pinch scale.

Fifty small cupped petals, ten seed centres and ten stems use three instanced draws. The curved petal profile reuses the existing sculptural-petal design at a low resolution; warm gold, ivory, pale yellow and muted orange instance colors stay restrained. These are procedural miniatures, not newly downloaded Meshy blossom GLBs. No large textures or emissive bloom; flowers are opaque and depth-tested. Actual mesh intersection occurs only during loading, never per frame.

## One occasional foreground leaf

`foregroundLeaf.ts` reuses one curved, veined 144-triangle mesh. A session-randomized flight begins near the current camera-facing outer canopy of the tracked tree. The source is transformed from the rotating tree frame into the shared render scene, so it originates from the tree rather than a random screen coordinate.

A cubic path then approaches the launch-time camera and exits beyond a side of the view, with subtle tumble and natural fade. The leaf's physical size stays fixed; perspective makes it appear larger as it approaches. There is only one active leaf. Launches are spaced 8–15 tracked seconds apart, flights last 4.6–5.7 seconds, and paths/speeds/phases vary. Tracking loss cancels the leaf immediately; reacquisition schedules a fresh canopy launch, not a detached screen pop. Reduced motion disables it.

This is a controlled **camera-relative foreground illusion**, not world tracking: MindAR tracks the image and does not supply a persistent room camera pose. The main tree always remains image-anchored. The leaf is rendered by the same Three.js scene/canvas, so the existing composite recording includes it; no DOM overlay or separate recording layer is used.

## Independent internal comparisons

- `/rainforest-v5.html`: all three additions.
- `?mist=0`: no mist allocation/draws.
- `?flowers=0`: no flower projection/geometries/draws.
- `?leaf=0`: no leaf geometry/animation/draw.
- `?mist=0&flowers=0&leaf=0`: tree-only approved behavior.
- `?debug=1`: opt-in preview diagnostics, counts, leaf state and model/pose metrics. Not shown normally.
- `/rainforest-v4.html`: approved visual fallback and error-recovery link.

No birds, mushrooms, extra trees, audio or new visitor settings.

## Checks and review tools

`src/ar-atmosphere.test.ts` checks resource sharing, mist contrast/depth/reduced motion/disposal, actual mesh flower attachment, rotation/pinch inheritance, leaf source position/timing/approach/fade/loss and independent feature disable without changing tree timing. Existing V4/V3 tests protect their behavior.

For private authoring images, run a local Vite dev server (e.g. port 5189), then:

```sh
python scripts/render-rainforest-v5-review.py --base http://localhost:5189 --output /tmp/v5-visual
```

The authoring harness uses the real GLB and production lighting/materials, freezing a scene pose for mist on/off comparisons against ivory and dark backgrounds. It requests no camera. Vite's first dependency optimization may reload the page; run again once optimization finishes if so. It also samples foreground-leaf frames and an identical leaf-hidden frame to check actual pixel visibility.

For a served preview build (e.g. port 5190), with the existing private authentic certificate fixture:

```sh
python scripts/make-rainforest-handheld-feed.py --base-image /tmp/living-camera-base.png --output /tmp/rainforest-v5-handheld.y4m --cycles 3 --period 30 --occlusion 6
python scripts/check-rainforest-v5-browser.py --base http://localhost:5190 --camera-feed /tmp/rainforest-v5-handheld.y4m --output /tmp/v5-camera
```

Requires Chromium, Python Playwright, Pillow, NumPy and ffmpeg. Synthetic translation/tilt and six-second occlusion are integration fixtures, not physical handheld/iPhone tests. Photos/recordings/full reports are local to the chosen output folder and not uploaded or committed.

## Physical iPhone review still required

Use a handheld certificate in Safari, with fingers clear of the image. Confirm unchanged tree scale/placement/rotation/fade and steady attachment. Watch at least 30–45 seconds for varied leaf passes; compare visibility on ordinary light and dark indoor backgrounds. Move around the tree to inspect surface-attached flowers and mist depth, then briefly hide/reveal the certificate. Compare each effect off, test pinch/Reset, record/save/share a 10–12-second clip and Exit.

Actual mist visibility, perceived foreground depth, handheld tracking and native share/save need physical review. Target 30+ FPS is not established by desktop software rendering; assess sustained recording, thermal behavior and memory on iPhone 15. No production merge or deployment is authorized.

## Observed review results

- All 186 tests across 34 files passed; production/preview builds, SEO, all 15 COA routes, model/target integrity and production exclusion passed.
- Synthetic moving-certificate browser run passed: ten flowers, actual foreground-leaf launch, unchanged size/continued rotation, target loss/reacquisition without replay, Reset, decoded 332×720 recorded composition (9.7381 seconds), camera shutdown, all additions disabled independently through flags and V4 fallback access. No page errors. A first run with the shorter occlusion window did not reliably observe loss under concurrent software-rendering load; the longer six-second-occlusion fixture passed.
- Frozen-pose visual review used the actual GLB against ivory and dark backgrounds, with identical tree/flower/leaf poses for mist on/off. Pixel differences were visibly present on both backgrounds. An identical leaf-hidden comparison produced a 12×26-pixel difference region at one sampled authoring pose; this verifies actual leaf pixels, not a promised physical-phone size. Foreground leaf frames and light/dark fog images remain private under `/workspace/previews/rainforest-v5-review/`.
- Peak authoring render with all effects and an active leaf: **11 draws / 237,730 triangles**. Without an active leaf: 10 / 237,586. Tree-only browser comparison: 1 / 229,534. The original GLB remains 12,058,396 bytes with its unchanged integrity hash; no downloaded textures/models added.
- The tree-only software sample was approximately 1.40 FPS; its local loading time was 20.63 seconds under this run's software-rendering load. Neither is a controlled iPhone benchmark, and full-effects runtime FPS/recording smoothness was not established on a device. No 30 FPS claim is made.
- Full browser reports and recorded-scene screenshots are private under `/workspace/previews/rainforest-v5/`; compact numeric results are in `verification.json`. The final browser harness starts recording atomically once tracking is found to avoid competing with the fixture's target-loss interval.
