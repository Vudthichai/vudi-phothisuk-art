/** Registered frames from one locked-camera sequence, never unrelated stills. */
export type FlowerSequence = {
  id: string;
  species: string;
  width: number;
  height: number;
  duration: number;
} & (
  | { status: 'approved'; frames: readonly [string, string, ...string[]]; poster: string }
  | { status: 'needs-assets'; frames: readonly []; reason: string }
);
