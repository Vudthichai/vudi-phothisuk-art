# Forest & Flowers AR — Phase B review

Implements Issue #97 on top of the isolated Phase A draft PR #96. The artist confirmed that Phase A recognized Mother Nature on an actual iPhone 15, both on a screen and an exhibition flyer. This is not yet final 5 × 7 certificate or Phase B hardware acceptance.

## Review flow

Use the HTTPS Netlify **draft preview**, not the live QR destination:

`/coa/forest-and-flowers/mother-nature/original/?ar=1`

The certificate now places its enabled AR entry in the certificate heading, before the photograph/facts. Tap **Experience in AR**, then **Start camera** and the browser permission prompt. No camera opens on page load. The concise initial screen shows the exact target preview. Camera mode fills the modal; a discreet Exit control and Record are the only primary controls. Guidance disappears after acquisition and returns on loss. Record is available when the image is found; an active recording can still be stopped if tracking is lost.

The image target, source provenance, original photographs, permanent QR paths, other 13 certificate states, prices, and production PDFs are unchanged. The Mother Nature original and Collector’s Edition pages now share the same AR entry and original-image target. The printed Collector’s Edition card is not separately compiled or verified as an image target; visitors should use a matching image of the artwork (as shown in the AR preview). The QR still opens the digital certificate, where visitors explicitly select Experience in AR and grant camera permission. See [Phase A target setup](certificate-ar-prototype.md) for enabling another verified certificate. This branch does not enable additional certificates.

## Sculpture and tracking

- `src/ar/botanical.ts`: original procedural golden tree with tapered, twisting branches and curved sculpted leaves; small open flower, mushroom and seven falling petals. Instanced foliage/petals, merged branch mesh, shared materials and no downloaded models or artwork textures. Under 65,000 rendered triangles; a small, precomputed 128px studio environment supplies metallic reflections.
- The scene base sits 0.26 target widths in front of the image, near its lower centre. A 1.8-second scale/rise reveal runs once after initial acquisition. Slow Y rotation reveals branch depth. Decorative reveal/rotation/falling petals stop under reduced motion; tracking still updates with the phone.
- `src/ar/pose.ts`: modest frame-time-based translation/scale interpolation and quaternion smoothing, with a faster response to larger movement. Native MindAR filtering remains. No world-locking infrastructure, pose prediction, fake fixed screen anchor or held sculpture after target loss. Loss hides the actor; reacquisition resets the added filter to avoid rubber-banding from a stale pose.
- `engine.ts`: renderer exposes an optional synchronous post-render callback used only while recording. Disposal also frees the environment and sculpture resources.

## Local composited recording

`src/ar/recording.ts` paints **the camera video and the freshly rendered transparent Three canvas into one opaque 2D canvas**, matching the live cover crop. It records this canvas stream, never the raw camera track by itself. No microphone is requested. The visitor explicitly taps Record; the clip ends at 12 seconds or on Stop. Recording uses a 720px maximum dimension, even pixel sizes, 24fps capture ceiling and a 2.5Mbps bitrate request. These are ceilings/requests, not measured iPhone frame-rate claims.

Progressive checks require both `canvas.captureStream` and `MediaRecorder.isTypeSupported`. Supported H.264/MP4 is preferred; WebM is a fallback. Constructor/runtime failures, no rendered frames, no output data and stop timeouts lead to native recording guidance. Clips are decoded in a local preview before the visitor saves/shares; the page tells visitors to check for blank/incomplete output. We cannot detect every browser encoder defect automatically.

**Share video** appears only if file sharing is supported. The native share sheet is invoked directly from its own button gesture. **Save video** uses a local Blob URL/download; browser handling varies. Clips are never uploaded, persisted to storage or automatically recorded. Exit, pagehide/background and errors cancel recording, discard unfinished data, stop capture and camera tracks, detach the render callback, and revoke preview URLs. Dismissing a completed clip releases it. No finished clip is kept after leaving the camera experience.

Native fallback explains iPhone Control Center → Screen Recording → return to AR → capture 10–15 seconds → stop → Photos. Android Quick Settings guidance is also supplied. Opening Control Center/backgrounding can pause the camera; restart deliberately if prompted. Keep the microphone off. The fallback does not pretend to invoke iOS screen recording from JavaScript.

