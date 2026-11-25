import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Group } from 'three';

const radians = Math.PI / 180;
const cameraZ = new Vector3(0, 0, 1);
const imageNormal = new Vector3(0, 0, 1);
const imageAligned = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

export function cameraUpFromTilt(out: Vector3, beta: number, gamma: number, screenAngle: number) {
  // Invert the device's Z-X'-Y'' rotation on earth +Z. Compass heading drops out.
  const pitch = beta * radians;
  const roll = gamma * radians;
  return out.set(-Math.sin(roll) * Math.cos(pitch), Math.sin(pitch), Math.cos(roll) * Math.cos(pitch))
    .applyAxisAngle(cameraZ, screenAngle * radians);
}

export class GravityAlignment {
  private rotation = new Matrix4();
  private localUp = new Vector3();

  update(root: Group, imagePose: Matrix4, cameraUp?: Vector3) {
    if (!cameraUp) {
      root.quaternion.copy(imageAligned);
      return;
    }
    // MindAR supplies an image-to-camera transform. Its XY plane is the
    // target and its +Z points out of the print. Correct at the model pivot
    // so image-space position, scale and child animation stay intact.
    this.rotation.extractRotation(imagePose).transpose();
    this.localUp.copy(cameraUp).applyMatrix4(this.rotation).normalize();
    root.quaternion.setFromUnitVectors(imageNormal, this.localUp).multiply(imageAligned);
  }
}
