import manifest from './routes.json';
import { forestCollection } from '../forest/collection';

export type CertificateRecord = {
  path: string;
  artworkId: string;
  designation: 'original' | 'collectors-edition';
  reference: string;
  medium: string | null;
  dimensions: string;
  source: { pdfSha256: string; qrUrl: string };
  reviewStatus?: 'replacement-pending';
  arUrl?: string;
};
export type CertificateManifest = { status: 'awaiting-source-certificates' | 'verified'; certificates: CertificateRecord[] };
export const certificateOrigin = 'https://vudiphothisukart.com';
export function validateCertificateManifest(data: CertificateManifest) {
  if (data.status === 'awaiting-source-certificates') {
    if (data.certificates.length) throw new Error('Unverified certificate routes cannot be published.');
    return data.certificates;
  }
  if (data.status !== 'verified' || data.certificates.length !== 15) throw new Error('A verified manifest requires all 15 physical certificates.');
  const paths = new Set<string>();
  const references = new Set<string>();
  for (const record of data.certificates) {
    const artwork = forestCollection.artworks.find(art => art.id === record.artworkId);
    if (!artwork) throw new Error(`Unknown certificate artwork: ${record.artworkId}`);
    const expected = `/coa/forest-and-flowers/${artwork.slug}/${record.designation}/`;
    if (!['original', 'collectors-edition'].includes(record.designation) || record.path !== expected || record.source.qrUrl !== certificateOrigin + record.path) throw new Error(`Certificate route must match its decoded QR URL exactly: ${record.path}`);
    if (!record.reference.trim() || !record.dimensions.trim() || !/^[a-f0-9]{64}$/.test(record.source.pdfSha256)) throw new Error(`Incomplete certificate evidence: ${record.path}`);
    if (paths.has(record.path) || references.has(record.reference)) throw new Error(`Duplicate certificate route or reference: ${record.path}`);
    if (record.designation === 'original' && record.dimensions !== artwork.dimensions) throw new Error(`Original dimensions disagree with the artwork catalog: ${record.path}`);
    if (record.arUrl && !/^https:\/\//.test(record.arUrl)) throw new Error('AR requires a configured HTTPS destination.');
    paths.add(record.path); references.add(record.reference);
  }
  const originals = data.certificates.filter(record => record.designation === 'original');
  if (originals.length !== 10 || new Set(originals.map(record => record.artworkId)).size !== 10 || data.certificates.filter(record => record.designation === 'collectors-edition').length !== 5) throw new Error('Expected 10 distinct originals and 5 Collector’s Edition records.');
  return data.certificates;
}
export const certificateRecords = validateCertificateManifest(manifest as CertificateManifest);
export function certificateForPath(path: string) {
  const canonical = path.endsWith('/') ? path : path + '/';
  return certificateRecords.find(record => record.path === canonical);
}
