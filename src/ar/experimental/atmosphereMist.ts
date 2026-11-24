import { DataTexture, RGBAFormat, UnsignedByteType, LinearFilter, Sprite, SpriteMaterial, Group } from 'three';

/** Six depth-separated wisps: contrasting gray/white root haze, lighter trunk/canopy atmosphere. */
export function createAtmosphereMist() {
  const size=128, bytes=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/(size-1)*2-1,v=y/(size-1)*2-1;
    const edge=Math.max(0,1-Math.max(Math.abs(u),Math.abs(v)));
    const body=Math.exp(-2.5*(u*u+v*v));
    // A broken, multi-lobed cloud rather than a uniform translucent rectangle.
    const noise=.70+.17*Math.sin(u*8+v*5)+.10*Math.sin(u*18-v*11)+.06*Math.cos(u*31+v*15);
    const i=(y*size+x)*4;bytes[i]=bytes[i+1]=bytes[i+2]=255;
    bytes[i+3]=Math.round(255*body*Math.min(1,edge*5)**2*Math.max(.1,noise));
  }
  const texture=new DataTexture(bytes,size,size,RGBAFormat,UnsignedByteType);texture.minFilter=texture.magFilter=LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  const root=new Group();root.name='Layered rainforest atmosphere';
  const layers=[
    {p:[-.16,.065,.49],s:[.82,.17],color:0xb8c5bf,alpha:.56},
    {p:[.15,.115,.36],s:[.72,.15],color:0xe9eee7,alpha:.60},
    {p:[.02,.07,-.40],s:[.88,.13],color:0xc9d3cc,alpha:.38},
    {p:[-.04,.29,.27],s:[.57,.15],color:0xe5ebe3,alpha:.42},
    {p:[-.17,.51,-.20],s:[.49,.10],color:0xdce5db,alpha:.27},
    {p:[.14,.69,.19],s:[.43,.09],color:0xe7eee4,alpha:.23},
  ];
  const sprites=layers.map((l,i)=>{const m=new SpriteMaterial({map:texture,color:l.color,transparent:true,depthTest:true,depthWrite:false,toneMapped:false});const sprite=new Sprite(m);sprite.name=`Atmospheric wisp ${i+1}`;sprite.renderOrder=1;root.add(sprite);return sprite;});
  let enabled=true,disposed=false;
  function update(time:number,reduced:boolean,intensity=1) {
    root.visible=enabled;if(!enabled||disposed)return;const t=reduced?0:time;
    layers.forEach((l,i)=>{const phase=i*1.73,s=sprites[i];s.position.set(l.p[0]+.06*Math.sin(t*.11+phase),l.p[1]+.009*Math.sin(t*.09+phase),l.p[2]+.024*Math.cos(t*.075+phase));s.scale.set(l.s[0]*(1+.045*Math.sin(t*.08+phase)),l.s[1],1);s.material.rotation=.025*Math.sin(t*.07+phase);const density=i<3?.90+.10*Math.sin(t*.13+phase):.62+.38*(.5+.5*Math.sin(t*.27+phase));s.material.opacity=l.alpha*density*Math.min(1,Math.max(0,intensity));});
  }
  update(0,false);
  return {root,texture,update,setEnabled(value:boolean){enabled=value;root.visible=value;},dispose(){if(disposed)return;disposed=true;sprites.forEach(s=>s.material.dispose());texture.dispose();root.clear();}};
}
