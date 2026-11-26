import {
  BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group,
  InstancedMesh, MathUtils, Mesh, MeshStandardMaterial, Object3D, Vector2,
} from 'three';

const sunlight = `
  #include <aomap_fragment>
  if (ancientSunAmount > 0.0) {
    vec3 p = ancientSunPosition;
    vec2 upright = vec2(dot(p.xz, ancientSunHeading), dot(p.zx, vec2(ancientSunHeading.x, -ancientSunHeading.y)));
    // A broad pocket of light breaks into softer spots along the branches.
    float slope = upright.x + .28 * upright.y + .33 * p.y;
    float center = -.14 + .34 * sin(ancientSunTime * .25 + .37);
    float window = 1.0 - smoothstep(.13, .60, abs(slope - center));
    float canopy = smoothstep(-.52, .46, p.y);
    float dapples = sin(slope * 11.0 + p.y * 9.0 + ancientSunTime * .48)
      * sin(upright.y * 10.0 - p.y * 5.0 - ancientSunTime * .33);
    float dapple = window * canopy * (.40 + .60 * smoothstep(-.52, .72, dapples)) * ancientSunAmount;
    reflectedLight.directDiffuse *= 1.0 + dapple * vec3(.32, .23, .11);
    reflectedLight.directSpecular *= 1.0 + dapple * (.64 + .36 * dapples) * vec3(.53, .34, .13);
  }
`;

function petalGeometry() {
  const positions: number[] = [], indices: number[] = [];
  const rows = 6, columns = 4;
  for (let row = 0; row <= rows; row++) {
    const length = row / rows;
    const curve = Math.sin(Math.PI * length);
    for (let column = 0; column <= columns; column++) {
      const side = column / columns * 2 - 1;
      positions.push(
        side * (.018 + .35 * curve * (.68 + length * .45)) + .055 * curve,
        length - .5,
        .11 * side * side * curve + .19 * length ** 3,
      );
      if (row < rows && column < columns) {
        const corner = row * (columns + 1) + column;
        const next = corner + columns + 1;
        indices.push(corner, corner + 1, next, corner + 1, next + 1, next);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const passages = [
  { start: 2.0, duration: 7.9, x: .39, z: .25, y: .83, size: .063, phase: .4, color: new Color(0xe1bcae) },
  { start: 6.8, duration: 6.8, x: -.40, z: .34, y: .72, size: .052, phase: 2.3, color: new Color(0xe9d8bc) },
];

/** Reuses the tree's authored PBR maps and adds one small instanced petal batch to its upright frame. */
export function createAncientSunlight(model: Group, upright: Group) {
  const time = { value: 0 }, amount = { value: 0 }, heading = { value: new Vector2(1, 0) };
  const materials = new Set<MeshStandardMaterial>();
  model.traverse(object => {
    if (!(object instanceof Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof MeshStandardMaterial) || materials.has(material)) continue;
      materials.add(material);
      const compile = material.onBeforeCompile.bind(material);
      const cacheKey = material.customProgramCacheKey();
      material.onBeforeCompile = (shader, renderer) => {
        compile(shader, renderer);
        shader.uniforms.ancientSunTime = time;
        shader.uniforms.ancientSunAmount = amount;
        shader.uniforms.ancientSunHeading = heading;
        const varying = 'varying vec3 ancientSunPosition;\n';
        shader.vertexShader = varying + shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\nancientSunPosition = transformed;');
        shader.fragmentShader = varying + 'uniform float ancientSunTime, ancientSunAmount;\nuniform vec2 ancientSunHeading;\n' +
          shader.fragmentShader.replace('#include <aomap_fragment>', sunlight);
      };
      material.customProgramCacheKey = () => `${cacheKey}:ancient-sunlight`;
      material.needsUpdate = true;
    }
  });

  const root = new Group();
  root.name = 'Ancient Tree breeze';
  upright.add(root);
  const geometry = petalGeometry();
  const material = new MeshStandardMaterial({ side: DoubleSide, roughness: .89 });
  const petals = new InstancedMesh(geometry, material, passages.length);
  petals.name = 'Occasional Ancient Tree petals';
  petals.instanceMatrix.setUsage(DynamicDrawUsage);
  petals.frustumCulled = false;
  petals.visible = false;
  root.add(petals);
  const pose = new Object3D();

  return {
    root,
    update(elapsed: number, yaw: number, opacity: number, reduced: boolean, tracked: boolean) {
      petals.visible = false;
      if (!tracked) return;
      time.value = elapsed;
      amount.value = reduced ? 0 : opacity * MathUtils.smoothstep(elapsed, .15, 1.6);
      heading.value.set(Math.cos(yaw), Math.sin(yaw));
      if (reduced) return;

      let active = 0;
      for (const lane of passages) {
        const windTime = (elapsed % 21) - lane.start;
        const progress = windTime / lane.duration;
        if (progress <= 0 || progress >= 1) continue;
        const drift = lane.phase + windTime * .88;
        const flutter = lane.phase + windTime * 2.14;
        const envelope = MathUtils.smoothstep(progress, 0, .095) * (1 - MathUtils.smoothstep(progress, .87, 1));
        pose.position.set(
          lane.x + Math.sign(lane.x) * progress * .11 + .076 * Math.sin(drift),
          lane.y - .66 * progress + .031 * Math.sin(flutter * .61),
          lane.z + .097 * Math.sin(drift * .82) + .047 * progress,
        );
        pose.rotation.set(Math.sin(flutter) * .71, drift * .66, Math.cos(drift * 1.15) * .53);
        pose.scale.setScalar(lane.size * envelope * opacity);
        pose.updateMatrix();
        petals.setMatrixAt(active, pose.matrix);
        petals.setColorAt(active, lane.color);
        active++;
      }
      petals.count = active;
      if (active) {
        petals.visible = true;
        petals.instanceMatrix.needsUpdate = true;
        petals.instanceColor!.needsUpdate = true;
      }
    },
    dispose() {
      root.removeFromParent();
      petals.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
