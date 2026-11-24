import { Matrix4, Quaternion, Vector3 } from 'three';

/** Image-relative stabilization, not a world anchor. Reset as soon as tracking is lost. */
export class StableImagePose {
  private position = new Vector3();
  private rotation = new Quaternion();
  private scale = new Vector3();
  private nextPosition = new Vector3();
  private nextRotation = new Quaternion();
  private nextScale = new Vector3();
  private candidate?: Matrix4;
  private initialized = false;
  constructor(private readonly handheld = false) {}

  reset() { this.initialized = false; this.candidate = undefined; }

  update(matrix: Matrix4, dt: number) {
    matrix.decompose(this.nextPosition, this.nextRotation, this.nextScale);
    if (!this.initialized) {
      this.position.copy(this.nextPosition); this.rotation.copy(this.nextRotation); this.scale.copy(this.nextScale);
      this.initialized = true;
    } else {
      // MindAR matrices use target pixels, not meters. Normalize translation by image width.
      const width = Math.max(.000001, Math.abs(this.scale.x));
      const distance = this.position.distanceTo(this.nextPosition) / width;
      const angle = this.rotation.angleTo(this.nextRotation);
      if (distance > .18 || angle > .35) {
        // A lone gross pose jump must not throw the canopy across the screen.
        const confirmed = this.candidate && this.candidate.elements.every((v, i) => Number.isFinite(v) && Number.isFinite(matrix.elements[i]));
        if (confirmed) {
          const p = new Vector3(), q = new Quaternion(), s = new Vector3();
          this.candidate!.decompose(p, q, s);
          if (p.distanceTo(this.nextPosition) / width > .04 || q.angleTo(this.nextRotation) > .10) {
            this.candidate!.copy(matrix);
            return matrix.compose(this.position, this.rotation, this.scale);
          }
        } else {
          this.candidate = matrix.clone();
          return matrix.compose(this.position, this.rotation, this.scale);
        }
      }
      this.candidate = undefined;
      const seconds = Math.min(.1, Math.max(.001, dt));
      const moving = distance > (this.handheld ? .012 : .025) || angle > (this.handheld ? .020 : .035);
      this.position.lerp(this.nextPosition, 1 - Math.exp(-seconds * (moving ? 22 : this.handheld ? 6 : 4)));
      this.rotation.slerp(this.nextRotation, 1 - Math.exp(-seconds * (moving ? 20 : this.handheld ? 5 : 3.5)));
      this.scale.lerp(this.nextScale, 1 - Math.exp(-seconds * (moving ? 16 : 4)));
    }
    return matrix.compose(this.position, this.rotation, this.scale);
  }
}
