import { Matrix4, Vector3, Quaternion } from 'three';
/** Small, time-based pose filter. Never holds a world anchor when the image disappears. */
export class ImagePoseFilter {
  private position=new Vector3();private rotation=new Quaternion();private scale=new Vector3();
  private nextPosition=new Vector3();private nextRotation=new Quaternion();private nextScale=new Vector3();
  private initialized=false;
  reset(){this.initialized=false;}
  update(matrix:Matrix4,dt:number) {
    matrix.decompose(this.nextPosition,this.nextRotation,this.nextScale);
    // Snap on first acquisition; faster response to deliberate camera movement.
    const distance=this.position.distanceTo(this.nextPosition);
    const alpha=this.initialized?1-Math.exp(-Math.min(.1,Math.max(.001,dt))*(distance>.08?24:13)):1;
    this.position.lerp(this.nextPosition,alpha);this.rotation.slerp(this.nextRotation,alpha);this.scale.lerp(this.nextScale,alpha);this.initialized=true;
    return matrix.compose(this.position,this.rotation,this.scale);
  }
}
