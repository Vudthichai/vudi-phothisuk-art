import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const meta=JSON.parse(await readFile('public/ar/models/tiger-lily-orange.json','utf8')),bytes=await readFile('public'+meta.asset);
assert.equal(bytes.length,meta.bytes);assert(bytes.length<12_000_000);assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);
assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
const doc=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));let triangles=0;
for(const mesh of doc.meshes)for(const p of mesh.primitives){assert(p.attributes.NORMAL!==undefined&&p.attributes.TEXCOORD_0!==undefined);triangles+=doc.accessors[p.indices].count/3;}
assert.equal(triangles,meta.triangles);assert(triangles<=110000);assert.equal(doc.materials.length,1);const m=doc.materials[0];assert(m.pbrMetallicRoughness.baseColorTexture);assert(m.pbrMetallicRoughness.metallicRoughnessTexture);assert(m.normalTexture);assert.equal(doc.images.length,3);for(const image of doc.images)assert(image.bufferView!==undefined&&!image.uri);assert(doc.extensionsRequired.includes('EXT_meshopt_compression'));
console.log(`Tiger Lily verified: ${triangles} triangles, ${bytes.length} bytes, embedded authentic PBR maps, Meshopt.`);
