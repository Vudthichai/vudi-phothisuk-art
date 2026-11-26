import { describe, expect, it } from 'vitest';
import { Group, Matrix4, Quaternion, Vector3 } from 'three';
import { cameraUpFromTilt, GravityAlignment } from './ar/gravity';

const x = new Vector3(1, 0, 0);
const y = new Vector3(0, 1, 0);
const z = new Vector3(0, 0, 1);

describe('shared AR gravity alignment', () => {
  it.each([
    ['wall', 0],
    ['flat certificate', Math.PI / 2],
    ['tilted certificate', Math.PI / 5],
  ])('keeps the model upright on a %s and preserves its image-space pivot', (_, angle) => {
    const root = new Group();
    root.position.set(0, -.55, .035);
    root.scale.setScalar(.6);
    const pivot = root.position.clone();
    const imagePose = new Matrix4().compose(new Vector3(2, 3, -10),
      new Quaternion().setFromAxisAngle(x, -angle), new Vector3(4, 4, 4));
    new GravityAlignment().update(root, imagePose, y);

    expect(y.clone().applyQuaternion(root.quaternion).transformDirection(imagePose).distanceTo(y)).toBeLessThan(1e-8);
    expect(root.position.equals(pivot)).toBe(true);
    expect(root.scale.toArray()).toEqual([.6, .6, .6]);
  });

  it('uses image-normal orientation when the browser supplies no gravity', () => {
    const root = new Group();
    new GravityAlignment().update(root, new Matrix4());
    expect(y.clone().applyQuaternion(root.quaternion).distanceTo(z)).toBeLessThan(1e-8);
  });

  it('converts phone tilt and screen rotation into camera axes', () => {
    const out = new Vector3();
    expect(cameraUpFromTilt(out, 90, 0, 0).distanceTo(y)).toBeLessThan(1e-8);
    expect(cameraUpFromTilt(out, 0, 0, 0).distanceTo(z)).toBeLessThan(1e-8);
    expect(cameraUpFromTilt(out, 0, 90, 90).distanceTo(y.clone().negate())).toBeLessThan(1e-8);
    expect(cameraUpFromTilt(out, 0, 90, -90).distanceTo(y)).toBeLessThan(1e-8);
  });
});
