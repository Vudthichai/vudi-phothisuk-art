# Certificate AR — Phase A golden petal

> Phase A baseline notes. The Phase B draft replaces the actor and camera UI; see [current botanical scene and recording review](certificate-ar-phase-b.md). Target extraction and provenance below remain applicable.

## Implemented flow

The Mother Nature **original** certificate has a working `Experience in AR` entry point. Its permanent QR URL remains `/coa/forest-and-flowers/mother-nature/original/`. The link adds `?ar=1` as a temporary UI state; it does not replace the printed QR destination or its canonical URL.

The certificate opens a native modal containing a same-origin `/ar-camera.html` frame. Instructions and the correct target-image preview appear first. Only the visitor's **Start camera** interaction calls `getUserMedia`. Rear camera is preferred; audio is never requested. Three.js, MindAR, and the compiled target load after permission is granted. There are no paid services, third-party AR endpoints, recording, or camera uploads.

The tracker is MindAR 1.2.5, rendered with Three.js 0.180.0. MindAR's unmodified image-controller bundle and licenses are self-hosted under `public/ar/vendor/`. Three.js is locally bundled in an on-demand engine chunk. No A-Frame, MediaPipe/face models, native camera app, or MindAR's Node/canvas dependency tree is installed.

The initial actor is one curved golden petal: 672 triangles, no texture/model downloads, one mesh and two lights. It floats slightly out from the upper part of the tracked image. Camera motion updates the anchor; reduced-motion preference removes the petal's decorative bob/rotation. Renderer pixel ratio is capped at 1.5.

## Exact target and provenance

`public/ar/targets/mother-nature-original.jpg` is a proportional 680 × 1024 derivative of the exact 1361 × 2050 image embedded on page 1 of the supplied original certificate (xref 15). Its printed bounds are 217.76 × 328 pt on the 360 × 504 pt certificate. The entire embedded image, including its existing canvas border, is preserved. No artwork was generated, recolored, stretched, or cropped. The physical PDF stays outside the repository.

`mother-nature-original.mind` contains 10 feature levels and 4,139 matching features, and is 881,782 bytes. Counts describe the compiled data; they are not a guarantee of physical tracking quality. The JSON beside it records source PDF/image hashes, actual dimensions, compiler statistics, and compiled-target hash. Build validation rejects missing or changed assets and certificate-source mismatches.

Mother Nature's Collector’s Edition certificate uses a **different 1538 × 2050 print-design image**, so it is intentionally not enabled with this original target. Its front must be compiled separately. Other certificate paths can share a target only after their embedded image pixels are verified identical and their separate source provenance is registered. Similar artwork titles alone are insufficient.

## Code map

- `src/ar/experiences.json`: enabled experiences, exact certificate paths, target URLs, display labels and target index. Only Mother Nature original is currently enabled.
- `src/ar/config.ts`: lightweight certificate/experience lookup.
- `src/ar/CertificateAR.tsx`: native modal, isolated frame, focus restoration, Escape/exit, and origin/source-checked messages.
- `ar-camera.html`, `src/ar/camera.ts`, `camera.css`: instructions, secure-context/API checks, explicit camera consent, startup timeout, denied/busy/missing-camera fallback, tracking guidance and exit.
- `src/ar/engine.ts`: self-hosted MindAR controller, projection/video calibration, smoothed image anchor, responsive Three.js rendering, and disposal.
- `src/ar/petal.ts`: small procedural gold actor; the place to replace/extend the artwork-independent scene later.
- `src/coa/CertificatePage.tsx`: enabled entry points and query-state launch. The client-only modal gate preserves hydration on direct `?ar=1` opens.
- `scripts/check-ar-assets.mjs`: build-time target/provenance/upstream-integrity checks.

The camera is paused/stopped on backgrounding, page exit, failures, or leaving AR. Its MediaStream tracks are stopped, the tracking worker is terminated, and Three.js resources are disposed. Retry reloads only the isolated camera document, releasing its TensorFlow/WebGL context before another session. No camera/tracker resource is kept in the certificate application's global scope. Changing camera resolution/orientation during a session may require a deliberate restart; a clear message is shown instead of using incorrect calibration.

## Preview and compile

Run `npm run dev -- --host 0.0.0.0`, use the local URL printed by Vite, and open the original Mother Nature certificate. Loopback localhost is browser-trusted for development; phone testing requires a real **HTTPS** review URL, not an HTTP LAN address.

The compiled target is committed, so ordinary builds need no target-generation tooling. To reproduce it, install Python PyMuPDF, Pillow, and Playwright in an isolated development environment and install Playwright Chromium (or set `CHROMIUM_PATH`). Keep master PDFs private.

