import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const meta=JSON.parse(await readFile('public/ar/models/mother-nature-golden-tree.json','utf8'));
const bytes=await readFile('public'+meta.asset);assert(bytes.length<15_000_000);assert.equal(bytes.length,meta.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);
assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
assert.equal(json.buffers.length,1);assert(!json.buffers[0].uri,'Model must be self-contained');
let triangles=0;for(const mesh of json.meshes)for(const p of mesh.primitives){assert.equal(p.mode??4,4);assert(p.attributes.NORMAL!==undefined&&p.attributes.TEXCOORD_0!==undefined);triangles+=json.accessors[p.indices].count/3;}
assert.equal(triangles,meta.triangles);assert(triangles>=80_000&&triangles<=150_000);assert.equal(json.materials.length,1);
const material=json.materials[0];assert(material.pbrMetallicRoughness.baseColorTexture);assert(material.pbrMetallicRoughness.metallicRoughnessTexture);assert(material.normalTexture);
assert.equal(json.images.length,3);for(const image of json.images)assert(image.bufferView!==undefined&&!image.uri,'Textures must remain embedded');
assert.equal((json.extensionsRequired??[]).length,0,'No external compression decoder required');
console.log(`AR model verified: ${triangles.toLocaleString()} triangles, ${bytes.length.toLocaleString()} bytes; self-contained PBR textures and integrity hash.`);
