import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { arForCertificate } from '../ar/config';
import CertificateAR from '../ar/CertificateAR';
import { forestCollection } from '../forest/collection';
import { ForestPhotograph } from '../forest/ForestPhotograph';
import { primaryForestImage } from '../forest/types';
import { JunglekeepersText } from '../components/JunglekeepersText';
import { NotFound } from '../pages/Pages';
import { certificateForPath, certificateOrigin, type CertificateRecord } from './records';
import './CertificatePage.css';

export function CertificatePage() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const [hydrated,setHydrated] = useState(false);
  useEffect(()=>setHydrated(true),[]);
  const closeAR = useCallback(() => { const query=new URLSearchParams(search);query.delete('ar');navigate({pathname,search:query.toString(),hash},{replace:true}); },[pathname,search,hash,navigate]);
  const record = certificateForPath(pathname);
  const experience = record && arForCertificate(record.path);
  return record ? <><CertificateView record={record}/>{hydrated && experience && new URLSearchParams(search).get('ar') === '1' && <CertificateAR experience={experience} onClose={closeAR}/>}</> : <NotFound/>;
}

export function CertificateView({ record }: { record: CertificateRecord }) {
  const artwork = forestCollection.artworks.find(art => art.id === record.artworkId);
  if (!artwork) return <NotFound/>;
  const original = record.designation === 'original';
  const designation = original ? 'Original · 1 of 1' : 'Limited Edition of 20';
  return <article className="section page coa-page">
    <header className="coa-heading">
      <img src="/brand/msat-floral.png" width="48" height="49" alt="MSAT monogram"/>
      <p className="eyebrow">Vudi Phothisuk Art</p>
      <p className="coa-collection">Forest &amp; Flowers — 2026</p>
      <h1>{artwork.title}</h1>
      <p className="coa-designation">{designation}</p>
      {!original && <p className="coa-edition-label">Collector’s Edition</p>}
      {record.reviewStatus === 'replacement-pending' && <p className="coa-update-note">Physical certificate update pending. This permanent artwork URL is unchanged.</p>}
    </header>
    <div className="coa-layout">
      <figure className="coa-artwork"><ForestPhotograph image={primaryForestImage(artwork)} eager sizes="(max-width:700px) 90vw, 48vw"/>{!original && <figcaption>Original painting shown as an artwork reference. This record concerns the Collector’s Edition.</figcaption>}</figure>
      <div className="coa-copy">
        <dl className="coa-facts">
          <div><dt>Artist</dt><dd>Vudi Phothisuk</dd></div>
          <div><dt>Medium</dt><dd>{record.medium ?? 'Awaiting artist confirmation'}</dd></div>
          <div><dt>Physical dimensions</dt><dd>{record.dimensions}</dd></div>
          <div><dt>Digital certificate reference</dt><dd>{record.reference}</dd></div>
        </dl>
        <section aria-labelledby="coa-artwork-story"><h2 id="coa-artwork-story">{original ? 'About the artwork' : 'About the original painting'}</h2>{artwork.copyStatus !== 'provisional' ? artwork.description.slice(0,2).map(text => <p key={text}><JunglekeepersText text={text}/></p>) : <p>The artwork description is awaiting artist confirmation.</p>}</section>
        <section aria-labelledby="coa-authenticity"><h2 id="coa-authenticity">Authenticity record</h2><p>This digital reference records the artwork and certificate reference associated with this permanent URL. It accompanies, and does not replace, the physical certificate.</p>{!original && <p>This page is shared by the edition of 20. It does not identify or verify an individual copy number or owner. Refer to the physical certificate for copy-specific information.</p>}<p className="coa-reference-note">Digital reference only. This page is not a signed physical certificate or proof of ownership.</p></section>
        {record.arUrl ? <a className="coa-ar-link" href={record.arUrl}>Experience in AR</a> : arForCertificate(record.path) && <><Link className="coa-ar-link" to={`${record.path}?ar=1`}>Experience in AR</Link><noscript>AR requires JavaScript. The digital certificate remains available without AR.</noscript></>}
        <details className="coa-digital-record"><summary>View Digital Certificate</summary><div><p className="eyebrow">Digital reference copy</p><h2>{artwork.title}</h2><dl className="coa-facts"><div><dt>Certificate reference</dt><dd>{record.reference}</dd></div><div><dt>Designation</dt><dd>{designation}</dd></div></dl><p>This is an unsigned digital reference record, not a printable replacement for the signed physical certificate. No owner or individual edition number is verified here.</p><a href={record.path}>Permanent certificate URL</a><p className="coa-permanent-url">{certificateOrigin}{record.path}</p></div></details>
        <Link className="text-link coa-return" to="/collections/forest-and-flowers/">Back to Forest &amp; Flowers</Link>
      </div>
    </div>
  </article>;
}
