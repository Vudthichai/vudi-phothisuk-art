import type { CSSProperties } from 'react';
import type { FlowerSequence } from './bloom';

/** Same registered sequence contract as Phase 2; growth is in frames, never scaling. */
export type GrowthSequence = FlowerSequence;
export type ForestControls = {
  duration?: number;
  trigger?: 'manual' | 'mount' | 'visible';
  replayKey?: number;
  scale?: number;
  placement?: { x: number; y: number };
  intensity?: number;
  /** Future original-audio integration only; no audio is loaded or played. */
  onCue?: (event: 'start' | 'complete') => void;
};
export type VineAsset = {
  id: string;
  image: string;
  width: number;
  height: number;
  /** Cubic SVG centerline in normalized 0–100 coordinates, registered to image. */
  path: string;
  revealWidth: number;
};
export type FoliagePiece = {
  id: string;
  image: string;
  width: number;
  height: number;
  x: number;
  y: number;
  size: number;
  angle?: number;
  /** Attachment point inside the cutout, e.g. '50% 95%'. */
  origin?: string;
};
export type BarkAsset = {
  id: string;
  image: string;
  /** Tonal ridge bands derived from this exact image; darkest bands first. */
  ridgeMasks: readonly string[];
};

/** Static fit shared by all layered scenes; never used to fake growth. */
export function forestPlacement(controls: ForestControls): CSSProperties {
  const x = Math.max(0, Math.min(100, controls.placement?.x ?? 50));
  const y = Math.max(0, Math.min(100, controls.placement?.y ?? 50));
  const size = `${Math.max(.1, Math.min(1, controls.scale ?? 1)) * 100}%`;
  return { width: size, height: size, left: `${x}%`, top: `${y}%`, transform: `translate(-${x}%, -${y}%)` };
}
export type VineLeaf = {
  id: string; image: string; width: number; height: number;
  /** Fraction along stem, deliberately nonuniform. */
  at: number; size: number; angle: number;
};
