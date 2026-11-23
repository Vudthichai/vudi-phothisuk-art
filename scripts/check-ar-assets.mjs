import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const load=async path=>JSON.parse(await readFile(path,'utf8'));
const experiences=await load('src/ar/experiences.json');
const records=(await load('src/coa/routes.json')).certificates;
const paths=new Set();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const experience of experiences) {
  assert.equal(experience.targetIndex,0,'This first prototype uses one target per compiled file.');
  assert(experience.targetImage.startsWith('/ar/targets/')&&experience.targetFile.startsWith('/ar/targets/'));
  const image=await readFile('public'+experience.targetImage),target=await readFile('public'+experience.targetFile);
  const meta=await load('public'+experience.targetImage.replace(/\.jpg$/,'.json'));
  assert.equal(hash(image),meta.targetImageSha256);assert.equal(hash(target),meta.compiledTargetSha256);
  assert(meta.compiler.matchingFeatures>100&&meta.compiler.featureLevels>0);
  assert(Math.max(...meta.targetDimensions)<=1024);
  assert(Math.abs(meta.targetDimensions[0]/meta.targetDimensions[1]-meta.embeddedDimensions[0]/meta.embeddedDimensions[1])<.002);
  for(const path of experience.certificatePaths) {
    const record=records.find(record=>record.path===path);
    assert(record&&record.artworkId===experience.artworkId);assert(!paths.has(path));paths.add(path);
    const evidence=meta.certificateSources.find(source=>source.path===path);
    assert(evidence,'Every enabled physical certificate needs its own front-image provenance.');
    assert.equal(record.source.pdfSha256,evidence.pdfSha256,'Re-extract/recompile after a physical certificate front changes.');
    assert.equal(evidence.imagePixelsSha256,meta.embeddedImagePixelsSha256,'Only identical certificate artwork images may reuse a compiled target.');
  }
}
const upstream=await load('public/ar/vendor/mindar/UPSTREAM.json');
for(const [file,digest] of Object.entries(upstream.files))assert.equal(hash(await readFile('public/ar/vendor/mindar/'+file)),digest);
console.log(`AR assets verified: ${experiences.length} compiled target, ${paths.size} enabled certificate, exact front-image provenance and upstream hashes. No replacement QR codes.`);
