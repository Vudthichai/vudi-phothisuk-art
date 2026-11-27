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
  const targets = arExperiences.filter(experience => experience.certificatePaths.includes(record.path));
  assert.equal(targets.length, 1, record.path);
  assert.equal(targets[0].artworkId, record.artworkId);
  const launch = main.querySelector('.coa-ar-link');
  assert.equal(launch?.textContent, 'Experience in Augmented Reality');
  assert.equal(launch.getAttribute('href'), record.arUrl ?? record.path + '?ar=1');
  assert(main.querySelector('#coa-ar-instructions').textContent.includes('Start camera'));
  if (record.reviewStatus === 'replacement-pending') assert(main.textContent.includes('Physical certificate update pending'));
  await access('dist' + main.querySelector('.coa-artwork img').getAttribute('src'));
}
console.log('All 15 printed QR paths retain their canonical certificate records and show the AR launch for the matching artwork and edition.');
