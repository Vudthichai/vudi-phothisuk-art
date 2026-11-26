import {
  Box3, CanvasTexture, Group, LinearFilter, LinearMipmapLinearFilter, MathUtils,
  Sprite, SpriteMaterial, SRGBColorSpace, Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeModel } from '../customTree';
import type { SculptureFactory } from '../engine';
import { msatExperience, msatTagline } from '../msatConfig';
import { createMsatAtmosphere } from './msatAtmosphere';
import { createSculptureEntrance } from './sculptureEntrance';
import { createSculptureTimeline } from './sculptureTimeline';

const entranceSeconds = 2;
const taglineSeconds = 1.5;
const font = '400 95px "Bodoni Moda"';

export function msatPresentation(elapsed: number, reduced: boolean) {
  const opacity = reduced ? 1 : MathUtils.smootherstep(elapsed, entranceSeconds, entranceSeconds + taglineSeconds);
  const idle = Math.max(0, elapsed - entranceSeconds);
  const settle = MathUtils.smoothstep(idle, 0, 1.4);
  return {
    opacity,
    taglineY: -.16 - .06 * (1 - opacity),
    float: reduced ? 0 : Math.sin(idle * 1.07) * .023 * settle,
    yaw: reduced ? 0 : Math.sin(idle * .74) * .065 * settle,
    explore: reduced || elapsed >= entranceSeconds + taglineSeconds,
  };
}

async function taglineTexture() {
  const faces = await document.fonts.load(font, msatTagline);
  if (!faces.length) throw new Error('The Bodoni Moda font is unavailable.');
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The signature typography could not be prepared.');
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#172c1f';
  ctx.fillStyle = '#fff9ea';
  ctx.strokeText(msatTagline, canvas.width / 2, 99);
  ctx.fillText(msatTagline, canvas.width / 2, 99);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

export function createMsatFactory(host: HTMLElement): SculptureFactory {
  return ({ signal, onState, onError }) => {
    const root = new Group(), upright = new Group(), presentation = new Group(), idle = new Group();
    root.visible = false;
    root.add(upright);
    upright.rotation.x = Math.PI / 2;
    presentation.position.y = .75;
    upright.add(presentation);
    presentation.add(idle);
    const explore = host.querySelector<HTMLAnchorElement>('.msat-explore');
    const accessibleText = host.querySelector<HTMLElement>('.msat-tagline-live');
    const clock = createSculptureTimeline();
    const pending = new AbortController();
    const abort = () => pending.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const timeout = window.setTimeout(abort, 30000);
    let texture: CanvasTexture | undefined;
    let tagline: Sprite | undefined;
    let reveal: ReturnType<typeof createSculptureEntrance> | undefined;
    let atmosphere: ReturnType<typeof createMsatAtmosphere> | undefined;
    let ready = false, disposed = false;

    async function load() {
      onState('loading');
      try {
        const text = await taglineTexture();
        if (pending.signal.aborted) {
          text.dispose();
          pending.signal.throwIfAborted();
        }
        texture = text;
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
        scene.position.sub(new Vector3(center.x, bounds.min.y, center.z));
        normalized.scale.setScalar(.72 / extent);
        normalized.position.set(0, .10, .08);
        reveal = createSculptureEntrance({
          duration: entranceSeconds, stagger: 0, softness: .23, atmosphere: 0,
          direction: [.11, .84, .05],
        }, idle, presentation);

        const material = new SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
        tagline = new Sprite(material);
        tagline.name = msatTagline;
        tagline.scale.set(.96, .96 * 192 / 1024, 1);
        tagline.position.z = .16;
        tagline.visible = false;
        presentation.add(tagline);
        atmosphere = createMsatAtmosphere(presentation);
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
      update(time, reduced, tracked) {
        root.visible = ready && tracked;
        const frame = clock.update(time, reduced, root.visible);
        const view = msatPresentation(frame.elapsedSeconds, reduced);
        if (explore) explore.hidden = !(root.visible && view.explore);
        if (accessibleText) accessibleText.hidden = !(root.visible && view.opacity > 0);
        if (!root.visible || !tagline) return;

        reveal?.update(frame.elapsedSeconds, reduced);
        idle.position.y = view.float;
        idle.rotation.y = view.yaw;
        tagline.visible = view.opacity > 0;
        tagline.material.opacity = view.opacity;
        tagline.position.y = view.taglineY;
        atmosphere?.update(frame.elapsedSeconds, reduced);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        abort();
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        if (explore) explore.hidden = true;
        if (accessibleText) accessibleText.hidden = true;
        reveal?.dispose();
        atmosphere?.dispose();
        tagline?.material.dispose();
        texture?.dispose();
        disposeModel(idle);
        root.clear();
      },
    };
  };
}
