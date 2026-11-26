import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const load=async path=>JSON.parse(await readFile(path,'utf8'));
const experiences=await load('src/ar/experiences.json');
const presentations=await load('src/ar/artwork-presentations.json');
const records=(await load('src/coa/routes.json')).certificates;
const paths=new Set();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const experience of experiences) {
  assert.equal(experience.targetIndex,0,'This first prototype uses one target per compiled file.');
  assert(experience.targetImage.startsWith('/ar/targets/')&&experience.targetFile.startsWith('/ar/targets/'));
  const image=await readFile('public'+experience.targetImage),target=await readFile('public'+experience.targetFile);
  const meta=await load('public'+experience.targetImage.replace(/\.jpg$/,'.json'));
  if (experience.previewOnly) {
    assert.equal(experience.entryPaths.length,0,'Previews must not enable certificate-page entry controls.');
    assert.equal(experience.targetAspect,meta.targetDimensions[0]/meta.targetDimensions[1]);
  }
  for (const key of ['modelAsset','rainforestV5','composition','previewComposition','previewV3Composition','previewLabel','entrance','recognitionOnly']) {
    assert(!Object.hasOwn(experience,key),'Set presentations once per artwork.');
  }
  assert.equal(hash(image),meta.targetImageSha256);assert.equal(hash(target),meta.compiledTargetSha256);
  assert(meta.compiler.matchingFeatures>100&&meta.compiler.featureLevels>0);
  assert(Math.max(...meta.targetDimensions)<=1024);
  assert(Math.abs(meta.targetDimensions[0]/meta.targetDimensions[1]-meta.embeddedDimensions[0]/meta.embeddedDimensions[1])<.002);
  for(const path of experience.certificatePaths) {
    const record=records.find(record=>record.path===path);
    assert(record&&record.artworkId===experience.artworkId);assert(!paths.has(path));paths.add(path);
    const evidence=meta.certificateSources.find(source=>source.path===path);
    assert(evidence,'Every enabled physical certificate needs its own front-image provenance.');
    if (experience.previewOnly && evidence.sourceVariant==='bleed') {
      assert.equal(evidence.qrUrl,record.source.qrUrl);
      assert.match(evidence.pdfSha256,/^[a-f0-9]{64}$/);
      assert.equal(evidence.pdfSha256,meta.sourcePdfSha256);
    } else {
      assert.equal(record.source.pdfSha256,evidence.pdfSha256,'Re-extract/recompile after a physical certificate front changes.');
    }
    assert.equal(evidence.imagePixelsSha256,meta.embeddedImagePixelsSha256,'Only identical certificate artwork images may reuse a compiled target.');
  }
}
assert.deepEqual([...paths].sort(), records.map(record=>record.path).sort());
const msat = await load('public/ar/targets/msat-magnet.json');
const msatImage = await readFile('public/ar/targets/msat-magnet.jpg');
const msatTarget = await readFile('public/ar/targets/msat-magnet.mind');
assert.equal(hash(await readFile(msat.sourcePath)), msat.sourceSha256);
assert.equal(hash(msatImage), msat.targetImageSha256);
assert.equal(hash(msatTarget), msat.compiledTargetSha256);
assert.equal(msatTarget.length, msat.compiledBytes);
assert(msat.compiler.matchingFeatures > 100 && msat.compiler.featureLevels > 0);
assert.equal(msat.targetDimensions[0], msat.targetDimensions[1]);
assert(!experiences.some(experience => experience.targetFile === '/ar/targets/msat-magnet.mind'));

