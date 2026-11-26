import {
  BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, MathUtils,
  Matrix4, Mesh, ShaderMaterial, Vector3,
} from 'three';

export const lilyBeamLighting = `
  if (lilyBeamAmount > 0.) {
    vec3 axis = lilyBeamTip - lilyBeamSource;
    vec3 offset = lilyBeamSurface - lilyBeamSource;
    float along = clamp(dot(offset, axis) / max(.001, dot(axis, axis)), 0., 1.);
    vec3 across = offset - along * axis;
    float pool = exp2(-20. * dot(across, across));
    float petals = smoothstep(lilyPetalBase, lilyPetalBase + .16, lilySurface.y);
    float light = lilyBeamAmount * pool * petals * smoothstep(.38, .84, along);
    reflectedLight.directDiffuse *= 1. + light * (.18 + .25 * lilyBeamTint);
    reflectedLight.directSpecular *= 1. + light * (.20 + .37 * lilyBeamTint);
  }
`;

/** A depth-tested soft shaft with a corresponding pool of light on the existing petal shader. */
export function createLilyBeam(upright: Group, piece: Group, throat: Vector3, blush: boolean) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3));
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  const uniforms = {
    lilyBeamSource: { value: new Vector3() }, lilyBeamTip: { value: new Vector3() },
    lilyBeamAmount: { value: 0 }, lilyBeamTint: { value: new Color(blush ? 0xe4b1f6 : 0xffd598) },
  };
  const material = new ShaderMaterial({
    uniforms, transparent: true, side: DoubleSide, forceSinglePass: true, depthWrite: false,
    vertexShader: `
      uniform vec3 lilyBeamSource, lilyBeamTip;
      varying vec2 beam;
      void main() {
        beam = position.xy;
        vec4 head = modelViewMatrix * vec4(lilyBeamSource, 1.);
        vec4 tail = modelViewMatrix * vec4(lilyBeamTip, 1.);
        vec2 axis = tail.xy - head.xy;
        vec2 across = vec2(-axis.y, axis.x) / max(.0001, length(axis));
        vec4 view = mix(head, tail, beam.x);
        view.xy += across * beam.y * mix(.105, .19, beam.x) * length(modelViewMatrix[1].xyz);
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      uniform float lilyBeamAmount;
      uniform vec3 lilyBeamTint;
      varying vec2 beam;
      void main() {
        float edge = 1. - smoothstep(.03, 1., abs(beam.y));
        float lengthFade = smoothstep(0., .26, beam.x) * (1. - smoothstep(.79, 1., beam.x));
        float fine = exp2(-8. * (beam.y + .18) * (beam.y + .18));
        float density = (.13 * edge * edge + .032 * fine * edge) * lengthFade;
        gl_FragColor = vec4(lilyBeamTint, density * lilyBeamAmount);
        #include <colorspace_fragment>
      }`,
  });
  const shaft = new Mesh(geometry, material);
  shaft.name = 'Soft directional lily light';
  shaft.visible = false;
  shaft.frustumCulled = false;
  upright.add(shaft);

  const meshFrames = new Map<Mesh, { value: Matrix4 }>();
  const inverseRoot = new Matrix4();
  const sourceOffset = new Vector3(blush ? .57 : -.66, .62, .13);
  const aim = new Vector3();
  return {
    uniforms,
    trackMesh(mesh: Mesh) {
      const frame = { value: new Matrix4() };
      meshFrames.set(mesh, frame);
      return frame;
    },
    update(elapsed: number, reduced: boolean) {
      const open = MathUtils.smoothstep(elapsed, .55, 1.45);
      const settle = 1 - MathUtils.smoothstep(elapsed, 3.95, 6.35);
      const amount = reduced ? 0 : open * settle;
      uniforms.lilyBeamAmount.value = amount;
      shaft.visible = amount > 0;
      if (!shaft.visible) return;

      upright.updateWorldMatrix(true, true);
      inverseRoot.copy(upright.matrixWorld).invert();
      uniforms.lilyBeamTip.value.copy(aim.copy(throat).applyMatrix4(piece.matrixWorld).applyMatrix4(inverseRoot));
      uniforms.lilyBeamSource.value.copy(uniforms.lilyBeamTip.value).add(sourceOffset);
      uniforms.lilyBeamSource.value.x += .034 * Math.sin(elapsed * .65);
      for (const [mesh, frame] of meshFrames) frame.value.multiplyMatrices(inverseRoot, mesh.matrixWorld);
    },
    dispose() {
      shaft.removeFromParent();
      geometry.dispose();
      material.dispose();
      meshFrames.clear();
    },
  };
}
