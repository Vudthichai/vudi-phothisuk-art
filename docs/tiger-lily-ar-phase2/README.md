# Tiger Lily AR Phase 2 — authentic orange blossom

This supersedes the Phase 1 recognition-only default on the same **nonproduction** `/tiger-lily-ar.html` preview. The original tracking diagnostic remains at `/tiger-lily-ar.html?mode=recognition`. Neither mode enables Tiger Lily certificate-page buttons or changes physical QR destinations. PR #111 remains a draft.

## Source inspection before integration

Drive folder: **AR ASSETS** (`1TRq03k-5KJtFU_-_S0NoIb-0PXyL96FV`). Authentic orange source:

- `Meshy_AI_Tiger_Lily_Blossom_1124061401_image-to-3d-texture.glb`
- https://drive.google.com/file/d/1KUVhw72rofj6YWFp5AN4V3sPVkdYOTFu/view
- 60,398,104 bytes, **1,144,910 triangles**, one mesh, one material, one node, no animation rig.
- Source SHA-256: `d120f7807b99887e67b3d90c619af10c7d1e5e804cc6ef28edf83d315de78219`.
- POSITION, NORMAL, TEXCOORD_0 present; embedded base color 4096², normal 4096² and metallic/roughness 2048². Material is double sided. Existing PBR values are preserved.
- Direct delivery would be too expensive for this mobile experience. No missing textures or external image dependencies were found. This is a static blossom; organic motion uses parent transforms, not a fabricated rig or changed mesh.

The original is stored outside Git at `/workspace/tiger-lily-source/original.glb`. Its render confirms curled orange spotted petals and long stamens. No crimson, pink, yellow, procedural or generated substitute was used.

## Optimized asset

`public/ar/models/tiger-lily-orange.glb`: **10,018,892 bytes**, **100,000 triangles**. Source and delivery hashes are recorded in the adjacent JSON manifest. Geometry reduction is about 91%; file reduction is about 83%.

`tools/ar/optimize-tiger-lily.mjs` uses glTF Transform, meshoptimizer and sharp: weld/simplify (error .003), prune, base color JPEG92 at 2048², normal PNG at 2048², metallic/roughness PNG at 1024², then Meshopt compression and quantization. Normals, UVs, three embedded maps and material properties are retained. The bundled Three.js Meshopt decoder is reused; no CDN or paid service is needed. Estimated RGBA8 texture memory including mipmaps drops from ~192 MiB to ~48 MiB; this is an estimate, not a device measurement.

Original/optimized comparison renders use identical Blender cameras and lighting. Petal silhouette, spots and stamens remain recognizable; tiny geometry and texture details are reduced. Private comparison images: `/workspace/tiger-lily-source/original-render.png` and `mobile-render.png`. The optional optimizer third argument writes an uncompressed review copy for Blender; only the compressed delivery file is committed.

## Placement, motion and lifecycle

`src/ar/experimental/tigerLily.ts` normalizes source height to .95 target widths, centers the mesh, and maps its Y axis onto the tracked image's positive normal via a parent X rotation. Its root pivot is near the lower central artwork, .035 target widths above the surface. Geometry is not rewritten. A gentle 36-second rotation runs around the local vertical axis with ~1.4°/1° organic sway. Motion pauses while untracked; reduced-motion mode uses a static pose. Tracking loss hides the model, with the existing handheld stability filter unchanged.

Loading uses an abortable same-origin fetch, a 30-second timeout and asynchronous GLTF parsing. Exit aborts fetches and disposes late-decoded models, textures, materials and geometry. Model failure produces a recoverable camera error rather than substituting a different sculpture. The recognition-only URL remains available as the fallback.

Shared camera changes are gated to the Tiger preview. Engine, recording, Mother Nature V5 scene/placement/motion, its model and target files, and its certificate entry paths remain unchanged. Production builds still omit the Tiger page and renderer. The same generic recording, Save, Share and Exit flow is retained.

## Verification and testing

- `src/ar-tiger-lily.test.ts`: normal-axis placement, root clearance, motion/loss/reduced-motion, one model request, failed download and late decode after Exit disposal.
- `scripts/check-tiger-lily-model.mjs`: exact asset hash/size, triangle count, normals/UVs, embedded maps, compression extension.
- `scripts/check-tiger-flower-browser.py`: real compiled target + full authentic PDF-front synthetic camera fixtures; frontal and moving/oblique recognition, loss/reacquisition, negative Mother target, no Mother model fetch, recording review and camera cleanup, permission denial, no new live certificate buttons.
- `scripts/check-tiger-recognition-browser.py`: original marker-only fallback now explicitly uses `mode=recognition`.

Software Chromium/SwiftShader checks do not establish physical iPhone 15 FPS, temperature, camera stability or Safari recording support. User confirmed Phase 1 recognition on iPhone; Phase 2 rendering, angle/orientation, material quality, recording and sustained performance still need physical-device review.

## iPhone preview

Open the latest PR #111 Netlify preview at `/tiger-lily-ar.html` in Safari, tap **Start camera**, allow camera access and point at the Tiger Lily Original certificate artwork. Try a certificate laid flat and held upright, move slowly around the flower, cover/uncover the image, record a clip and inspect the saved result. Tap **Exit** and check the camera indicator stops. Use native screen recording if Safari cannot produce a usable composited clip.

No merge or production deployment is authorized. The preview is the only authorized deployment.

### Recorded local results

Frontal, moving/oblique, occlusion/reacquisition, negative Mother Nature input, permission-denial and Exit tests passed. Each case requested exactly one Tiger GLB and no Mother target/model. A composited 332×720 recording decoded successfully and its review image shows the flower. Software-render metrics are recorded in `verification.json`; they are not iPhone FPS measurements.

The broad test run completed **192 passed / 1 failed (193 tests)**. Its unrelated `flower-bloom` timing test reported `nextFrame is not a function`; all five tests in that file passed when rerun, alongside all seven Tiger model/recognition tests (12/12). A separate broad run showed timing failures in existing artwork-experience tests, which also passed in isolation. No unrelated animation/test implementation was changed. TypeScript, preview build, production build, SEO, all 15 COA routes and asset integrity checks passed. Production entry inspection retained Mother Nature V5 and omitted the Tiger page.
