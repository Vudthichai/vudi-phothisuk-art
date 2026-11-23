import { Group, Mesh, MeshStandardMaterial, TubeGeometry, CatmullRomCurve3, Vector3, InstancedMesh, Object3D, SphereGeometry, LatheGeometry, Vector2, DoubleSide } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createGoldenPetal } from './petal';

/** An original small bronze/gold botanical sculpture, in target-width units. No artwork pixels. */
export function createBotanicalSculpture() {
  const root=new Group();root.name='Golden botanical sculpture';root.position.set(0,-.39,.26);
  const turning=new Group();root.add(turning);
  const gold=new MeshStandardMaterial({color:0xd3a64e,metalness:.82,roughness:.3,side:DoubleSide});
  const darkGold=new MeshStandardMaterial({color:0x9e6b27,metalness:.75,roughness:.38,side:DoubleSide});
  const tubes:TubeGeometry[]=[];
  function branch(points:number[][],radius:number) {
    const curve=new CatmullRomCurve3(points.map(p=>new Vector3(...p))),geometry=new TubeGeometry(curve,12,radius,6,false);
    const positions=geometry.attributes.position,center=new Vector3(),vertex=new Vector3();
    for(let ring=0;ring<=12;ring++) {
      curve.getPointAt(ring/12,center);const taper=1-.92*(ring/12);
      for(let side=0;side<=6;side++){const index=ring*7+side;vertex.fromBufferAttribute(positions,index).sub(center).multiplyScalar(taper).add(center);positions.setXYZ(index,vertex.x,vertex.y,vertex.z);}
    }
    geometry.computeVertexNormals();tubes.push(geometry);
  }
  // Twisting central stem, tapering branch tips and exposed root gestures.
  branch([[0,0,0],[-.025,.17,.018],[.025,.37,-.025],[-.005,.59,.015],[.055,.83,0]],.016);
  const tips:Vector3[]=[];
  for(let i=0;i<13;i++) {
    const side=i%2?1:-1,y=.20+i*.037,angle=i*2.399;
    const tip=new Vector3(side*(.16+.11*Math.sin(i*1.4)**2),y+.13+.08*Math.sin(i),Math.sin(angle)*.14);
    branch([[0,y,0],[tip.x*.45,y+.07,tip.z*.5],[tip.x*.78,tip.y-.015,tip.z],tip.toArray()],.0085-i*.00025);
    tips.push(tip);
    branch([[tip.x*.65,y+.085,tip.z*.7],[tip.x*.83,tip.y+.06,tip.z+.055],[tip.x*.83,tip.y+.10,tip.z+.06]],.0035);
  }
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;branch([[0,.07,0],[Math.cos(a)*.055,.01,Math.sin(a)*.055],[Math.cos(a)*.11,0,Math.sin(a)*.10]],.008);}
  const wood=mergeGeometries(tubes);tubes.forEach(g=>g.dispose());turning.add(new Mesh(wood,gold));
  const petal=createGoldenPetal();const leafGeometry=petal.mesh.geometry;petal.mesh.material.dispose();
  const leaves=new InstancedMesh(leafGeometry,gold,55);leaves.name='Sculpted gold leaves';turning.add(leaves);
  const dummy=new Object3D();
  for(let i=0;i<55;i++) {
    const tip=tips[i%tips.length],a=i*2.399;
    dummy.position.copy(tip).add(new Vector3(Math.cos(a)*.035,Math.sin(a)*.045,Math.sin(a*1.7)*.035));
    dummy.rotation.set(Math.sin(a)*.6,a,Math.cos(a)*1.2);dummy.scale.setScalar(.32+(i%4)*.035);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
  }
  leaves.instanceMatrix.needsUpdate=true;
  // A low, open five-petal flower with a restrained seed centre.
  const flower=new Group();flower.name='Sculpted flower';flower.position.set(-.105,.035,.075);flower.rotation.x=-.35;turning.add(flower);
  for(let i=0;i<5;i++){const p=new Mesh(leafGeometry,gold),a=i*Math.PI*2/5;p.scale.set(.3,.28,.3);p.position.set(Math.sin(a)*.026,Math.cos(a)*.026,0);p.rotation.z=-a;flower.add(p);}
  const seedGeometry=new SphereGeometry(.015,10,6);flower.add(new Mesh(seedGeometry,darkGold));
  const stemGeometry=new TubeGeometry(new CatmullRomCurve3([new Vector3(.105,0,.07),new Vector3(.11,.035,.07),new Vector3(.10,.067,.07)]),8,.008,6,false);
  const mushroom=new Group();mushroom.name='Sculpted mushroom';mushroom.add(new Mesh(stemGeometry,gold));
  const capGeometry=new LatheGeometry([new Vector2(0,.02),new Vector2(.014,.019),new Vector2(.028,.008),new Vector2(.036,0),new Vector2(.023,-.004),new Vector2(0,-.004)],18);
  const cap=new Mesh(capGeometry,gold);cap.position.set(.10,.067,.07);mushroom.add(cap);turning.add(mushroom);
  const falling=new InstancedMesh(leafGeometry,gold,7);falling.name='Falling gold petals';root.add(falling);
  let revealStart:number|undefined;
  function update(time:number,reduced:boolean,tracked:boolean) {
    if(tracked&&revealStart===undefined)revealStart=time;
    const progress=reduced?1:Math.min(1,Math.max(0,(time-(revealStart??time))/1.8));
    const ease=1-(1-progress)**3;
    turning.scale.setScalar(.88+.12*ease);turning.position.y=-.1*(1-ease);
    root.scale.setScalar(reduced?1:Math.max(.001,ease));
    turning.rotation.y=reduced?.3:.3+time*.18;
    falling.visible=!reduced&&progress>.8;
    for(let i=0;i<7;i++) {
      const phase=(time*.075+i/7)%1,a=i*2.399;
      dummy.position.set(Math.sin(a)*.23+Math.sin(time*.6+i)*.035,.78-phase*.85,.05+Math.cos(a)*.14);
      dummy.rotation.set(time*.5+i,time*.4+i,a+time*.3);dummy.scale.setScalar(.13);dummy.updateMatrix();falling.setMatrixAt(i,dummy.matrix);
    }
    falling.instanceMatrix.needsUpdate=true;
  }
  return {root,update,dispose:()=>{wood.dispose();leafGeometry.dispose();seedGeometry.dispose();stemGeometry.dispose();capGeometry.dispose();gold.dispose();darkGold.dispose();}};
}
