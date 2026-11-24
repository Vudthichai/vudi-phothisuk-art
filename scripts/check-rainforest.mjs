import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptDecoder} from '../node_modules/three/examples/jsm/libs/meshopt_decoder.module.js';
if(process.argv.includes('--production')){
 await assert.rejects(access('dist/rainforest-ar.html'));await assert.rejects(access('dist/rainforest-v2.html'));const assets=await readdir('dist/assets');assert(!assets.some(n=>n.includes('ancient-rainforest')||n.includes('rainforest-')),'Experimental chunks/model must not ship in production');console.log('Production excludes rainforest HTML, scene chunks and GLB.');
}else{
 const path='src/ar/experimental/assets/ancient-rainforest',meta=JSON.parse(await readFile(path+'.json','utf8')),bytes=await readFile(path+'.glb');assert.equal(bytes.length,meta.bytes);assert(bytes.length<20_000_000);assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);
 const n=bytes.readUInt32LE(12),j=JSON.parse(bytes.toString('utf8',20,20+n)),base=28+n;assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(j.meshes.length,1);assert.equal(j.materials.length,1);assert.equal(j.animations?.length??0,0);assert(j.buffers.every(b=>!b.uri));assert(j.images.every(i=>!i.uri&&i.bufferView!==undefined));
 const primitive=j.meshes[0].primitives[0];assert.equal(j.accessors[primitive.indices].count/3,meta.triangles);assert(meta.triangles<250000);assert(primitive.attributes.NORMAL!==undefined&&primitive.attributes.TEXCOORD_0!==undefined);const mat=j.materials[0];assert(mat.pbrMetallicRoughness.baseColorTexture&&mat.pbrMetallicRoughness.metallicRoughnessTexture&&mat.normalTexture);
 await MeshoptDecoder.ready;let decoded=0;for(const v of j.bufferViews){const e=v.extensions?.EXT_meshopt_compression;if(e){MeshoptDecoder.decodeGltfBuffer(new Uint8Array(e.count*e.byteStride),e.count,e.byteStride,bytes.subarray(base+e.byteOffset,base+e.byteOffset+e.byteLength),e.mode,e.filter);decoded++;}}assert(decoded>0);console.log(`Rainforest: ${meta.bytes} bytes, ${meta.triangles} triangles, ${decoded} buffers decoded with bundled Three.js decoder.`);
}
