// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CertificatePage, CertificateView } from './coa/CertificatePage';
import { certificateRecords, validateCertificateManifest, type CertificateManifest, type CertificateRecord } from './coa/records';
import { forestCollection } from './forest/collection';
import { studioSizes } from './studio/editions';
import { metadata } from './seo/catalog';

afterEach(cleanup);
// Test-only records never enter the public manifest or static build.
function fixture(artworkId = 'mother-nature', designation: CertificateRecord['designation'] = 'original'): CertificateRecord {
  const artwork = forestCollection.artworks.find(art => art.id === artworkId)!;
  const path = `/coa/forest-and-flowers/${artwork.slug}/${designation}/`;
  return { artworkId, designation, path, reference: `TEST-ONLY-${artworkId}-${designation}`, medium: designation === 'original' ? artwork.medium : 'Test print medium', dimensions: designation === 'original' ? artwork.dimensions! : 'Test print dimensions', source: { qrUrl: `https://vudiphothisukart.com${path}`, pdfSha256: 'a'.repeat(64) } };
}
function completeFixture(): CertificateManifest {
  return { status: 'verified', certificates: [...forestCollection.artworks.map(art => fixture(art.id)), ...forestCollection.artworks.slice(0,5).map(art => fixture(art.id,'collectors-edition'))] };
}
function view(record: CertificateRecord) { return render(<MemoryRouter><CertificateView record={record}/></MemoryRouter>); }

it('rejects partial, mismatched, duplicate, and unverified route evidence rather than fabricating permanent URLs', () => {
  expect(validateCertificateManifest(completeFixture())).toHaveLength(15);
  expect(validateCertificateManifest({ status:'awaiting-source-certificates', certificates:[] })).toEqual([]);
  expect(() => validateCertificateManifest({ status:'awaiting-source-certificates', certificates:[fixture()] })).toThrow(/Unverified/);
  const partial = completeFixture(); partial.certificates.pop();
  expect(() => validateCertificateManifest(partial)).toThrow(/15/);
  const changed = completeFixture(); changed.certificates[0].path = changed.certificates[0].path.slice(0,-1);
  expect(() => validateCertificateManifest(changed)).toThrow(/exactly/);
  const wrongQr = completeFixture(); wrongQr.certificates[0].source.qrUrl += 'changed/';
  expect(() => validateCertificateManifest(wrongQr)).toThrow(/exactly/);
  const duplicate = completeFixture(); duplicate.certificates[1] = duplicate.certificates[0];
  expect(() => validateCertificateManifest(duplicate)).toThrow(/Duplicate/);
  const wrongDimensions = completeFixture(); wrongDimensions.certificates[0].dimensions = 'Wrong original dimensions';
  expect(() => validateCertificateManifest(wrongDimensions)).toThrow(/dimensions/);
});

it('displays original details, the AR launch, and an unsigned digital reference', () => {
  view(fixture());
  expect(screen.getByRole('heading',{level:1,name:'Mother Nature'})).toBeTruthy();
  expect(screen.getAllByText('Original · 1 of 1')).toHaveLength(2);
  expect(screen.getByText('Forest & Flowers — 2026')).toBeTruthy();
  expect(screen.getByText('24 × 36 in.')).toBeTruthy();
  expect(screen.getByRole('img',{name:/Mother Nature/})).toBeTruthy();
  expect(screen.getByRole('link',{name:'Experience in Augmented Reality'}).getAttribute('href')).toBe('/coa/forest-and-flowers/mother-nature/original/?ar=1');
  const disclosure = screen.getByText('View Digital Certificate');
  fireEvent.click(disclosure);
  expect(disclosure.closest('details')?.open).toBe(true);
  expect(screen.getByText(/unsigned digital reference record/)).toBeTruthy();
  expect(document.querySelector('a[href$=".pdf"],iframe,canvas,input')).toBeNull();
  expect(screen.getByRole('link',{name:'Back to Forest & Flowers'}).getAttribute('href')).toBe('/collections/forest-and-flowers/');
});

