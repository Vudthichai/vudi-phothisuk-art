// Run locally against artist-provided plaintext kept OUTSIDE this public repository.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { randomBytes, createCipheriv } from 'node:crypto';
import { resolve, join } from 'node:path';
const input = process.argv[2];
if (!input) throw new Error('Provide the private input directory containing collection.json and images/.');
const key = Buffer.from(process.env.FOREST_COLLECTION_CONTENT_KEY ?? '', 'base64');
if (key.length !== 32) throw new Error('Set a random 32-byte base64 FOREST_COLLECTION_CONTENT_KEY. Never use the visitor password as this key.');
const output = resolve('netlify/private/forest');
await mkdir(join(output, 'assets'), { recursive: true });
function seal(bytes) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([Buffer.from('VFF1'), iv, cipher.getAuthTag(), ciphertext]);
}
const collection = JSON.parse(await readFile(join(input, 'collection.json'), 'utf8'));
const permitted = new Set(await readdir(join(input, 'images')));
for (const artwork of collection.artworks) for (const image of artwork.images) for (const variant of image.variants) {
  if (!permitted.has(variant.file)) throw new Error('Image missing from private package');
  const opaque = randomBytes(16).toString('hex') + '.enc';
  await writeFile(join(output, 'assets', opaque), seal(await readFile(join(input, 'images', variant.file))));
  variant.file = opaque;
}
await writeFile(join(output, 'collection.enc'), seal(Buffer.from(JSON.stringify(collection))));
console.log('Encrypted collection package written. Plaintext and keys must remain outside Git.');
