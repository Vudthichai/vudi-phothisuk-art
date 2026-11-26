import { Box3, Group, MathUtils, Matrix4, PerspectiveCamera, Vector3, Vector4 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeModel } from '../customTree';
import type { SculptureFactory } from '../engine';
import { MSAT_ENTRANCE_SECONDS, msatExperience } from '../msatConfig';
import { createMsatOverlay } from './msatOverlay';
import { createMsatAtmosphere } from './msatAtmosphere';
import { createSculptureEntrance } from './sculptureEntrance';
import { createSculptureTimeline } from './sculptureTimeline';

const defaultSize = 1.32;
const defaultCenter = new Vector3(0, .93, .08);

export function msatPresentation(elapsed: number, reduced: boolean) {
  const idle = Math.max(0, elapsed - MSAT_ENTRANCE_SECONDS);
  const settle = MathUtils.smoothstep(idle, 0, 1.4);
  return {
    float: reduced ? 0 : Math.sin(idle * 1.07) * .023 * settle,
    yaw: reduced ? 0 : Math.sin(idle * .74) * .065 * settle,
  };
}

type ScreenBounds = { left: number; top: number; right: number; bottom: number };

function createEmblemFraming(
  host: HTMLElement, camera: PerspectiveCamera, upright: Group, presentation: Group,
  extent: Vector3, captionHeight: () => number,
) {
  const surface = host.querySelector('.ar-surface');
  const controls = host.querySelector('.ar-controls');
  const exit = host.querySelector('.ar-exit');
  // Reserve for the small authored idle sway without resizing to each pulse.
  const half = extent.clone().multiplyScalar(.5).add(new Vector3(.012, .027, .035));
  const corners: Vector4[] = [];
  for (const x of [-half.x, half.x]) for (const y of [-half.y, half.y]) {
    for (const z of [-half.z, half.z]) corners.push(new Vector4(x, y, z, 0));
  }

  const projection = new Matrix4(), inverse = new Matrix4();
  const offsets = corners.map(() => new Vector4());
  const center = new Vector4(), point = new Vector4();
  const desired = new Vector3();
  let viewport: ScreenBounds & { width: number; height: number };
  let safe: ScreenBounds;
  let previous: number | undefined, measuredAt = -Infinity;

  function measure(time: number) {
    if (time - measuredAt < .12) return;
    measuredAt = time;
    const rect = surface?.getBoundingClientRect();
    viewport = rect?.width && rect.height ? rect : {
      left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight,
      width: window.innerWidth, height: window.innerHeight,
    };
    if (viewport.width < 1 || viewport.height < 1) return;
    const exitRect = exit?.getBoundingClientRect();
    const controlRect = controls?.getBoundingClientRect();
    const margin = Math.max(16, .055 * viewport.width, exitRect?.width ? viewport.right - exitRect.right : 0);
    const top = Math.max(viewport.top + 22, exitRect?.height ? exitRect.bottom + 10 : viewport.top);
    const bottom = Math.min(viewport.bottom - 20, controlRect?.height ? controlRect.top - 12 : viewport.bottom)
      - captionHeight() - 18;
    safe = {
      left: 2 * margin / viewport.width - 1,
      right: 1 - 2 * margin / viewport.width,
      top: 1 - 2 * (top - viewport.top) / viewport.height,
      bottom: 1 - 2 * (bottom - viewport.top) / viewport.height,
    };
  }

  function projectCenter(position: Vector3) {
    return center.set(position.x, position.y, position.z, 1).applyMatrix4(projection);
  }

  function outline(at: Vector4, scale: number): ScreenBounds {
    const bounds = { left: Infinity, top: -Infinity, right: -Infinity, bottom: Infinity };
    for (const offset of offsets) {
      point.copy(offset).multiplyScalar(scale).add(at);
      const depth = Math.max(camera.near, point.w);
      const x = point.x / depth, y = point.y / depth;
      bounds.left = Math.min(bounds.left, x);
      bounds.right = Math.max(bounds.right, x);
      bounds.top = Math.max(bounds.top, y);
      bounds.bottom = Math.min(bounds.bottom, y);
    }
    return bounds;
  }

  function fit(at: Vector4, maxScale: number) {
    // Every limit is linear in homogeneous clip coordinates. Bound all eight
    // corners directly so angled magnets and the near plane do not clip.
    for (const offset of offsets) {
      const right = offset.x - safe.right * offset.w;
      const left = safe.left * offset.w - offset.x;
      const top = offset.y - safe.top * offset.w;
      const bottom = safe.bottom * offset.w - offset.y;
      if (right > 0) maxScale = Math.min(maxScale, (safe.right * at.w - at.x) / right);
      if (left > 0) maxScale = Math.min(maxScale, (at.x - safe.left * at.w) / left);
      if (top > 0) maxScale = Math.min(maxScale, (safe.top * at.w - at.y) / top);
      if (bottom > 0) maxScale = Math.min(maxScale, (at.y - safe.bottom * at.w) / bottom);
      if (offset.w < 0) maxScale = Math.min(maxScale, (at.w - camera.near) / -offset.w);
    }
    return Math.max(.015, maxScale);
  }

  return (time: number): ScreenBounds | undefined => {
    measure(time);
    if (!safe || safe.top <= safe.bottom || safe.right <= safe.left) return;
    upright.updateWorldMatrix(true, false);
    camera.updateWorldMatrix(true, false);
    projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(upright.matrixWorld);
    offsets.forEach((offset, index) => offset.copy(corners[index]).applyMatrix4(projection));
    const at = projectCenter(defaultCenter);
    if (at.w <= camera.near) return;

    const x = at.x / at.w, y = at.y / at.w;
    const nominal = outline(at, defaultSize);
    const width = safe.right - safe.left, height = safe.top - safe.bottom;
    const minimumScale = defaultSize * .65 * width / Math.max(.01, nominal.right - nominal.left);
    const preferred = MathUtils.clamp(minimumScale, defaultSize, 1.82);
    const silhouette = outline(at, preferred);
    const halfWidth = Math.min(width * .49, Math.max(x - silhouette.left, silhouette.right - x));
    const halfHeight = Math.min(height * .49, Math.max(y - silhouette.bottom, silhouette.top - y));
    const fitX = MathUtils.clamp(x, safe.left + halfWidth, safe.right - halfWidth);
    const fitY = MathUtils.clamp(y, safe.bottom + halfHeight, safe.top - halfHeight);
    // Shift only enough to keep the useful image visible, at its registered
    // depth. Orientation and scale still live below the tracked magnet.
    inverse.copy(projection).invert();
    point.set(fitX * at.w, fitY * at.w, at.z, at.w).applyMatrix4(inverse);
    desired.set(point.x, point.y, point.z).divideScalar(point.w);

    const response = previous === undefined ? 1 : 1 - Math.exp(-Math.min(time - previous, .20) * 11);
    previous = time;
    presentation.position.lerp(desired, response);
    let limit = fit(projectCenter(presentation.position), preferred);
    if (limit < .48 * preferred) {
      presentation.position.copy(desired);
      limit = fit(projectCenter(presentation.position), preferred);
    }
    presentation.scale.setScalar(Math.min(limit, MathUtils.lerp(presentation.scale.x, limit, response)));
    const bounds = outline(center, presentation.scale.x);
    const xPx = (value: number) => viewport.left + (value + 1) * viewport.width / 2;
    const yPx = (value: number) => viewport.top + (1 - value) * viewport.height / 2;
    return { left: xPx(bounds.left), right: xPx(bounds.right), top: yPx(bounds.top), bottom: yPx(bounds.bottom) };
  };
}

