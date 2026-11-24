# Rainforest V2 — mist visibility and image-anchor stability review

This builds on PR #105 (`98359ec`), preserved as the visual checkpoint. Only the experimental `/rainforest-v2.html` gets stronger mist and the new optional pose filter. V1 `/rainforest-ar.html` and production golden AR retain their existing filter and rendering. No model, target, QR URL, certificate, storefront, or price changes.

## Review findings

Reviewed the supplied 12.02-second `Mother-Nature-AR.mov` privately. The tree is attached to the certificate, but the original mist is difficult to perceive. The second screen recording could not be transferred because it exceeds the workspace's 32 MiB attachment transfer limit; it has not been reviewed.

The existing pose filter compared translation against a fixed .08 tracker units. MindAR coordinates here are scaled in target pixels, so this fast-motion threshold is extremely small relative to the image. The new V2-only `StableImagePose` normalizes translation against target width and treats rotation separately. Small stationary motion is smoothed more strongly; sustained deliberate motion gets faster response. A single gross pose jump requires a consistent follow-up before it affects placement. Tracking loss still hides the sculpture immediately and clears filter history; no fake world anchor or camera-facing lock is added.

Mist uses the same four wisps and 64 KiB shared texture. Foreground root/lower-trunk wisps move closer to the viewer and opacity limits rise to .22/.18/.14/.12. Depth testing remains enabled, depth writes disabled, and reduced motion freezes drift. This keeps the existing rendering/recording path and adds no downloads or draw calls relative to PR #105.

## Compare on iPhone

- `/rainforest-v2.html`: new smoothing and stronger mist.
- `/rainforest-v2.html?stability=0`: previous smoothing with the same stronger mist, for controlled stability A/B.
- `/rainforest-v2.html?mist=0`: new smoothing with mist disabled.
- `/rainforest-v2.html?debug=1`: development-only diagnostics, not a normal UI panel.
- PR #105 preview: unchanged earlier V2 checkpoint for full visual comparison.

Use the same printed certificate, lighting, phone distance and default tree scale. Hold still, move slowly around the image, then briefly hide/reveal it. Confirm roots stay attached and movement feels responsive, not delayed. Record/save/share and Exit; confirm the camera stops. Automated synthetic-noise tests are not proof of reduced shake on a real iPhone.

Furniture placement AR commonly uses device world/surface tracking (for example ARKit/ARCore), which combines motion sensors and visual features. This browser flow estimates a picture pose. Stronger smoothing can reduce jitter, but does not give it the same world-tracking capabilities, and excessive smoothing can cause lag. No Amazon-specific implementation is asserted or copied.

## Petal source remains unresolved

The connected Drive folder named `AR ASSETS` has ID `1TRq03k-5KJtFU_-_S0NoIb-0PXyL96FV`; it differs from the older shared folder URL. Its accessible listing contains tree, flower-bud, blossom, vine and leaf GLBs, but no separately identified petal asset. A direct link/artist identification has been requested. No flower bud, blossom or leaf has been silently substituted for a falling petal. Petal integration remains pending that source; no birds or other scenery added.
