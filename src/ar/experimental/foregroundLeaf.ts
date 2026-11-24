import { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, DoubleSide, Group, PerspectiveCamera, Scene, Vector3, Quaternion, CubicBezierCurve3, Color } from 'three';

function leafGeometry(){
 const p:number[]=[],colors:number[]=[],ix:number[]=[],rows=12,cols=6;
 for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){const u=r/rows,v=c/cols*2-1;p.push(v*Math.sin(Math.PI*u)*.23,u-.5,.08*Math.sin(Math.PI*u)+.07*v*v);const color=new Color(Math.abs(v)<.1?0xa8aa72:0x6e8050);color.multiplyScalar(.84+.16*Math.sin(Math.PI*u));colors.push(color.r,color.g,color.b);}
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+cols+1;ix.push(a,b,a+1,a+1,b,b+1);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
/** A single real 3D leaf detaches from the current canopy pose and travels toward the launch-time camera. */
export function createForegroundLeaf(source:Group,camera:PerspectiveCamera,scene:Scene,random:()=>number=Math.random){
 const material=new MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:.02,side:DoubleSide,transparent:true,depthTest:true,depthWrite:false});material.forceSinglePass=true;
 const mesh=new Mesh(leafGeometry(),material);mesh.name='Occasional foreground rainforest leaf';mesh.visible=false;mesh.renderOrder=2;scene.add(mesh);
 const axisX=new Vector3(1,0,0),axisY=new Vector3(0,1,0),tumble=new Quaternion();
 let next:number|undefined,flight:{start:number;duration:number;curve:CubicBezierCurve3;rotation:Quaternion;phase:number;size:number}|undefined,disposed=false,launches=0;
 const interval=()=>8+random()*7;
 function pointInView(x:number,y:number,distance:number,origin:Vector3){return new Vector3(x,y,.5).unproject(camera).sub(origin).normalize().multiplyScalar(distance).add(origin);}
 function launch(time:number){
  source.updateWorldMatrix(true,true);camera.updateWorldMatrix(true,false);
  const origin=camera.getWorldPosition(new Vector3()),toward=source.worldToLocal(origin.clone());toward.y=0;if(toward.lengthSq()<.00001)toward.z=1;toward.normalize();
  const phase=random()*Math.PI*2,canopy=new Vector3(toward.x*(.32+random()*.08),.65+random()*.17,toward.z*(.32+random()*.08));
  const a=source.localToWorld(canopy),distance=a.distanceTo(origin),side=random()<.5?-1:1;
  const end=pointInView(side*(1.3+random()*.25),-.25+random()*.8,Math.max(camera.near*5,distance*.15),origin);
  const c=pointInView(side*(.08+random()*.4),.1+random()*.35,distance*.39,origin);
  const b=a.clone().lerp(c,.4);b.y+=distance*(.035+random()*.035);
  flight={start:time,duration:4.6+random()*1.1,curve:new CubicBezierCurve3(a,b,c,end),rotation:source.getWorldQuaternion(new Quaternion()),phase,size:source.getWorldScale(new Vector3()).x*(.023+random()*.006)};
  next=time+interval();launches++;
 }
 function update(time:number,reduced:boolean,tracked:boolean,intensity=1){
  if(disposed)return;
  if(!tracked||reduced){mesh.visible=false;flight=undefined;next=undefined;return;}
  if(next===undefined)next=time+interval();
  if(flight&&time-flight.start>=flight.duration){flight=undefined;mesh.visible=false;}
  if(!flight&&time>=next)launch(time);
  if(!flight){mesh.visible=false;return;}
  const t=Math.min(1,Math.max(0,(time-flight.start)/flight.duration)),easeIn=Math.min(1,t/.15),easeOut=Math.min(1,(1-t)/.23);
  mesh.visible=true;flight.curve.getPoint(t,mesh.position);mesh.scale.setScalar(flight.size);
  mesh.quaternion.copy(flight.rotation).multiply(tumble.setFromAxisAngle(axisX,flight.phase+t*7)).multiply(tumble.setFromAxisAngle(axisY,Math.sin(t*8+flight.phase)*.9));
  material.opacity=easeIn*easeOut*Math.min(1,Math.max(0,intensity));
 }
 return {mesh,update,get launches(){return launches;},state:()=>({active:Boolean(flight),nextLaunch:next??null,launches,origin:flight?.curve.v0.toArray()??null,duration:flight?.duration??null}),dispose(){if(disposed)return;disposed=true;mesh.removeFromParent();mesh.geometry.dispose();material.dispose();}};
}
