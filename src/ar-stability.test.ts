import { expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { StableImagePose } from './ar/experimental/stablePose';
import { ImagePoseFilter } from './ar/pose';
const pose=(x=0,yaw=0,width=680)=>new Matrix4().compose(new Vector3(x,0,-width*3),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),yaw),new Vector3(width,width,width));
it('suppresses image-relative stationary translation and canopy-amplified angular jitter',()=>{
 const stable=new StableImagePose(),old=new ImagePoseFilter();let stableEnergy=0,oldEnergy=0;stable.update(pose(),1/30);old.update(pose(),1/30);
 for(let i=0;i<180;i++) {const sign=i%2?1:-1;const a=stable.update(pose(sign*4,sign*.015),1/30),b=old.update(pose(sign*4,sign*.015),1/30);stableEnergy+=a.elements[12]**2;oldEnergy+=b.elements[12]**2;}
 expect(stableEnergy).toBeLessThan(oldEnergy*.15);
});
it('responds identically in different tracker pixel scales',()=>{
 const a=new StableImagePose(),b=new StableImagePose();a.update(pose(0,0,100),1/30);b.update(pose(0,0,1000),1/30);
 expect(a.update(pose(1,0,100),1/30).elements[12]/100).toBeCloseTo(b.update(pose(10,0,1000),1/30).elements[12]/1000,8);
});
it('follows sustained deliberate motion without locking to the camera or freezing the root',()=>{
 const f=new StableImagePose();f.update(pose(),1/30);let value=0;
 for(let i=1;i<=30;i++)value=f.update(pose(i*3,.002*i),1/30).elements[12];
 expect(value).toBeGreaterThan(65);expect(value).toBeLessThanOrEqual(90);
});
it('rejects a single gross jump, accepts a consistent new pose, and snaps only on reacquisition',()=>{
 const f=new StableImagePose();f.update(pose(),1/30);expect(f.update(pose(300,.6),1/30).elements[12]).toBe(0);
 expect(f.update(pose(0),1/30).elements[12]).toBe(0);expect(f.update(pose(300,.6),1/30).elements[12]).toBe(0);
 expect(f.update(pose(301,.601),1/30).elements[12]).toBeGreaterThan(0);
 f.reset();expect(f.update(pose(400,.7),1/30).elements[12]).toBe(400);
});
