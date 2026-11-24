import {NodeIO} from '@gltf-transform/core';
import {weld,simplify,prune} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
const io=new NodeIO();await MeshoptSimplifier.ready;
const [source,output]=process.argv.slice(2);if(!source||!output)throw new Error('Usage: node optimize-golden-tree.mjs private-source.glb output.glb');
console.time('read');const doc=await io.read(source);console.timeEnd('read');
console.time('simplify');await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:145000/6476570,error:.008}),prune());console.timeEnd('simplify');
for(const [i,texture] of doc.getRoot().listTextures().entries()) {
 const input=texture.getImage();const max=i===1?1024:2048;
 texture.setImage(await sharp(input).resize(max,max,{fit:'inside',withoutEnlargement:true}).jpeg({quality:i===0?90:94,chromaSubsampling:'4:4:4'}).toBuffer()).setMimeType('image/jpeg');
}
const count=doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((a,p)=>a+p.getIndices().getCount()/3,0),0);console.log('final_triangles',count);
await io.write(output,doc);
