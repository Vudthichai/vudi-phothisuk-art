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
