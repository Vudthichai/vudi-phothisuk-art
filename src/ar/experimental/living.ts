import { Group, Material, Mesh, MeshStandardMaterial, InstancedMesh, LatheGeometry, Vector2, CylinderGeometry, Object3D, SphereGeometry } from 'three';
import { createGoldenPetal } from '../petal';

/** Fractions of the curated 2.6-target-width V2 tree, not certificate inches. */
export const LIVING_CONFIG = Object.freeze({ previousHeight: 2.6, start: .50, settled: .60, seconds: 2.6, rotate: true });
export function createLivingReveal(rotate: boolean = LIVING_CONFIG.rotate) {
  let elapsed = 0, previous: number | undefined, started = false;
  return {
    update(time: number, reduced: boolean, tracked: boolean) {
      if (tracked) {
        if (!started) started = true;
        else if (previous !== undefined) elapsed += Math.max(0, time - previous);
      }
      previous = tracked ? time : undefined;
      if (reduced && started) elapsed = LIVING_CONFIG.seconds;
      const progress = Math.min(1, elapsed / LIVING_CONFIG.seconds);
      const ease = 1 - (1 - progress) ** 3;
      return { started, progress, opacity: started ? Math.min(1, progress / .65) ** 2 * (3 - 2 * Math.min(1, progress / .65)) : 0,
        heightFactor: (LIVING_CONFIG.start + (LIVING_CONFIG.settled - LIVING_CONFIG.start) * ease) / LIVING_CONFIG.settled,
        turn: rotate && !reduced ? Math.PI * 2 * ease : 0 };
    },
  };
}

/** Preserve original PBR maps/material properties; restore opaque rendering after materialization. */
export function createMaterialFade(root: Group) {
  const originals = new Map<Material, { opacity: number; transparent: boolean; depthWrite: boolean }>();
  root.traverse(object => { if (object instanceof Mesh) for (const m of Array.isArray(object.material) ? object.material : [object.material]) if (!originals.has(m)) originals.set(m, { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite }); });
  let faded = false;
  return (amount: number) => {
    const alpha = Math.min(1, Math.max(0, amount)), nextFaded = alpha < 1;
    for (const [material, original] of originals) {
      material.opacity = original.opacity * alpha;
      material.transparent = nextFaded || original.transparent;
      material.depthWrite = nextFaded ? false : original.depthWrite;
      if (faded !== nextFaded) material.needsUpdate = true;
    }
    faded = nextFaded;
  };
}

/** Five tiny, irregular red caps and three warm flowers. Low-poly, instanced, no texture download. */
export function createRootBotanicals() {
  const root = new Group(); root.name = 'Miniature root botanicals';
  const red = new MeshStandardMaterial({ color: 0x9d2920, roughness: .76, metalness: .02 });
  const ivory = new MeshStandardMaterial({ color: 0xcdb99a, roughness: .93 });
  const warm = new MeshStandardMaterial({ color: 0xc98832, roughness: .51, metalness: .26 });
  const centre = new MeshStandardMaterial({ color: 0x7e4b23, roughness: .83 });
  const capGeometry = new LatheGeometry([new Vector2(0,.016),new Vector2(.006,.017),new Vector2(.014,.013),new Vector2(.020,.005),new Vector2(.022,0),new Vector2(.015,-.002),new Vector2(0,-.002)],12);
  const stemGeometry = new CylinderGeometry(.003,.005,.029,7);
  const caps = new InstancedMesh(capGeometry,red,5), stems = new InstancedMesh(stemGeometry,ivory,5);
  caps.name='Five red mushroom caps';stems.name='Five mushroom stems';root.add(caps,stems);
  const mushroomSites = [[-.19,.09],[-.14,.21],[.16,.16],[.24,-.04],[-.23,-.12]];
  const dummy = new Object3D();
  mushroomSites.forEach(([x,z],i) => {
    const size=.72+i*.095;dummy.scale.set(size,size*(.9+(i%2)*.12),size);dummy.rotation.set(.05*(i-2),i*.7,.07*(i%3-1));
    dummy.position.set(x,.0145*size,z);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
    dummy.position.y=.030*size;dummy.updateMatrix();caps.setMatrixAt(i,dummy.matrix);
  });
  // Reuse the existing curved sculptural petal geometry at miniature scale.
  const petal = createGoldenPetal(), petalGeometry = petal.mesh.geometry;petal.mesh.material.dispose();
  const petals = new InstancedMesh(petalGeometry,warm,15), centres = new InstancedMesh(new SphereGeometry(.006,8,5),centre,3);
  petals.name='Three warm five-petal flowers';centres.name='Three flower centres';root.add(petals,centres);
  [[-.12,-.20],[.17,-.19],[.07,.24]].forEach(([x,z],i) => {
    dummy.scale.setScalar(1);dummy.rotation.set(0,0,0);dummy.position.set(x,.020,z);dummy.updateMatrix();centres.setMatrixAt(i,dummy.matrix);
    for(let j=0;j<5;j++) {
      const angle=j*Math.PI*2/5+i*.7;dummy.position.set(x+Math.sin(angle)*.011,.017,z+Math.cos(angle)*.011);
      dummy.rotation.set(-Math.PI/2,0,-angle);dummy.scale.setScalar(.075);dummy.updateMatrix();petals.setMatrixAt(i*5+j,dummy.matrix);
    }
  });
  for(const mesh of [caps,stems,petals,centres]) { mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere(); }
  return { root, dispose() { for(const mesh of [caps,stems,petals,centres])mesh.geometry.dispose();for(const m of [red,ivory,warm,centre])m.dispose();root.clear(); } };
}
