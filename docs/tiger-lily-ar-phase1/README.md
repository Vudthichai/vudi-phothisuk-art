# Tiger Lily AR — Phase 1: exact-certificate recognition

Date: November 25, 2026. Recognition only; no Tiger Lily GLB connection, production activation or deployment.

## 1. Exact source

- Private canonical PDF: `/workspace/coa-input/tiger-lily-original.pdf` (two pages, 5×7-inch certificate).
- This file is byte-identical to the uploaded ZIP entry `tiger-lily-original.pdf` in `/workspace/attachments/02f7809b-579f-47bd-8d89-50abbbb9b065/tiger-lily-original.pdf.zip`.
- SHA-256: `9b7637dd94e74831b45eb08cafe3415d16edfb7fd39c711186d6a5b1f2807ae1`. It matches the verified Tiger Lily Original record in `src/coa/routes.json`.
- Front/page 1 has one embedded artwork image: xref **15**, **1514×2050** decoded RGB pixels, bounds **[58.880001, 104, 301.119995, 432] pt**.
- Decoded image-pixel SHA-256: `1e50078ae18bd86b77af97348ff90325d1b2162542352936bc08eccafb68b573`.

No website photograph, screenshot extraction, alternate crop, recoloring or generated replacement was used. The private PDF was not changed or committed. Only the existing extractor's proportional web downsample is public, consistent with the Mother Nature pipeline.

## 2. Extraction and compilation

The existing scripts were used without changes:

```sh
python scripts/extract-ar-target.py /workspace/coa-input/tiger-lily-original.pdf \
  --xref 15 --output public/ar/targets/tiger-lily-original.jpg \
  --certificate-path /coa/forest-and-flowers/tiger-lily/original/

# Local development server, not a deployment:
npm run dev -- --host 0.0.0.0 --port 5192
python scripts/compile-ar-target.py --base http://localhost:5192 --experience tiger-lily-original
```

Succeeded:

- `public/ar/targets/tiger-lily-original.jpg`: **756×1024**, 474,032 bytes. Complete embedded image, proportional downsample only.
- `tiger-lily-original.mind`: **840,140 bytes**, MindAR **1.2.5**, **10 feature levels**, **3,995 matching features**, one target at index 0.
- Compiled SHA-256: `d80270d95fdb0ffb81ecd5bfca542c9fc4602d0d0cd40f8d5ccd75b1052ee227`.
- `tiger-lily-original.json` records source PDF/pixel/image/compiled hashes, exact bounds, dimensions and compiler evidence.

## 3. Registration and local recognition flow

`src/ar/experiences.json` registers `tiger-lily-original` with `previewOnly: true`, `recognitionOnly: true`, the verified Original `certificatePaths`, and **empty `entryPaths`**. The normal exported live experience list and certificate lookup still contain only Mother Nature. Preview lookup must be requested explicitly, and `camera.ts` permits it only on the nonproduction recognition route.

`/tiger-lily-ar.html` is a local experimental entry. It loads only Tiger Lily's compiled target and draws a small flat corner outline/centre cross in the tracked image plane. This is an anchor diagnostic, not a Tiger Lily model or a Mother Nature sculpture substitution. The marker's aspect follows the compiled image, including its authentic border/signature area. It uses the existing engine and handheld pose filter/tolerances. Camera access still requires user interaction, supports denied-permission messaging and is stopped on Exit.

Production builds omit this entry and its marker renderer. Direct `ar-camera.html?experience=tiger-lily-original` stays unavailable. Tiger Lily certificate pages gain no AR button or route change. Target files remain in the repository's standard asset directory for compilation/local use; the registry does not enable them in production.

