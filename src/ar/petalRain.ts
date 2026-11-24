import { InstancedMesh, MeshStandardMaterial, Object3D, DoubleSide, DynamicDrawUsage } from 'three';
import { createGoldenPetal } from './petal';
export const PETAL_COUNT=64;
/** Fixed-seed, single-draw-call rain. No particles or textures downloaded. */
export function createPetalRain() {
  const shape=createGoldenPetal();const geometry=shape.mesh.geometry;shape.mesh.material.dispose();
  const material=new MeshStandardMaterial({color:0xe2b758,metalness:.8,roughness:.3,side:DoubleSide});
  const mesh=new InstancedMesh(geometry,material,PETAL_COUNT);mesh.name='Continuous golden petal rain';mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  // Animated bounds cover the whole rain volume; do not cull using stale per-instance bounds.
  mesh.frustumCulled=false;const dummy=new Object3D();
  const fract=(x:number)=>x-Math.floor(x),random=(i:number,salt:number)=>fract(Math.sin(i*127.1+salt*311.7)*43758.5453);
  const petals=Array.from({length:PETAL_COUNT},(_,i)=>({x:(random(i,1)-.5)*2.3,z:(random(i,2)-.5)*.9,phase:random(i,3),speed:.045+random(i,4)*.055,size:.065+random(i,5)*.08,angle:random(i,6)*Math.PI*2}));
  function update(time:number,reduced:boolean) {
    mesh.visible=!reduced;if(reduced)return;
    for(const [i,p] of petals.entries()) {
      const cycle=fract(p.phase+time*p.speed);
      dummy.position.set(p.x+Math.sin(time*.65+p.angle)*.055,1.8-cycle*2,p.z+Math.cos(time*.5+p.angle)*.04);
      dummy.rotation.set(time*(.4+p.speed)+p.angle,Math.sin(time*.9+p.angle)*.9,p.angle+time*.5);
      dummy.scale.setScalar(p.size);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  }
  return {mesh,update,dispose(){geometry.dispose();material.dispose();}};
}