### Browser evidence, not a blanket iPhone guarantee

- [WebKit MediaRecorder API](https://webkit.org/blog/11353/): supports recording media streams including canvas-generated input, historically MP4/H.264.
- [WebKit Safari 18.4 features](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/): adds WebM recording. MIME/container support depends on the installed Safari/iOS version, not the iPhone model alone.
- [WebKit canvas recording issue 229611](https://bugs.webkit.org/show_bug.cgi?id=229611): historical blank canvas-recording output illustrates why API presence alone is insufficient.
- [Apple native screen-recording instructions](https://support.apple.com/en-us/102653).

Direct composited recording on the artist's actual iPhone 15/Safari, native file share/save behavior, thermal performance and final printed-certificate stability **require physical verification**. Chromium simulation is not Safari validation. Use the native fallback if preview output is wrong.

## Repeatable checks

`npm test`, `npm run build`, `npm run test:seo`, `npm run test:coa`, `npm run test:ar`.

The optional Python Playwright integration check uses a private local Y4M camera feed of the authentic certificate front (not committed or published), Chromium and a locally served production build:

```sh
python -m http.server 5178 --directory dist
python scripts/check-ar-browser.py --base http://localhost:5178 \
  --camera-feed /path/to/private-certificate-front.y4m \
  --output /tmp/ar-phase-b-review
```

The script verifies real MindAR acquisition, no pre-gesture camera, the rendered tree, an explicitly requested composited clip, browser decode and save, gesture-based file-sharing plumbing, native guidance when recording APIs are absent or encoder construction fails, and camera teardown. File sharing is simulated; it does not claim to test an iOS share sheet. Review evidence can contain the certificate front; keep it private.

## Physical iPhone acceptance before merging

1. Safari over HTTPS, portrait, final Mother Nature original certificate; also compare screen and exhibition flyer. Check startup, the gold surface, flower/mushroom and rise/rotation.
2. Slow/moderate pan, tilt, rotation, near/far, glare and uneven light. Compare before/after recordings for jitter versus lag. Briefly cover the image; sculpture must hide, then reacquire aligned.
3. Record 12 seconds; inspect the complete saved file for camera + sculpture together, correct orientation, motion, duration and no black/blank frames. Share to Files/Photos or another app. Repeat with early Stop and tracking loss during recording.
4. Test native screen-recording fallback, permission denial, background/foreground, Escape/Exit, and camera indicator shutdown. Confirm no mic permission, upload or residual recording.
5. Rotate device: if camera calibration changes, the existing restart guidance intentionally replaces the session. Check readable controls and safe areas on a physical notch/Dynamic Island device.

Do not edit/reprint physical certificates here. Suggested future QR caption: “Scan to explore your artwork”; only on an AR-enabled certificate, optional “Digital certificate · Augmented reality”. Existing QR symbols and destinations remain unchanged. A small insert/sticker can be considered with separate artist approval.

## Recorded review results — November 23, 2026

- 150 tests across 27 files passed; production/TypeScript, SEO, all 15 COA records and target/vendor integrity checks passed.
- Production-output Chromium with the authentic front-image camera feed detected the target and rendered the botanical scene. A downloaded H.264/MP4 decoded at 332 × 720, 10.648 seconds, 82,038 bytes. This software-rendered test is evidence that both layers can be captured; it is not an iPhone frame-rate benchmark or a promise of an exact encoded duration.
- File-sharing plumbing received the recorded file from an active user gesture (the share API was simulated). API-absent and encoder-constructor-failure cases displayed native guidance. Exit stopped camera tracks; no camera was requested before Start.
- A longer real image/blank-image feed verified loss and reacquisition. Backgrounding during recording discarded the unfinished clip and shut down the session. Unsupported-camera mobile layout, desktop instructions, and real browser-level permission denial/exit passed.
- Private evidence is in `/workspace/previews/certificate-ar-phase-b/`, with the final recording run under `final/`. No physical certificate, camera-feed file or test recording was added to public assets.
