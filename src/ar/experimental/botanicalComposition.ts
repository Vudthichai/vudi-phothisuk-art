import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeModel } from '../customTree';
import type { BotanicalComposition } from '../config';
import type { SculptureFactory } from '../engine';
import { createSculptureTimeline } from './sculptureTimeline';
import { createLeafRain } from './leafRain';
import { createGildedBotanical } from './gildedBotanical';
import { createEtherealPetals } from './etherealPetals';
import type { createEtherealCanopy } from './etherealCanopy';
import { createBloomOpening } from './bloomOpening';
import { createFirstBreathAtmosphere } from './firstBreathAtmosphere';
import { createFallingBloomSparks } from './fallingBloomSparks';
import { createSculptureEntrance } from './sculptureEntrance';
import { createMossAwakening, mossTurn } from './mossAwakening';
import { createStumpRebirth } from './stumpRebirth';
import { createLilyCinematics } from './lilyCinematics';

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
    const timeline = createSculptureTimeline();
    let previousTime: number | undefined;
    let floatElapsed = 0;
    let rain: ReturnType<typeof createLeafRain> | undefined;
    let petals: ReturnType<typeof createEtherealPetals> | undefined;
    let bloom: ReturnType<typeof createBloomOpening> | undefined;
    let breath: ReturnType<typeof createFirstBreathAtmosphere> | undefined;
    let bloomSparks: ReturnType<typeof createFallingBloomSparks> | undefined;
    let awakening: ReturnType<typeof createMossAwakening> | undefined;
    let rebirth: ReturnType<typeof createStumpRebirth> | undefined;
    let entrance: ReturnType<typeof createSculptureEntrance> | undefined;
    let lily: ReturnType<typeof createLilyCinematics> | undefined;
    let canopy: Awaited<ReturnType<typeof createEtherealCanopy>> | undefined;
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
          const extent = piece.fitHeight ? size.y : Math.max(size.x, size.y, size.z);
          const placement = new Group();
          const normalized = new Group();
          placement.position.fromArray(piece.position);
          placement.rotation.set(piece.rotation[0], piece.rotation[1], piece.rotation[2]);
          placement.scale.setScalar(piece.size / extent);
          turn.add(placement);
          placement.add(normalized);
          normalized.add(model);
          if (!Number.isFinite(extent) || extent <= 0) throw new Error(`Invalid bounds for ${piece.asset}`);
          normalized.position.set(-center.x, composition.leafRain ? -center.y : -bounds.min.y, -center.z);
        }
        if (composition.leafRain) {
          const [green, gold] = turn.children as Group[];
          rain = createLeafRain(turn, green, gold, composition.creativeFinish === 'leaves', composition.finalCanopy === 'leaves');
        }
        if (composition.mossAwakening) {
          const finalForest = composition.finalForest === 'moss';
          awakening = createMossAwakening(turn, upright, finalForest || composition.creativeFinish === 'moss', finalForest);
        }
        if (composition.stumpRebirth) rebirth = createStumpRebirth(turn, upright, composition.finalForest === 'rebirth');
        if (composition.gildedBotanical) {
          const support = createGildedBotanical(turn.children[0] as Group);
          turn.add(...support.children.slice());
        }
        if (composition.finalCanopy === 'ethereal') {
          const { createEtherealCanopy } = await import('./etherealCanopy');
          canopy = await createEtherealCanopy(turn, turn.children[0] as Group, pending.signal);
        }
        if (composition.entrance) entrance = createSculptureEntrance(composition.entrance, turn, upright, composition.creativeFinish === 'gilded');
        canopy?.varyShapedRims();
        if (composition.lilyCinematics) {
          lily = createLilyCinematics(composition.lilyCinematics, turn, upright, composition.entrance, composition.finalLilyLight);
        }
        if (composition.petalRain) {
          petals = createEtherealPetals(upright, composition.creativeFinish === 'ethereal', canopy?.centers);
        }
        if (composition.bloomOpening || composition.firstBreath) {
          bloom = createBloomOpening(turn, composition.firstBreath, composition.finalBloom);
          if (composition.firstBreath) breath = createFirstBreathAtmosphere(upright, bloom.stamen, 4.4);
          if (composition.finalBloom) bloomSparks = createFallingBloomSparks(upright);
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
      ...((composition.creativeFinish || composition.stumpRebirth || composition.lilyCinematics || composition.finalBloom) &&
        { pausePresentation: () => { timeline.update(0, false, false); } }),
      update(time, reduced, tracked) {
        const step = previousTime === undefined ? 0 : Math.min(.1, Math.max(0, time - previousTime));
        previousTime = time;
        root.visible = ready && tracked;
        const frame = timeline.update(time, reduced, root.visible);
        if (rain) {
          if (root.visible) rain.update(reduced ? 0 : frame.elapsedSeconds);
        } else if (awakening) {
          if (root.visible) awakening.update(frame.elapsedSeconds, reduced);
          turn.rotation.y = reduced ? 0 : mossTurn(frame.elapsedSeconds);
        } else if (rebirth) {
          if (root.visible) turn.rotation.y = rebirth.update(frame.elapsedSeconds, reduced);
        } else if (canopy) {
          if (root.visible) {
            canopy.update(frame.elapsedSeconds, reduced);
            petals?.update(frame.elapsedSeconds, reduced);
            entrance?.update(frame.elapsedSeconds, reduced);
          }
        } else {
          if (root.visible) {
            petals?.update(frame.elapsedSeconds, reduced);
            breath?.update(frame.elapsedSeconds, reduced);
            bloomSparks?.update(frame.elapsedSeconds, reduced);
          }
          const angle = bloom ? bloom.update(frame.elapsedSeconds, reduced)
            : entrance ? entrance.update(frame.elapsedSeconds, reduced) : frame.turn;
          turn.rotation.y = lily?.turnAt(frame.elapsedSeconds, reduced) ?? angle;
          if (root.visible) lily?.update(frame.elapsedSeconds, reduced);
          if (root.visible && !reduced) floatElapsed += step;
          const floatTime = composition.creativeFinish === 'ethereal' ? frame.elapsedSeconds : floatElapsed;
          turn.position.y = reduced ? 0 : (composition.float ?? 0) * Math.sin(floatTime);
        }
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        abort();
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        rain?.dispose();
        petals?.dispose();
        breath?.dispose();
        bloomSparks?.dispose();
        awakening?.dispose();
        rebirth?.dispose();
        entrance?.dispose();
        lily?.dispose();
        canopy?.dispose();
        disposeModel(root);
        root.clear();
      },
    };
  };
}