const msatModelPath = '/ar/models/msat-signature.glb';
const msatModel = await readFile('public' + msatModelPath);
const msatGltf = JSON.parse(msatModel.toString('utf8', 20, 20 + msatModel.readUInt32LE(12)));
const [msatPrimitive] = msatGltf.meshes.flatMap(mesh => mesh.primitives);
assert(msatModel.length < 4_000_000);
assert(msatGltf.extensionsRequired.includes('EXT_meshopt_compression'));
assert.equal(msatGltf.meshes.flatMap(mesh => mesh.primitives).length, 1);
assert.equal(msatGltf.accessors[msatPrimitive.indices].count / 3, 110_000);
assert.equal(msatGltf.images.length, 3);
assert(msatGltf.images.every(image => Number.isInteger(image.bufferView) && !image.uri));

const modelPaths=new Set([msatModelPath]);
assert.deepEqual(Object.keys(presentations).sort(), [...new Set(records.map(record=>record.artworkId))].sort());
function validateEntrance(entrance) {
  if (entrance) {
      assert(Number.isFinite(entrance.duration) && entrance.duration>0);
      assert(Number.isFinite(entrance.stagger) && entrance.stagger>=0);
      assert(Number.isFinite(entrance.softness) && entrance.softness>0 && entrance.softness<=.5);
      assert(Number.isFinite(entrance.atmosphere) && entrance.atmosphere>=0 && entrance.atmosphere<=1);
      assert(entrance.direction.length===3 && entrance.direction.every(Number.isFinite) && entrance.direction.some(Boolean));
      if (entrance.radialCenter) {
        assert(entrance.radialCenter.length===3 && entrance.radialCenter.every(value=>value>=0 && value<=1));
      }
      if (entrance.atmosphereColor!==undefined) {
        assert(Number.isInteger(entrance.atmosphereColor) && entrance.atmosphereColor>=0 && entrance.atmosphereColor<=0xffffff);
      }
  }
}
for (const presentation of Object.values(presentations)) {
  validateEntrance(presentation.entrance);
  assert.equal([presentation.modelAsset, presentation.rainforestV5, presentation.composition].filter(Boolean).length,1);
  if (presentation.modelAsset) modelPaths.add(presentation.modelAsset);
  for (const composition of [presentation.composition, presentation.previewComposition, presentation.previewV3Composition].filter(Boolean)) {
    const { pieces, leafRain, entrance } = composition;
    validateEntrance(entrance);
    assert(pieces.length>0);
    if (composition.gildedBotanical) {
      assert.equal(pieces.length,1);
      assert.equal(entrance.phases.length,4);
    }
    if (entrance?.phases) {
      assert.equal(entrance.phases.length,pieces.length+(composition.gildedBotanical?3:0));
      for (const phase of entrance.phases) {
        assert(Number.isFinite(phase.start) && phase.start>=0);
        assert(Number.isFinite(phase.duration) && phase.duration>0);
        if (phase.direction) {
          assert(phase.direction.length===3 && phase.direction.every(Number.isFinite) && phase.direction.some(Boolean));
        }
      }
    }
    if (leafRain) assert.equal(pieces.length,2);
    for (const piece of pieces) {
      assert(Number.isFinite(piece.size) && piece.size>0);
      for (const tuple of [piece.position, piece.rotation]) {
        assert.equal(tuple.length,3);
        assert(tuple.every(Number.isFinite));
      }
      modelPaths.add(piece.asset);
    }
  }
}
for (const path of modelPaths) {
  assert.match(path,/^\/ar\/models\/[a-z0-9-]+\.glb$/);
  const bytes=await readFile('public'+path);
  assert.equal(bytes.subarray(0,4).toString(),'glTF');
  assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
}
const upstream=await load('public/ar/vendor/mindar/UPSTREAM.json');
for(const [file,digest] of Object.entries(upstream.files))assert.equal(hash(await readFile('public/ar/vendor/mindar/'+file)),digest);
console.log(`AR assets verified: ${experiences.length} compiled targets, ${paths.size} verified certificate fronts, exact front-image provenance and upstream hashes. No replacement QR codes.`);
console.log('Optional MSAT tracker verified separately against the authentic floral artwork.');
await import('./check-ar-model.mjs');

await import('./check-tiger-lily-model.mjs');
