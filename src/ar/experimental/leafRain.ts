import {
  DoubleSide, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh,
  MeshStandardMaterial, Object3D, MathUtils, PlaneGeometry, ShaderMaterial, Vector3,
} from 'three';

const GREEN_COUNT = 17;
const GOLD_INTERVAL = 13;
const GOLD_FALL = 5.8;

function fraction(seed: number) {
  const value = Math.sin(seed * 127.1 + 39.7) * 43758.5453;
  return value - Math.floor(value);
}

function addGoldReflection(material: MeshStandardMaterial, reflection: { value: number }, beam: boolean) {
  material.onBeforeCompile = shader => {
    shader.uniforms.goldLeafReflection = reflection;
    shader.fragmentShader = 'uniform float goldLeafReflection;\n' +
      shader.fragmentShader.replace('#include <opaque_fragment>', `
        float angle = abs(dot(normal, normalize(vViewPosition)));
        float facing = smoothstep(.15, .68, angle);
        vec3 goldReflection = reflectedLight.indirectSpecular + .65 * reflectedLight.directSpecular;
        outgoingLight += goldReflection * ${beam ? 'vec3(.57, .39, .19)' : 'vec3(.32, .24, .15)'} * goldLeafReflection * facing;
        ${beam ? 'outgoingLight += diffuseColor.rgb * vec3(.11, .067, .02) * goldLeafReflection * facing;' : ''}
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => beam ? 'leaf-gold-sunbeam' : 'leaf-gold-reflection';
  material.needsUpdate = true;
}

function createGoldSunbeam(field: Group) {
  const axis = new Vector3(-.28, .95, -.13).normalize();
  const strength = { value: 0 };
  const geometry = new PlaneGeometry(1, 1);
  const material = new ShaderMaterial({
    uniforms: { strength, sunAxis: { value: axis } },
    transparent: true, depthWrite: false, side: DoubleSide, forceSinglePass: true,
    vertexShader: `
      uniform vec3 sunAxis;
      varying vec2 beamUV;
      void main() {
        beamUV = uv;
        vec3 center = (modelViewMatrix * vec4(0., 0., 0., 1.)).xyz;
        vec3 along = mat3(modelViewMatrix) * sunAxis;
        float units = length(along);
        along /= units;
        vec3 across = cross(along, normalize(-center));
        across /= max(.001, length(across));
        vec3 projected = center + units * (across * position.x * .35 + along * position.y * .72);
        gl_Position = projectionMatrix * vec4(projected, 1.);
      }`,
    fragmentShader: `
      uniform float strength;
      varying vec2 beamUV;
      void main() {
        float height = beamUV.y;
        float width = mix(.46, .14, height);
        float distanceToRay = (beamUV.x * 2. - 1.) / width;
        float concentration = exp(-2.25 * distanceToRay * distanceToRay);
        float ends = smoothstep(0., .18, height) * (1. - smoothstep(.66, 1., height));
        float gradient = mix(.18, .085, height);
        gl_FragColor = vec4(1., .63, .24, strength * concentration * ends * gradient);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Warm beam following the golden leaf';
  mesh.frustumCulled = false;
  mesh.visible = false;
  field.add(mesh);
  return {
    update(center: Vector3, warmth: number) {
      strength.value = warmth;
      mesh.visible = warmth > 0;
      if (mesh.visible) {
        mesh.position.copy(center).addScaledVector(axis, .24);
        mesh.position.z -= .055;
      }
    },
    dispose() {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}

export function createLeafRain(field: Group, green: Group, gold: Group, refined = false, goldenLight = false) {
  const pose = new Object3D();
  const matrix = new Matrix4();
  const reflection = { value: 0 };
  field.updateWorldMatrix(true, true);
  const fieldInverse = field.matrixWorld.clone().invert();

  function batches(source: Group, count: number) {
    const meshes: { mesh: InstancedMesh; rest: Matrix4 }[] = [];
    source.traverse(object => {
      if (!(object instanceof Mesh)) return;
      if ((refined || goldenLight) && source === gold && object.material instanceof MeshStandardMaterial) {
        addGoldReflection(object.material, reflection, goldenLight);
      }
      const mesh = new InstancedMesh(object.geometry, object.material, count);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      field.add(mesh);
      meshes.push({ mesh, rest: new Matrix4().multiplyMatrices(fieldInverse, object.matrixWorld) });
    });
    source.removeFromParent();
    return meshes;
  }

  const greenBatches = batches(green, GREEN_COUNT);
  const goldBatches = batches(gold, 1);
  const sunbeam = goldenLight ? createGoldSunbeam(field) : undefined;
  function place(slot: number, cycle: number, progress: number, phase: number, breeze: number, golden = false) {
    const seed = slot * 103 + cycle * 53;
    const x = (fraction(seed + 1) - .5) * .84;
    const z = (fraction(seed + 2) - .5) * .48;
    const width = .12 + fraction(seed + 3) * .09 + (golden ? .035 : 0);
    const envelope = MathUtils.smoothstep(progress, 0, .08) * (1 - MathUtils.smoothstep(progress, .91, 1));
    pose.position.set(x + .075 * Math.sin(phase * 1.4 + seed), 1.24 - 1.58 * progress, z + .055 * Math.sin(phase * 1.05));
    pose.rotation.set(.46 * Math.sin(phase * 2.5 + seed), seed + phase * (.34 + fraction(seed + 4) * .64), .52 * Math.sin(phase * 1.8 + seed) + progress * 1.7);
    if (breeze > 0) {
      const flutter = phase * (2.15 + fraction(seed + 5) * 1.28) + seed;
      const sway = .64 * phase + seed;
      pose.position.x += breeze * (.032 * Math.sin(sway) + .014 * Math.sin(flutter));
      pose.position.y -= breeze * .031 * Math.sin(progress * Math.PI) * Math.sin(progress * Math.PI * 2 + seed);
      pose.position.z += breeze * (.21 * z + .036 * Math.cos(sway));
      pose.rotation.x += breeze * .23 * Math.sin(flutter);
      pose.rotation.y += breeze * .26 * Math.sin(sway);
      pose.rotation.z += breeze * .17 * Math.cos(flutter * 1.23);
    }
    pose.scale.setScalar(width * envelope);
    pose.updateMatrix();
    for (const { mesh, rest } of golden ? goldBatches : greenBatches) {
      mesh.setMatrixAt(golden ? 0 : slot, matrix.multiplyMatrices(pose.matrix, rest));
    }
  }

  return {
    update(seconds: number) {
      const breeze = refined ? MathUtils.smoothstep(seconds, 0, .85) : 0;
      for (let slot = 0; slot < GREEN_COUNT; slot++) {
        const duration = 4.3 + fraction(slot + 21) * 3.2;
        const age = seconds + duration * (slot + .5) / GREEN_COUNT;
        const cycle = Math.floor(age / duration);
        const phase = age - cycle * duration;
        place(slot, cycle, phase / duration, phase, breeze);
      }
      const goldAge = seconds % GOLD_INTERVAL;
      const goldCycle = Math.floor(seconds / GOLD_INTERVAL);
      const goldVisible = goldAge >= 2 && goldAge < 2 + GOLD_FALL;
      if (goldVisible) {
        const progress = (goldAge - 2) / GOLD_FALL;
        const warmth = MathUtils.smoothstep(progress, .08, .33) * (1 - MathUtils.smoothstep(progress, .55, .88));
        reflection.value = goldenLight ? warmth
          : breeze * MathUtils.smoothstep(progress, .27, .43) * (1 - MathUtils.smoothstep(progress, .47, .70));
        place(GREEN_COUNT, goldCycle, progress, goldAge - 2, breeze, true);
        sunbeam?.update(pose.position, warmth);
      } else {
        reflection.value = 0;
        sunbeam?.update(pose.position, 0);
      }
      for (const { mesh } of greenBatches) mesh.instanceMatrix.needsUpdate = true;
      for (const { mesh } of goldBatches) {
        mesh.visible = goldVisible;
        mesh.instanceMatrix.needsUpdate = goldVisible;
      }
    },
    dispose() {
      sunbeam?.dispose();
      for (const { mesh } of [...greenBatches, ...goldBatches]) mesh.dispose();
    },
  };
}
