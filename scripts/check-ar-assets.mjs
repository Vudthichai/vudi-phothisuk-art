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
  for (const key of ['modelAsset','rainforestV5','recognitionOnly']) {
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
for (const [artworkId, presentation] of Object.entries(presentations)) {
  assert(experiences.some(experience=>experience.artworkId===artworkId));
  assert(Boolean(presentation.modelAsset)!==Boolean(presentation.rainforestV5));
  if (presentation.modelAsset) {
    assert.match(presentation.modelAsset,/^\/ar\/models\/[a-z0-9-]+\.glb$/);
    assert.equal((await readFile('public'+presentation.modelAsset)).subarray(0,4).toString(),'glTF');
  }
}
const upstream=await load('public/ar/vendor/mindar/UPSTREAM.json');
for(const [file,digest] of Object.entries(upstream.files))assert.equal(hash(await readFile('public/ar/vendor/mindar/'+file)),digest);
console.log(`AR assets verified: ${experiences.length} compiled targets, ${paths.size} verified certificate fronts, exact front-image provenance and upstream hashes. No replacement QR codes.`);
await import('./check-ar-model.mjs');

await import('./check-tiger-lily-model.mjs');