it('distinguishes a shared edition-level record from an individual signed copy or owner', () => {
  view(fixture('mother-nature','collectors-edition'));
  expect(screen.getByText('Collector’s Edition')).toBeTruthy();
  expect(screen.getAllByText('Limited Edition of 20')).toHaveLength(2);
  expect(screen.queryByText('Original · 1 of 1')).toBeNull();
  expect(screen.getByText(/does not identify or verify an individual copy number or owner/)).toBeTruthy();
  expect(screen.getByText('Test print dimensions')).toBeTruthy();
  expect(screen.queryByText('24 × 36 in.')).toBeNull();
  expect(screen.getByText(/Original painting shown as an artwork reference/)).toBeTruthy();
});

it('publishes the finalized Dragon Lily facts and artwork description at its permanent URL', () => {
  const record = certificateRecords.find(record => record.artworkId === 'dragon-lily')!;
  const artwork = forestCollection.artworks.find(artwork => artwork.id === 'dragon-lily')!;
  const medium = 'Mixed-media acrylic with organic plaster on canvas';
  view(record);
  expect(record.source.qrUrl).toBe('https://vudiphothisukart.com/coa/forest-and-flowers/dragon-lily/original/');
  expect(record.medium).toBe(medium);
  expect(artwork.medium).toBe(medium);
  expect(screen.getByText(medium)).toBeTruthy();
  expect(screen.getByText('18 × 24 in.')).toBeTruthy();
  for (const paragraph of artwork.description.slice(0, 2)) {
    expect(screen.getByText(paragraph)).toBeTruthy();
  }
  expect(screen.queryByText(/awaiting artist confirmation|physical certificate update pending/i)).toBeNull();
});

it('honors an explicitly configured HTTPS AR link', () => {
  view({ ...fixture(), arUrl:'https://example.invalid/test-only-ar' });
  expect(screen.getByRole('link',{name:'Experience in Augmented Reality'}).getAttribute('href')).toBe('https://example.invalid/test-only-ar');
  const unsafe = completeFixture(); unsafe.certificates[0].arUrl = 'javascript:alert(1)';
  expect(() => validateCertificateManifest(unsafe)).toThrow(/HTTPS/);
});

it('never treats guessed certificate paths as verified records', () => {
  render(<MemoryRouter initialEntries={['/coa/forest-and-flowers/unknown/original/']}><CertificatePage/></MemoryRouter>);
  expect(screen.getByRole('heading',{name:'Page not found.'})).toBeTruthy();
  expect(certificateRecords.every(record => record.path.endsWith('/') && record.source.qrUrl.endsWith(record.path))).toBe(true);
  expect(certificateRecords).toHaveLength(15);
  expect(certificateRecords.filter(record => record.designation === 'original')).toHaveLength(10);
  expect(certificateRecords.filter(record => record.designation === 'collectors-edition')).toHaveLength(5);
});

it('corrects the two original dimensions without changing Studio Print sizes or prices', () => {
  for (const id of ['tiger-lily','75-leaves']) expect(forestCollection.artworks.find(art => art.id === id)?.dimensions).toBe('18 × 24 in.');
  expect(studioSizes.map(size => [size.width,size.height,size.priceCents])).toEqual([[9,12,4500],[12,16,9500]]);
});

it('renders all 15 verified records with the correct artwork, designation, dimensions and canonical URL', () => {
  for (const record of certificateRecords) {
    const artwork = forestCollection.artworks.find(art => art.id === record.artworkId)!;
    const rendered = view(record);
    expect(screen.getByRole('heading',{level:1,name:artwork.title})).toBeTruthy();
    expect(screen.getByText(record.dimensions)).toBeTruthy();
    expect(screen.getByText(record.medium ?? 'Awaiting artist confirmation')).toBeTruthy();
    expect(rendered.container.querySelector('.coa-artwork img')?.getAttribute('alt')).toContain(artwork.title);
    expect(screen.getByRole('link',{name:'Experience in Augmented Reality'}).getAttribute('href')).toBe(`${record.path}?ar=1`);
    expect(metadata(record.path).url).toBe(record.source.qrUrl);
    expect(metadata(record.path.slice(0,-1)).url).toBe(record.source.qrUrl);
    expect(metadata(record.path).graph[0].identifier).toBe(record.reference);
    expect(rendered.container.querySelectorAll('a[href$=".pdf"],input')).toHaveLength(0);
    cleanup();
  }
});
