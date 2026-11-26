import {
  BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group,
  InstancedMesh, MathUtils, MeshBasicMaterial, Object3D,
} from 'three';

const blushPetals = [0xefadb9, 0xf7c7d2, 0xffe6eb, 0xf2b8c6, 0xf8dce0,
  0xf6eeda, 0xefadb9, 0xf7c7d2, 0xffe6eb, 0xf6eeda];
const forestLeaves = [0x396b48, 0x638052, 0x52724d, 0x7a8851, 0x476c48];
const mutedGold = 0xc19b55;
const lanes = blushPetals.length + forestLeaves.length;

function createSurface(leaf: boolean) {
  const across = 4;
  const along = 8;
  const positions: number[] = [];
  const colors: number[] = [];
  const triangles: number[] = [];
  const crease = new Color(0xfffbec);
  const edge = new Color(leaf ? 0xb9bf9f : 0xe9c7ce);
  const shade = new Color();
  for (let y = 0; y <= along; y++) {
    const length = y / along;
    const curve = Math.sin(Math.PI * length);
    const width = .012 + (leaf ? .24 * curve : .34 * curve ** .64 * (.58 + .52 * length));
    for (let x = 0; x <= across; x++) {
      const acrossPetal = (2 * x) / across - 1;
      const lateral = Math.abs(acrossPetal);
      positions.push(
        acrossPetal * width + .06 * curve,
        length - .5 - (leaf ? 0 : .06 * lateral * length),
        .23 * length ** 3 + .15 * lateral ** 2 * curve,
      );
      shade.copy(crease).lerp(edge, lateral * (leaf ? .85 : .55));
      colors.push(shade.r, shade.g, shade.b);
      if (y < along && x < across) {
        const corner = y * (across + 1) + x;
        const nextRow = corner + across + 1;
        triangles.push(corner, corner + 1, nextRow, corner + 1, nextRow + 1, nextRow);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(triangles);
  return geometry;
}

function grain(index: number, channel: number) {
  const value = Math.sin(index * 51.73 + channel * 7.29) * 6189.97;
  return value - Math.floor(value);
}

function atmosphereBatch(root: Group, colors: number[], leaf: boolean) {
  const geometry = createSurface(leaf);
  const material = new MeshBasicMaterial({
    vertexColors: true, side: DoubleSide, transparent: true, opacity: leaf ? .79 : .76,
    depthWrite: false, forceSinglePass: true,
  });
  const mesh = new InstancedMesh(geometry, material, colors.length);
  mesh.name = leaf ? 'MSAT falling leaves' : 'MSAT falling petals';
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  const color = new Color();
  colors.forEach((value, index) => mesh.setColorAt(index, color.setHex(value)));
  root.add(mesh);
  return { mesh, geometry, material };
}

/** Mount on the gravity-aligned root outside the emblem and tagline silhouette. */
export function createMsatAtmosphere(upright: Group) {
  const petals = atmosphereBatch(upright, blushPetals, false);
  const leaves = atmosphereBatch(upright, forestLeaves, true);
  if (leaves.mesh.instanceColor) leaves.mesh.instanceColor.setUsage(DynamicDrawUsage);
  const pose = new Object3D();
  const goldColor = new Color(mutedGold);
  const greenColor = new Color(forestLeaves.at(-1)!);
  const particles = Array.from({ length: lanes }, (_, index) => {
    const leaf = index >= blushPetals.length;
    return {
      mesh: leaf ? leaves.mesh : petals.mesh,
      slot: leaf ? index - blushPetals.length : index,
      lifetime: 8.5 + grain(index, 1) * 4.8,
      entry: (index + .43) / lanes,
      side: index % 2 === 0 ? -1 : 1,
      edge: .47 + grain(index, 2) * .12,
      phase: grain(index, 3) * Math.PI * 2,
      depth: -.27 + grain(index, 4) * .47,
      size: (leaf ? .095 : .065) + grain(index, 5) * .042,
    };
  });

  let goldVisible = false;
  let disposed = false;
  function update(elapsed: number, reduced: boolean) {
    if (disposed) return;
    petals.mesh.visible = leaves.mesh.visible = !reduced;
    if (reduced) return;
    const fadeIn = MathUtils.smoothstep(elapsed, .3, 1.7);

    for (const particle of particles) {
      const age = elapsed + particle.lifetime * particle.entry;
      const progress = age % particle.lifetime / particle.lifetime;
      const phase = particle.phase + age * .91;
      const flutter = particle.phase + age * 2.01;
      const envelope = MathUtils.smoothstep(progress, 0, .09) *
        (1 - MathUtils.smoothstep(progress, .9, 1));
      const height = 1.31 - 1.87 * progress;
      const beyondSilhouette = Math.max(
        MathUtils.smoothstep(height, 1.08, 1.31),
        1 - MathUtils.smoothstep(height, -.54, -.38),
      );
      const edge = particle.edge + .06 * (.5 + .5 * Math.sin(phase));
      pose.position.set(
        particle.side * MathUtils.lerp(edge, .30, beyondSilhouette * .75),
        height,
        particle.depth + .055 * Math.sin(phase * .73),
      );
      pose.rotation.set(
        .57 * Math.sin(flutter),
        phase * .68 + .41 * Math.cos(flutter),
        .68 * Math.sin(phase * 1.21),
      );
      pose.scale.setScalar(particle.size * envelope * fadeIn);
      pose.updateMatrix();
      particle.mesh.setMatrixAt(particle.slot, pose.matrix);
    }

    const highlight = particles[lanes - 1];
    const cycle = Math.floor(elapsed / highlight.lifetime + highlight.entry);
    const showGold = cycle % 4 === 1;
    if (showGold !== goldVisible) {
      goldVisible = showGold;
      leaves.mesh.setColorAt(highlight.slot, showGold ? goldColor : greenColor);
      leaves.mesh.instanceColor!.needsUpdate = true;
    }
    petals.mesh.instanceMatrix.needsUpdate = true;
    leaves.mesh.instanceMatrix.needsUpdate = true;
  }

  update(0, false);
  return {
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { mesh, geometry, material } of [petals, leaves]) {
        mesh.removeFromParent();
        mesh.dispose();
        geometry.dispose();
        material.dispose();
      }
    },
  };
}
