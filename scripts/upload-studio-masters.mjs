// Run locally against the existing Netlify project. Input files stay outside Git.
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getStore } from '@netlify/blobs';
import { artworkMasters, artworkMetadata, artworkStoreName, maxArtworkBytes } from '../server/commerce/studio-artwork.mjs';

class UploadError extends Error {}

export function createArtworkUploader({ siteID, token, fetcher = fetch }) {
  let request;
  const store = getStore({
    name: artworkStoreName, siteID, token, consistency: 'strong',
    async fetch(url, options) {
      const api = new URL(url).origin === 'https://api.netlify.com';
      const method = (options?.method ?? 'GET').toUpperCase();
      const phase = api ? (method === 'HEAD' ? 'Netlify API' : 'Netlify API transfer authorization') : 'Blob transfer';
      request = { phase, method };
      const response = await fetcher(url, options);
      request.status = response.status;
      return response;
    },
  });

  function fail(master, operation, detail, hint = '') {
    const { phase, method, status } = request ?? {};
    const transport = phase
      ? ` [${phase}, ${method}, ${status === undefined ? 'no HTTP response' : `HTTP ${status}`}]`
      : '';
    throw new UploadError(`${operation} failed: ${master.filename}${transport}. ${detail}${hint ? ' ' + hint : ''}`);
  }

  async function run(master, operation, action) {
    request = undefined;
    try {
      return await action();
    } catch {
      const status = request?.status;
      let hint = '';
      if (request?.phase.startsWith('Netlify API')) {
        if (status === 401 || status === 403) hint = 'Check the local Netlify token, the Project ID, and the token owner’s access to this project.';
        if (status === 404) hint = 'Check the Project ID and the token owner’s access to this project.';
      } else if (request?.phase === 'Blob transfer' && (status === 401 || status === 403)) {
        hint = 'The API authorized the transfer, but the storage endpoint rejected it.';
      }
      if (status === 429) hint = 'Netlify rate-limited the request. Wait and retry.';
      const detail = status === undefined ? 'The SDK did not complete an HTTP request.'
        : status < 400 ? 'The SDK could not process the response.' : 'The service rejected the request.';
      fail(master, operation, detail, hint);
    }
  }

  return async function uploadMaster(master, bytes) {
    const metadata = { bytes: bytes.length, sha256: master.sha256 };
    const existing = await run(master, 'Check existing Blob metadata',
      () => store.getMetadata(master.key, { consistency: 'strong' }));
    let disposition = 'already present';
    if (!existing) {
      const write = await run(master, 'Conditional Blob upload',
        () => store.set(master.key, new Blob([bytes], { type: 'image/jpeg' }), { onlyIfNew: true, metadata }));
      // The SDK reports 409/412 as modified:false. Verify the competing write before accepting it.
      disposition = write.modified ? 'uploaded' : `already present after conditional write, HTTP ${request?.status ?? 'unavailable'}`;
    }
    const stored = await run(master, 'Read back Blob',
      () => store.getWithMetadata(master.key, { type: 'arrayBuffer', consistency: 'strong' }));
    if (!stored) fail(master, 'Verify private Blob', 'The Blob was not found on read-back. Retry the upload.');
    if (artworkMetadata(stored, master)?.bytes !== bytes.length) {
      fail(master, 'Verify private Blob metadata', 'The stored size or checksum metadata does not match the approved original. The uploader will not overwrite it.');
    }
    if (!(stored.data instanceof ArrayBuffer) || stored.data.byteLength !== bytes.length ||
        createHash('sha256').update(Buffer.from(stored.data)).digest('hex') !== master.sha256) {
      fail(master, 'Verify private Blob bytes', 'The downloaded size or SHA-256 does not match the approved original. The uploader will not overwrite it.');
    }
    return disposition;
  };
}

async function upload() {
  const directory = process.argv[2];
  const { NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN } = process.env;
  const siteID = NETLIFY_SITE_ID?.trim();
  const token = NETLIFY_AUTH_TOKEN?.trim();
  if (!directory || !siteID || !token) {
    throw new UploadError('Provide the private master directory, NETLIFY_SITE_ID, and NETLIFY_AUTH_TOKEN.');
  }
  if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(siteID)) {
    throw new UploadError('NETLIFY_SITE_ID must be the Project ID from Netlify Project details, in UUID format.');
  }
  if (process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext) {
    throw new UploadError('Run the uploader from a local shell outside Netlify Dev or Build, with NETLIFY_BLOBS_CONTEXT unset.');
  }

  const verified = [];
  for (const master of Object.values(artworkMasters)) {
    const path = join(resolve(directory), master.filename);
    const info = await lstat(path).catch(() => null);
    if (!info?.isFile() || info.size <= 0 || info.size > maxArtworkBytes) {
      throw new UploadError(`Missing, invalid, or oversized original: ${master.filename}`);
    }
    const bytes = await readFile(path).catch(() => {
      throw new UploadError(`Cannot read original: ${master.filename}`);
    });
    if (bytes.length !== info.size || createHash('sha256').update(bytes).digest('hex') !== master.sha256) {
      throw new UploadError(`Checksum differs from the approved original: ${master.filename}`);
    }
    verified.push({ master, bytes });
  }

  const uploadMaster = createArtworkUploader({ siteID, token });
  for (const { master, bytes } of verified) {
    const disposition = await uploadMaster(master, bytes);
    console.log(`Verified private Blob: ${master.filename} (${bytes.length} bytes, ${disposition})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  upload().catch(error => {
    console.error(error instanceof UploadError ? error.message : 'The private uploader could not initialize. Check Node.js and the installed dependencies.');
    process.exitCode = 1;
  });
}
