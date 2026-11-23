// After npm run build. Physical masters stay private; this checks the public output.
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const arExperiences = JSON.parse(await readFile('src/ar/experiences.json', 'utf8'));
const manifest = JSON.parse(await readFile('src/coa/routes.json', 'utf8'));
assert.equal(manifest.status, 'verified');
assert.equal(manifest.certificates.length, 15);
assert.equal(manifest.certificates.filter(record => record.designation === 'original').length, 10);
assert.equal(new Set(manifest.certificates.map(record => record.path)).size, 15);
for (const record of manifest.certificates) {
  const html = await readFile(`dist${record.path}index.html`, 'utf8');
  const doc = new JSDOM(html).window.document;
  const main = doc.querySelector('main .coa-page');
  assert(main, record.path);
  assert.equal(doc.querySelector('link[rel="canonical"]').href, record.source.qrUrl);
  assert.equal(record.source.qrUrl, 'https://vudiphothisukart.com' + record.path);
  assert(record.path.endsWith('/'));
  assert(main.textContent.includes(record.dimensions));
  assert(main.textContent.includes(record.medium ?? 'Awaiting artist confirmation'));
  assert(main.textContent.includes(record.reference));
  assert.equal(main.querySelector('.coa-designation').textContent, record.designation === 'original' ? 'Original · 1 of 1' : 'Limited Edition of 20');
  assert(main.querySelector('.coa-digital-record summary').textContent.includes('View Digital Certificate'));
  assert(main.textContent.includes('unsigned digital reference record'));
  assert.equal(main.querySelectorAll('a[href$=".pdf"], iframe, input').length, 0);
  const enabledAR = arExperiences.some(experience => (experience.entryPaths ?? experience.certificatePaths).includes(record.path));
  if (!record.arUrl && !enabledAR) assert.equal(main.querySelector('.coa-ar-link'), null);
  if (enabledAR && !record.arUrl) assert.equal(main.querySelector('.coa-ar-link').getAttribute('href'), record.path + '?ar=1');
  if (record.reviewStatus === 'replacement-pending') assert(main.textContent.includes('Physical certificate update pending'));
  await access('dist' + main.querySelector('.coa-artwork img').getAttribute('src'));
}
console.log('All 15 decoded certificate routes have static HTML, exact canonical URLs, artwork facts, correct designations, and unsigned digital records. No production certificate PDF is linked.');