export function createMsatFactory(host: HTMLElement): SculptureFactory {
  return ({ signal, onState, onError, view: cameraView }) => {
    const root = new Group(), upright = new Group(), presentation = new Group(), idle = new Group();
    root.visible = false;
    root.add(upright);
    upright.rotation.x = Math.PI / 2;
    presentation.position.copy(defaultCenter);
    presentation.scale.setScalar(defaultSize);
    upright.add(presentation);
    presentation.add(idle);
    const overlay = host.querySelector('.msat-tagline') && host.querySelector('.msat-nav')
      ? createMsatOverlay(host) : undefined;
    const atmosphereRoot = new Group();
    atmosphereRoot.position.y = -.38;
    presentation.add(atmosphereRoot);
    const clock = createSculptureTimeline();
    const pending = new AbortController();
    const abort = () => pending.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const timeout = window.setTimeout(abort, 30000);
    let frameEmblem: ReturnType<typeof createEmblemFraming> | undefined;
    let reveal: ReturnType<typeof createSculptureEntrance> | undefined;
    let atmosphere: ReturnType<typeof createMsatAtmosphere> | undefined;
    let ready = false, disposed = false;

    async function load() {
      onState('loading');
      try {
        const response = await fetch(msatExperience.modelAsset!, { signal: pending.signal });
        if (!response.ok) throw new Error('The signature sculpture could not be downloaded.');
        const bytes = await response.arrayBuffer();
        await MeshoptDecoder.ready;
        pending.signal.throwIfAborted();
        const { scene } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes, '');
        if (pending.signal.aborted) {
          disposeModel(scene);
          pending.signal.throwIfAborted();
        }
        const bounds = new Box3().setFromObject(scene);
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());
        const extent = Math.max(size.x, size.y);
        const normalized = new Group();
        normalized.add(scene);
        idle.add(normalized);
        if (!Number.isFinite(extent) || extent <= 0) throw new Error('The signature sculpture has invalid dimensions.');
        scene.position.sub(center);
        normalized.scale.setScalar(1 / extent);
        if (cameraView) {
          frameEmblem = createEmblemFraming(host, cameraView.camera, upright, presentation,
            size.divideScalar(extent), () => overlay?.captionHeight() ?? 0);
        }
        reveal = createSculptureEntrance({
          duration: MSAT_ENTRANCE_SECONDS, stagger: 0, softness: .23, atmosphere: 0,
          direction: [.11, .84, .05],
        }, idle, presentation);

        atmosphere = createMsatAtmosphere(atmosphereRoot);
        ready = true;
        onState('ready');
      } catch (error) {
        if (!disposed && !signal.aborted) {
          onError(new Error(pending.signal.aborted ? 'The signature took too long to load. Please try again.'
            : error instanceof Error ? error.message : 'The signature could not load.'));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    void load();
    return {
      root,
      uprightRoot: () => upright,
      screenUprightFallback: true,
      pausePresentation: () => { clock.update(0, false, false); },
      update(time, reduced, tracked) {
        root.visible = ready && tracked;
        const frame = clock.update(time, reduced, root.visible);
        const bounds = root.visible ? frameEmblem?.(time) : undefined;
        const typedAt = overlay?.update(frame.elapsedSeconds, reduced, root.visible, bounds);
        if (!root.visible) return;

        const view = msatPresentation(frame.elapsedSeconds, reduced);
        reveal?.update(frame.elapsedSeconds, reduced);
        idle.position.y = view.float;
        idle.rotation.y = view.yaw;
        atmosphere?.update(frame.elapsedSeconds, reduced, typedAt);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        abort();
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        overlay?.dispose();
        reveal?.dispose();
        atmosphere?.dispose();
        disposeModel(idle);
        root.clear();
      },
    };
  };
}
