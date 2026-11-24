/** One authoritative presentation clock. Future music can follow elapsedSeconds without owning animation. */
export const SCULPTURE_TIMING = Object.freeze({ fadeSeconds: .7, revolutionSeconds: 11 });
export function createSculptureTimeline() {
  let elapsedSeconds = 0, previous: number | undefined, started = false;
  return {
    update(time: number, reduced: boolean, tracked: boolean) {
      if (tracked) {
        if (!started) started = true;
        else if (previous !== undefined) elapsedSeconds += Math.max(0, time - previous);
      }
      previous = tracked ? time : undefined;
      const progress = started ? reduced ? 1 : Math.min(1, elapsedSeconds / SCULPTURE_TIMING.fadeSeconds) : 0;
      return { started, elapsedSeconds, progress, opacity: progress * progress * (3 - 2 * progress), heightFactor: 1,
        // Unwrapped angle: no modulo reset, acceleration or discontinuity at revolution boundaries.
        turn: reduced ? 0 : elapsedSeconds / SCULPTURE_TIMING.revolutionSeconds * Math.PI * 2 };
    },
  };
}