```sh
python scripts/extract-ar-target.py /workspace/coa-input/mother-nature-original.pdf --xref 15 --certificate-path /coa/forest-and-flowers/mother-nature/original/ --output public/ar/targets/mother-nature-original.jpg
# Keep Vite running; substitute the actual port printed by Vite:
python scripts/compile-ar-target.py --base http://localhost:5173 --experience mother-nature-original
npm run test:ar
```

The browser compiler lives at `tools/ar/compile-target.html` in development and is not copied into the production site. It uses only the local MindAR bundle. No QR symbol is generated or replaced at any step.

## Enable another certificate

1. Inspect that physical certificate's front and select its authentic artwork image—not its QR symbol, logo, whole PDF, or a convenient website thumbnail.
2. Add an experience with the canonical artwork ID, accurate `certificateLabel`, exact existing certificate path, and new target filenames. Do not alter `src/coa/routes.json` QR destinations.
3. Extract and compile that image using its actual embedded image xref. Check its printed proportions and run the asset checks.
4. If it is pixel-identical to an existing target's source, `extract-ar-target.py ... --reuse --certificate-path <additional exact certificate path>` registers separate certificate provenance without recreating the image or target. Non-identical images are rejected for reuse. Add the path to the experience only after this check.
5. Test detection, alignment, loss/reacquisition, and exit on the actual printed certificate and phone before approving it. Do not enable all 15 merely because one target works.

For an approved external AR experience, the previous optional `record.arUrl` remains supported. The built-in self-hosted prototype uses `experiences.json` instead and does not need `arUrl` or a new QR.

## Validation and limits

Run `npm test`, `npm run build`, `npm run test:seo`, `npm run test:coa`, and `npm run test:ar`.

Automated camera tests use Chromium's synthetic camera feed showing a render of the actual certificate front. They exercise real MindAR feature matching/pose updates and Three.js rendering; they do not substitute mocked anchor events for detection. These tests establish software behavior, not physical iPhone tracking stability or measured iPhone frame rate.

Before production approval, use iPhone 15 Safari with the printed original certificate:

1. Open the HTTPS **review preview** certificate URL directly. Existing QR codes still lead to production until an approved release; never replace the QR for testing.
2. Tap Experience in AR, read the instructions, then tap Start camera and grant access. Keep the whole front artwork image in view, in even light without glare; begin roughly 20–40 cm away and adjust.
3. Move slowly left/right and tilt the phone. Check that the small petal stays with the image, disappears when the target is hidden, and returns when it is visible.
4. Check denied permission/site-setting recovery, camera-busy behavior, background/foreground restart, portrait/landscape handling, Exit AR, browser Back, and that the camera indicator stops after exit.
5. Record real startup time, tracking jitter and frame rate. Repeat on modern Android Chrome where available.

Safari camera permission requires a secure context. In-app browsers can restrict camera APIs; open in Safari or Chrome if the fallback appears. WebGL2 and Blob workers are required by this renderer/tracker. Low light, glossy reflections, a partially hidden image or excessive camera movement can prevent image tracking. No physical iPhone or Safari hardware is available in this execution environment.

## Phase B

The golden tree, raining petals, flower, and mushroom scene is **not enabled in this Phase A change**. Establish the actual iPhone/printed-certificate stability first; then replace or extend the actor module while reusing camera consent, target files, anchor and lifecycle. No unrelated botanical site animation or artwork image is changed by this prototype.

No production deployment or merge is authorized by this task.

### Recorded automated results

- 143 tests across 26 files passed; TypeScript, the production build, SEO checks, all 15 COA output checks and AR asset-integrity checks passed.
- Chromium synthetic-camera tests detected the actual certificate-front target and rendered the petal. Moving the input certificate left moved the rendered petal 42.5 CSS pixels left; the test isolated rendered-petal pixels from the unchanged camera background.
- Real MindAR target loss and reacquisition passed. Both the camera-document Back button and parent Exit AR stopped the camera tracks and returned to the same certificate.
- Camera calls were zero before Start camera; Three/MindAR/tracking-target downloads did not occur before permission was granted. Observed AR requests were same-origin or workers created from the self-hosted bundle.
- Browser-level camera permission denial, missing-camera-API and insecure-context fallbacks passed. Direct `?ar=1` entry had no hydration errors. No browser runtime errors were recorded.
- Normal decorative motion was observed on a frozen camera frame; reduced-motion tests kept decorative motion off. iPhone-sized 393 × 852, narrow 320px fallback, and 1440px desktop layouts passed their checks.
- These results use simulated camera imagery and Chromium. They do not certify iPhone Safari, real printed-paper tracking, real-device startup latency or frame rate. Those remain the approval checks above.
