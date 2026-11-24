import { Group, Object3D, Raycaster, Vector3, Matrix3, Matrix4, BufferGeometry, Float32BufferAttribute, InstancedMesh, MeshStandardMaterial, SphereGeometry, CylinderGeometry, DoubleSide, Color } from 'three';

export const FLOWER_COUNT=10;
/** Same curved-petal profile as the existing gold sculpture, sampled sparsely for tiny blossoms. */
function petalGeometry() {
  const positions:number[]=[],indices:number[]=[],colors:number[]=[];const rows=12,cols=6;
  for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){const u=r/rows,v=c/cols*2-1;positions.push(v*Math.pow(Math.sin(Math.PI*u),.72)*.42,u,.16*Math.sin(Math.PI*u)+.15*u*u+.06*v*v);const shade=.66+.34*Math.sin(Math.PI*u*.7);colors.push(shade,shade,shade);}
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
/** Place every blossom on a ray-tested surface of the actual optimized mesh, not a floating guess. */
export function createAttachedFlowers(model:Object3D,frame:Group) {
  const root=new Group();root.name='Ten attached rainforest flowers';frame.add(root);frame.updateWorldMatrix(true,true);model.updateWorldMatrix(true,true);
  const petalMaterial=new MeshStandardMaterial({color:0xffffff,roughness:.63,metalness:.15,side:DoubleSide,vertexColors:true});
  const seedMaterial=new MeshStandardMaterial({color:0xb08b45,roughness:.75}),stemMaterial=new MeshStandardMaterial({color:0x58643d,roughness:.92});
  const petals=new InstancedMesh(petalGeometry(),petalMaterial,FLOWER_COUNT*5),seeds=new InstancedMesh(new SphereGeometry(.0038,8,5),seedMaterial,FLOWER_COUNT),stems=new InstancedMesh(new CylinderGeometry(.0015,.002,.012,5),stemMaterial,FLOWER_COUNT);
  root.add(petals,seeds,stems);petals.name='Warm ivory gold and orange petals';
  const sites=[[-.20,.05,.23],[.21,.05,.18],[-.18,.05,-.22],[-.08,.22,.8],[.08,.31,-.8],[-.06,.38,.8],[-.20,.48,.8],[.22,.55,-.8],[-.25,.64,.8],[.17,.72,.8]];
  const ray=new Raycaster(),dummy=new Object3D(),normalMatrix=new Matrix3(),inverse=new Matrix4().copy(frame.matrixWorld).invert(),anchors:{position:Vector3;normal:Vector3}[]=[];
  const palette=[0xd8b26d,0xf2e8d1,0xe7cf8a,0xca8d50];
  for(let i=0;i<sites.length;i++) {
    const [x,y,z]=sites[i];
    const from=frame.localToWorld(new Vector3(x,i<3?.32:y,z));
    const to=frame.localToWorld(i<3?new Vector3(x,-.01,z):new Vector3(0,y,0));
    ray.set(from,to.clone().sub(from).normalize());let hit=ray.intersectObject(model,true)[0];
    if(!hit){ray.set(frame.localToWorld(new Vector3(.8,y,0)),frame.localToWorld(new Vector3(0,y,0)).sub(frame.localToWorld(new Vector3(.8,y,0))).normalize());hit=ray.intersectObject(model,true)[0];}
    if(!hit)continue; // Never float an ungrounded blossom if a future model differs.
    const normal=hit.face!.normal.clone().applyNormalMatrix(normalMatrix.getNormalMatrix(hit.object.matrixWorld)).transformDirection(inverse);
    const point=frame.worldToLocal(hit.point.clone()).addScaledVector(normal,.0015);anchors.push({position:point,normal});
    const orient=new Object3D();orient.position.copy(point);orient.quaternion.setFromUnitVectors(new Vector3(0,0,1),normal);orient.updateMatrix();
    const size=.016+(i%3)*.0025;
    for(let j=0;j<5;j++){const a=j*Math.PI*2/5+i*.31;dummy.position.set(Math.sin(a)*.002,Math.cos(a)*.002,.012);dummy.rotation.set(0,0,-a);dummy.scale.set(size,size,size);dummy.updateMatrix();const matrix=orient.matrix.clone().multiply(dummy.matrix);petals.setMatrixAt((anchors.length-1)*5+j,matrix);petals.setColorAt((anchors.length-1)*5+j,new Color(palette[i%palette.length]));}
    dummy.position.set(0,0,.014);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();seeds.setMatrixAt(anchors.length-1,orient.matrix.clone().multiply(dummy.matrix));
    dummy.position.set(0,0,.006);dummy.rotation.x=Math.PI/2;dummy.updateMatrix();stems.setMatrixAt(anchors.length-1,orient.matrix.clone().multiply(dummy.matrix));
  }
  petals.count=anchors.length*5;seeds.count=stems.count=anchors.length;
  for(const m of [petals,seeds,stems]){m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();}if(petals.instanceColor)petals.instanceColor.needsUpdate=true;
  let disposed=false;
  return {root,count:anchors.length,anchors,dispose(){if(disposed)return;disposed=true;for(const m of [petals,seeds,stems]){m.geometry.dispose();(m.material as MeshStandardMaterial).dispose();}root.removeFromParent();root.clear();}};
}
