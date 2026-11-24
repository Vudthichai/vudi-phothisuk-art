import { DataTexture, RGBAFormat, UnsignedByteType, LinearFilter, Sprite, SpriteMaterial, Group } from 'three';

export const MIST_TEXTURE_SIZE = 128;
export const MIST_LAYER_COUNT = 4;

/** Four low-opacity depth-tested wisps. Generated once; no downloaded textures or volume marching. */
export function createCinematicMist() {
  const size = MIST_TEXTURE_SIZE, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1) * 2 - 1, v = y / (size - 1) * 2 - 1;
    const envelope = Math.exp(-3.6 * (u * u + v * v));
    const edge = Math.max(0, Math.min(1, (1 - Math.max(Math.abs(u), Math.abs(v))) / .35));
    const cloud = .7 + .16 * Math.sin(u * 5.3 + v * 8.1) + .1 * Math.sin(u * 11.9 - v * 4.1);
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(255 * envelope * edge * edge * cloud);
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  const root = new Group(); root.name = 'Cinematic rainforest mist';
  // Coordinates are fractions of tree height in the upright sculpture frame.
  const layers = [
    { p: [-.06, .065, .20], s: [.64, .13], opacity: .22 },
    { p: [.09, .18, .16], s: [.52, .12], opacity: .18 },
    { p: [-.1, .55, -.12], s: [.58, .10], opacity: .14 },
    { p: [.10, .73, .14], s: [.44, .09], opacity: .12 },
  ];
  const sprites = layers.map((layer, i) => {
    const material = new SpriteMaterial({ map: texture, color: 0xe1e8e2, opacity: layer.opacity, transparent: true, depthTest: true, depthWrite: false, toneMapped: false });
    const sprite = new Sprite(material); sprite.name = `Mist wisp ${i + 1}`; sprite.renderOrder = 1;
    root.add(sprite); return sprite;
  });
  let enabled = true, disposed = false;
  function update(time: number, reducedMotion: boolean) {
    root.visible = enabled; if (!enabled || disposed) return;
    const t = reducedMotion ? 0 : time;
    layers.forEach((layer, i) => {
      const phase = i * 1.7, sprite = sprites[i];
      sprite.position.set(layer.p[0] + .035 * Math.sin(t * .05 + phase), layer.p[1] + .008 * Math.sin(t * .06 + phase), layer.p[2] + .02 * Math.cos(t * .037 + phase));
      sprite.scale.set(layer.s[0] * (1 + .04 * Math.sin(t * .04 + phase)), layer.s[1], 1);
      sprite.material.opacity = layer.opacity * (.9 + .1 * Math.sin(t * .06 + phase));
    });
  }
  update(0, false);
  return { root, texture, update, setEnabled(value: boolean) { enabled = value; root.visible = value; }, dispose() { if (disposed) return; disposed = true; sprites.forEach(s => s.material.dispose()); texture.dispose(); root.clear(); } };
}
