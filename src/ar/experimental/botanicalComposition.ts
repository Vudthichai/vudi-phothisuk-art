import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeModel } from '../customTree';
import type { BotanicalComposition } from '../config';
import type { SculptureFactory } from '../engine';

export function createBotanicalComposition(composition: BotanicalComposition, title: string): SculptureFactory {
  return ({ signal, onState, onError }) => {
    const root = new Group();
    const upright = new Group();
    upright.position.set(0, -.18, .035);
    upright.rotation.x = Math.PI / 2;
    const turn = new Group();
    root.visible = false;
    root.add(upright);
    upright.add(turn);

    const pending = new AbortController();
    const abort = () => pending.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const timeout = window.setTimeout(abort, 60000);
    let disposed = false;
    let ready = false;
    let previousTime: number | undefined;
    let elapsed = 0;
    onState('loading');

    async function load() {
      const sources = new Map<string, Group>();
      try {
        await MeshoptDecoder.ready;
        const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
        for (const piece of composition.pieces) {
          pending.signal.throwIfAborted();
          let model = sources.get(piece.asset);
          if (model) {
            model = model.clone();
          } else {
            const response = await fetch(piece.asset, { signal: pending.signal });
            if (!response.ok) throw new Error(`Could not load ${piece.asset}`);
            model = (await loader.parseAsync(await response.arrayBuffer(), '')).scene;
            if (pending.signal.aborted) {
              disposeModel(model);
              pending.signal.throwIfAborted();
            }
            sources.set(piece.asset, model);
          }

          const bounds = new Box3().setFromObject(model);
          const size = bounds.getSize(new Vector3());
          const center = bounds.getCenter(new Vector3());
          const extent = Math.max(size.x, size.y, size.z);
          const placement = new Group();
          const normalized = new Group();
          placement.position.fromArray(piece.position);
          placement.rotation.set(piece.rotation[0], piece.rotation[1], piece.rotation[2]);
          placement.scale.setScalar(piece.size / extent);
          turn.add(placement);
          placement.add(normalized);
          normalized.add(model);
          if (!Number.isFinite(extent) || extent <= 0) throw new Error(`Invalid bounds for ${piece.asset}`);
          normalized.position.set(-center.x, -bounds.min.y, -center.z);
        }
        ready = true;
        onState('ready');
      } catch {
        if (!disposed && !signal.aborted) {
          onError(new Error(`${title} could not load. Restart the camera or test with the outline.`));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    void load();
    return {
      root,
      uprightRoot: () => upright,
      update(time, reduced, tracked) {
        const step = previousTime === undefined ? 0 : Math.min(.1, Math.max(0, time - previousTime));
        previousTime = time;
        root.visible = ready && tracked;
        if (root.visible && !reduced) elapsed += step;
        turn.rotation.y = reduced ? 0 : elapsed * Math.PI * 2 / composition.rotationSeconds;
        turn.position.y = reduced ? 0 : (composition.float ?? 0) * Math.sin(elapsed);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        abort();
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        disposeModel(root);
        root.clear();
      },
    };
  };
}
