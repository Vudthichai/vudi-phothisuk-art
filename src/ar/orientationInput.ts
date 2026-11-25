type OrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>;
};

export async function startGravityInput(signal: AbortSignal) {
  const source = window.DeviceOrientationEvent as OrientationWithPermission | undefined;
  if (!source) return;
  try {
    // Safari requires this call directly from the Start camera gesture.
    if (source.requestPermission && await source.requestPermission() !== 'granted') return;
  } catch {
    return;
  }
  if (signal.aborted) return;

  let tilt: { beta: number; gamma: number } | undefined;
  const read = ({ beta, gamma }: DeviceOrientationEvent) => {
    if (beta !== null && gamma !== null && Number.isFinite(beta) && Number.isFinite(gamma)) {
      tilt = { beta, gamma };
    } else {
      tilt = undefined;
    }
  };
  window.addEventListener('deviceorientation', read);
  signal.addEventListener('abort', () => window.removeEventListener('deviceorientation', read), { once: true });
  return () => tilt && { ...tilt, screenAngle: screen.orientation?.angle ?? window.orientation ?? 0 };
}

