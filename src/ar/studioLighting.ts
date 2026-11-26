import { DirectionalLight, HemisphereLight, type Scene } from 'three';

type Beam = { color: number; intensity: number; direction: [number, number, number] };
type StudioProfile = {
  hemisphere: { sky: number; ground: number; intensity: number };
  key: Beam;
  fill?: Beam;
  rim?: Beam;
  reflections: number;
};

const frontKey: Beam['direction'] = [-2.8, 3.3, 3.8];
const softFill: Beam['direction'] = [3.2, .75, 2.1];
const petalRim: Beam['direction'] = [1.2, 2.5, -2.8];
const profiles: Readonly<Partial<Record<string, StudioProfile>>> = {
  'tiger-lily': {
    hemisphere: { sky: 0xfffaee, ground: 0x4d4436, intensity: 1.06 },
    key: { color: 0xffedda, intensity: 2.17, direction: frontKey },
    fill: { color: 0xe8f3ff, intensity: .36, direction: softFill },
    rim: { color: 0xffe4bf, intensity: .34, direction: petalRim },
    reflections: .76,
  },
  'dragon-lily': {
    hemisphere: { sky: 0xfaf8fc, ground: 0x51474c, intensity: 1.04 },
    key: { color: 0xfff7f3, intensity: 1.94, direction: frontKey },
    fill: { color: 0xf3f3ff, intensity: .33, direction: softFill },
    rim: { color: 0xffe2ed, intensity: .44, direction: petalRim },
    reflections: .72,
  },
  'wild-tiger-lilies': {
    hemisphere: { sky: 0xf8f7f1, ground: 0x444339, intensity: 1.12 },
    key: { color: 0xfff3e1, intensity: 2.06, direction: frontKey },
    fill: { color: 0xf4f3ff, intensity: .52, direction: softFill },
    rim: { color: 0xe9f3ff, intensity: .46, direction: petalRim },
    reflections: .78,
  },
  'ethereal-bloom': {
    hemisphere: { sky: 0xf3f5ff, ground: 0x55505a, intensity: .82 },
    key: { color: 0xfff8ed, intensity: 1.52, direction: frontKey },
    fill: { color: 0xf4edff, intensity: .32, direction: softFill },
    rim: { color: 0xdbe8ff, intensity: .43, direction: petalRim },
    reflections: .64,
  },
  'blooming-desire': {
    hemisphere: { sky: 0xf8f1ea, ground: 0x454449, intensity: .70 },
    key: { color: 0xfff4e9, intensity: 1.78, direction: [-3.8, 2.8, 3.2] },
    fill: { color: 0xebf0fa, intensity: .25, direction: softFill },
    rim: { color: 0xfff2ee, intensity: .49, direction: petalRim },
    reflections: .62,
  },
  'moss-and-mushrooms': {
    hemisphere: { sky: 0xf1f6ed, ground: 0x4e5543, intensity: 1.34 },
    key: { color: 0xffefd9, intensity: 2.16, direction: [-4.4, 2.7, 2.8] },
    fill: { color: 0xe6eedf, intensity: .55, direction: [3.5, 1.2, 1.3] },
    rim: { color: 0xe5eed7, intensity: .46, direction: petalRim },
    reflections: .76,
  },
  'a-forest-forgotten': {
    hemisphere: { sky: 0xf0f5ea, ground: 0x3f4939, intensity: 1.03 },
    key: { color: 0xffefda, intensity: 1.98, direction: [-3.9, 3.5, 3.1] },
    fill: { color: 0xd9e6da, intensity: .33, direction: softFill },
    rim: { color: 0xe5f0db, intensity: .31, direction: petalRim },
    reflections: .69,
  },
};

const gildedV2: StudioProfile = {
  hemisphere: { sky: 0xfff6e4, ground: 0x4e3c2c, intensity: .82 },
  key: { color: 0xffefdc, intensity: 2.05, direction: [-3.6, 3.1, 3.3] },
  fill: { color: 0xfff7e5, intensity: .34, direction: [3.0, 1.4, 2.7] },
  rim: { color: 0xffe1b0, intensity: .55, direction: petalRim },
  reflections: 1.13,
};

function addBeam(scene: Scene, name: string, beam: Beam) {
  const light = new DirectionalLight(beam.color, beam.intensity);
  light.name = name;
  light.position.set(...beam.direction);
  scene.add(light);
}

/** Uses the existing room reflection texture and static, camera-space lights with no shadow passes. */
export function applyStudioLighting(scene: Scene, artworkId: string, useSculptureLights = true, variant?: 'v2') {
  const profile = useSculptureLights
    ? artworkId === 'gilded-bloom' && variant === 'v2' ? gildedV2 : profiles[artworkId]
    : undefined;
  if (!profile) {
    // Mother Nature V5, 75 Leaves and approved Gilded Bloom use this unchanged legacy setup.
    scene.add(new HemisphereLight(useSculptureLights ? 0xf4f8f4 : 0xfff8e8, useSculptureLights ? 0x26352c : 0x3d301d, 2));
    const light = new DirectionalLight(useSculptureLights ? 0xfff5e4 : 0xffe2aa, 3);
    light.position.set(-1, 2, 3);
    scene.add(light);
    return;
  }

  const { sky, ground, intensity } = profile.hemisphere;
  const ambient = new HemisphereLight(sky, ground, intensity);
  ambient.name = 'Studio hemisphere';
  scene.add(ambient);
  scene.environmentIntensity = profile.reflections;
  addBeam(scene, 'Studio key', profile.key);
  if (profile.fill) addBeam(scene, 'Studio fill', profile.fill);
  if (profile.rim) addBeam(scene, 'Studio rim', profile.rim);
}
