export const MIN_COLLECTOR_SCALE = .75;
export const MAX_COLLECTOR_SCALE = 1.5;

/** Surface-only two-finger scaling. Centroid and angle never affect the artwork anchor. */
export function installAnchoredPinch(surface: HTMLElement, onScale: (scale: number) => void, isEnabled: () => boolean) {
  const previousTouchAction = surface.style.touchAction;
  surface.style.touchAction = 'none';
  let scale = 1, pair: number[] | undefined, distance = 1, startingScale = 1;
  const touchesOnSurface = (event: TouchEvent) => Array.from(event.touches).filter(t => t.target instanceof Node && surface.contains(t.target));
  const separation = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const start = (event: TouchEvent) => {
    pair = undefined;
    const touches = touchesOnSurface(event);
    if (!isEnabled() || touches.length !== 2 || event.touches.length !== 2) return;
    event.preventDefault(); pair = touches.map(t => t.identifier); distance = Math.max(1, separation(touches[0], touches[1])); startingScale = scale;
  };
  const move = (event: TouchEvent) => {
    if (!isEnabled()) { pair = undefined; return; }
    const touches = touchesOnSurface(event);
    if (!pair || touches.length !== 2 || event.touches.length !== 2) { pair = undefined; return; }
    const a = touches.find(t => t.identifier === pair![0]), b = touches.find(t => t.identifier === pair![1]);
    if (!a || !b) { pair = undefined; return; }
    event.preventDefault();
    const next = Math.min(MAX_COLLECTOR_SCALE, Math.max(MIN_COLLECTOR_SCALE, startingScale * separation(a, b) / distance));
    if (Math.abs(next - scale) > .0001) { scale = next; onScale(scale); }
  };
  const end = () => { pair = undefined; };
  const safariGesture = (event: Event) => { if (isEnabled()) event.preventDefault(); };
  surface.addEventListener('touchstart', start, { passive: false }); surface.addEventListener('touchmove', move, { passive: false });
  surface.addEventListener('touchend', end); surface.addEventListener('touchcancel', end);
  surface.addEventListener('gesturestart', safariGesture, { passive: false }); surface.addEventListener('gesturechange', safariGesture, { passive: false });
  return { reset() { scale = 1; pair = undefined; }, dispose() { surface.style.touchAction = previousTouchAction; surface.removeEventListener('touchstart', start); surface.removeEventListener('touchmove', move); surface.removeEventListener('touchend', end); surface.removeEventListener('touchcancel', end); surface.removeEventListener('gesturestart', safariGesture); surface.removeEventListener('gesturechange', safariGesture); } };
}
