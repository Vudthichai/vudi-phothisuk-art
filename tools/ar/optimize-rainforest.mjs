import {NodeIO} from '@gltf-transform/core';
import {weld,simplify,prune,meshopt} from '@gltf-transform/functions';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptSimplifier,MeshoptEncoder} from 'meshoptimizer';
import sharp from 'sharp';
const [source,output]=process.argv.slice(2);if(!source||!output)throw new Error('Usage: node optimize-rainforest.mjs private-source.glb output.glb');
await Promise.all([MeshoptSimplifier.ready,MeshoptEncoder.ready]);const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});console.time('read');const doc=await io.read(source);console.timeEnd('read');
console.time('simplify');await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:200000/7641664,error:.004}),prune());console.timeEnd('simplify');
for(const [i,texture] of doc.getRoot().listTextures().entries()){
 let image=sharp(texture.getImage()).resize(i===1?1024:2048,i===1?1024:2048,{fit:'inside',withoutEnlargement:true});
 texture.setImage(await (i===0?image.jpeg({quality:92,chromaSubsampling:'4:4:4'}):image.png({compressionLevel:9})).toBuffer()).setMimeType(i===0?'image/jpeg':'image/png');
}
console.log('triangles',doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((a,p)=>a+p.getIndices().getCount()/3,0),0));await doc.transform(meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:14,quantizeNormal:12,quantizeTexcoord:14}));await io.write(output,doc);
