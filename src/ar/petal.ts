import { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, DoubleSide } from 'three';
/** A small curved petal, modeled in target-width units. No artwork texture is used. */
export function createGoldenPetal() {
  const positions:number[]=[]; const indices:number[]=[];
  const rows=28, columns=12;
  for(let r=0;r<=rows;r++) {
    const u=r/rows;
    const halfWidth=Math.pow(Math.sin(Math.PI*u),.85)*.085;
    for(let c=0;c<=columns;c++) {
      const v=c/columns*2-1;
      positions.push(v*halfWidth,(u-.5)*.32,.035*Math.sin(Math.PI*u)+.03*v*v+.018*u*u);
    }
  }
  for(let r=0;r<rows;r++) for(let c=0;c<columns;c++) {
    const a=r*(columns+1)+c,b=a+columns+1;
    indices.push(a,b,a+1,a+1,b,b+1);
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new MeshStandardMaterial({color:0xc99a37,metalness:.72,roughness:.34,side:DoubleSide});
  const mesh=new Mesh(geometry,material);mesh.name='Golden petal';mesh.position.set(0,.30,.13);
  return {mesh,dispose:()=>{geometry.dispose();material.dispose();}};
}
