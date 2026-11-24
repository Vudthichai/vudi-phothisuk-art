// Run locally against the existing Netlify project. Input files stay outside Git.
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { getStore } from '@netlify/blobs';
import { artworkMasters, artworkMetadata, artworkStoreName, maxArtworkBytes } from '../server/commerce/studio-artwork.mjs';

async function upload() {
  const directory = process.argv[2];
  const { NETLIFY_SITE_ID: siteID, NETLIFY_AUTH_TOKEN: token } = process.env;
  if (!directory || !siteID || !token) {
    throw new Error('Provide the private master directory, NETLIFY_SITE_ID, and NETLIFY_AUTH_TOKEN.');
  }
  const verified = [];
  for (const master of Object.values(artworkMasters)) {
    const path = join(resolve(directory), master.filename);
    const info = await lstat(path).catch(() => null);
    if (!info?.isFile() || info.size <= 0 || info.size > maxArtworkBytes) {
      throw new Error(`Missing, invalid, or oversized original: ${master.filename}`);
    }
    const bytes = await readFile(path);
    if (bytes.length !== info.size || createHash('sha256').update(bytes).digest('hex') !== master.sha256) {
      throw new Error(`Checksum differs from the approved original: ${master.filename}`);
    }
    verified.push({ master, bytes });
  }

  const store = getStore({ name: artworkStoreName, siteID, token, consistency: 'strong' });
  for (const { master, bytes } of verified) {
    try {
      const metadata = { bytes: bytes.length, sha256: master.sha256 };
      const existing = await store.getMetadata(master.key, { consistency: 'strong' });
      if (!existing) {
        await store.set(master.key, new Blob([bytes], { type: 'image/jpeg' }), { onlyIfNew: true, metadata });
      }
      const stored = await store.getWithMetadata(master.key, { type: 'arrayBuffer', consistency: 'strong' });
      if (artworkMetadata(stored, master)?.bytes !== bytes.length ||
          createHash('sha256').update(Buffer.from(stored.data)).digest('hex') !== master.sha256) {
        throw new Error();
      }
    } catch {
      throw new Error(`Private upload or read-back verification failed: ${master.filename}`);
    }
    console.log(`Verified private Blob: ${master.filename} (${bytes.length} bytes)`);
  }
}

upload().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