Mother Nature V5 was inspected against released main **`cc17fe9`** (#110). Its experience record, certificate iframe routing, engine, V5 scene/effects, pose profile, recording implementation, original target files and GLB assets are unchanged. The shared camera edits are Tiger-only branches; the released production V5 route remains enabled.

## 4. Recognition tests and limitations

`scripts/make-certificate-camera-feed.py` rasterizes the **complete authentic PDF front** to private camera fixtures, then applies synthetic frontal/oblique/moving views and occlusion. It does not modify the tracking target. Browser checks use Chromium software WebGL and fake camera input:

```sh
python scripts/make-certificate-camera-feed.py --pdf /workspace/coa-input/tiger-lily-original.pdf --mode frontal --seconds 5 --output /tmp/tiger-frontal.y4m
python scripts/make-certificate-camera-feed.py --pdf /workspace/coa-input/tiger-lily-original.pdf --mode moving --seconds 90 --output /tmp/tiger-moving.y4m
python scripts/make-certificate-camera-feed.py --pdf /workspace/coa-input/mother-nature-original.pdf --mode frontal --seconds 5 --output /tmp/tiger-negative.y4m
npm run build
npm run preview -- --host 0.0.0.0 --port 5193
python scripts/check-tiger-recognition-browser.py --base http://localhost:5193 --frontal /tmp/tiger-frontal.y4m --moving /tmp/tiger-moving.y4m --negative /tmp/tiger-negative.y4m --output /tmp/tiger-review
```

Observed after rebasing on released Mother Nature V5:

- Frontal Tiger Lily certificate fixture: recognized; marker maintained a stationary pose.
- Oblique/moving Tiger Lily certificate fixture: recognized and reacquired after occlusion.
- Mother Nature certificate negative control: no Tiger Lily match during the 12-second observation.
- No GLB or Mother Nature `.mind` requests in any Tiger recognition case.
- No automatic camera request; camera stopped on Exit; denied camera permission produced the expected recoverable error.
- Normal Tiger Lily certificate and generic camera entry remain disabled for this preview-only experience.
- No browser page errors. Private evidence: `/workspace/previews/tiger-lily-recognition/`; compact results: `verification.json`.

The fixed-frame software pose was numerically stationary; the moving pose step includes deliberate fixture motion and is **not a physical jitter/error measurement**. These tests do not establish recognition of a real printed/laminated certificate, handheld iPhone 15 stability, glare tolerance, viewing-distance limits, camera focus or iPhone frame rate. A physical certificate/Safari test remains required. The initial denial test waited for a zero-height root container to be visible; its corrected state-attached assertion passed.

For physical testing after approval, use an HTTPS development host and open `/tiger-lily-ar.html`. Show the actual Original front, keep fingers off the artwork, test frontal/oblique/handheld motion, brief loss/reacquisition and glare, then Exit and confirm camera shutdown. No hosted preview was deployed for this task.

## 5. Collector's Edition

Its private source is available at `/workspace/coa-input/tiger-lily-collectors-edition.pdf`:

- PDF SHA-256: `266c52be4071323a343878b30e8121ac7260c44b6bd133e34a7da1550d7f28fa`.
- Page 1, xref 15: **1538×2050** pixels, bounds **[56.959999, 104, 303.040009, 432] pt**.
- Decoded pixel SHA-256: `604cc32a8dd136f8b4e67d26f836cfd3c04ce1cfb367e40297e066155f19c597`.

The existing extractor's `--reuse` check rejected this front because its pixels differ. Its image proportions differ too. Under the existing exact-image provenance rule, **compile a separate Collector's Edition target** before enabling recognition for that physical front. It was not compiled/registered in this Original-only phase, and cross-recognition has not been claimed. `collectorsEditionCompatible` stays false.

## 6. Before connecting the Tiger Lily GLB

1. Verify the actual Original print with iPhone Safari; record recognition, root anchoring, motion/loss and lighting results.
2. Select/confirm the intended Tiger Lily GLB, optimize geometry/textures for mobile, verify materials/UVs/orientation and choose artist-approved physical placement/scale.
3. Add a Tiger-specific scene factory to the verified image anchor; keep camera/recording cleanup and a recognition-only failure mode. Do not route Tiger Lily to a Mother Nature model.
4. Compile/validate the separate Collector's Edition target if that front is included in a later phase.
5. Enable certificate entry paths and deploy only after explicit approval. No QR destination changes are needed.

## Review and deployment safeguard

Dedicated branch: `feat/tiger-lily-recognition`, based on released main `cc17fe9`. Every pushed commit and the draft PR title include **`[skip netlify]`** to prevent both branch and PR-preview deploys, per Netlify's documented skip behavior: https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#skip-a-deploy . Do not remove those markers or deploy without approval.

Final local checks passed on this branch: **190 tests / 35 files**, TypeScript and development/production builds, SEO checks, all 15 COA routes, target/compiler/vendor/model integrity checks, and production verification that Mother Nature V5 is still present while Tiger Lily's standalone page and marker renderer are excluded. No Mother Nature scene, tracking-engine, recording, certificate iframe, target or GLB files differ from released main.
