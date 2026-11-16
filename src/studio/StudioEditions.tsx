import { Link } from 'react-router-dom';
import { ForestPhotograph } from '../forest/ForestPhotograph';
import { primaryForestImage } from '../forest/types';
import { studioArtwork, studioCollectionBundle, studioEditionFor, studioEditions, studioEditionTerms, studioPrice, type StudioEdition } from './editions';
import './StudioEditions.css';
const collectionPath = '/collections/forest-and-flowers';
const pendingDetails = 'Paper, dimensions and production details will be confirmed before ordering opens.';
function PriceStatus({ bundle = false }: { bundle?: boolean }) {
  return <div className="studio-price-status"><span className="studio-price">{studioPrice(bundle ? studioCollectionBundle.priceCents : studioEditionTerms.priceCents)}</span><span className="studio-status">{studioEditionTerms.status}</span></div>;
}
function ContributionIntention({ edition }: { edition: StudioEdition }) {
  if (!edition.contribution) return null;
  const contribution = edition.contribution;
  return <p className="studio-contribution">Planned contribution: {contribution.percentOfProfit}% of profit intended for {contribution.beneficiary ?? 'a veterans foundation (beneficiary to be confirmed)'}. Final terms and the profit calculation await approval.</p>;
}
function EditionCard({ edition }: { edition: StudioEdition }) {
  const artwork = studioArtwork(edition);
  const path = `${collectionPath}/${artwork.slug}/#studio-edition`;
  return <article className="studio-edition-card" aria-labelledby={`${edition.id}-title`}>
    <Link className="studio-edition-image" to={path} aria-label={`View Studio Edition information for ${artwork.title}`}>
      <ForestPhotograph image={{ ...primaryForestImage(artwork), alt: `${artwork.title} artwork photograph, previewing a Studio Edition reproduction.` }} sizes="(max-width:700px) 86vw, (max-width:1000px) 40vw, 27vw"/>
    </Link>
    <div className="studio-edition-copy"><p className="studio-edition-kind">{studioEditionTerms.label}</p><h3 id={`${edition.id}-title`}><Link to={path}>{artwork.title}</Link></h3><PriceStatus/>
      <p className="studio-edition-description">{studioEditionTerms.description}</p><ContributionIntention edition={edition}/>
      <Link className="text-link studio-details-link" to={path}>View edition details</Link>
    </div>
  </article>;
}
export function StudioEditions() {
  return <section className="studio-editions" id="studio-editions" aria-labelledby="studio-editions-title">
    <header className="studio-section-intro"><p className="eyebrow">Forest &amp; Flowers · Reproductions</p><h2 id="studio-editions-title">Studio Editions</h2><p>A selection of Forest &amp; Flowers paintings, offered as unsigned, open-edition fine art prints. Each Studio Edition is a reproduction, separate from the original painting.</p><p className="studio-pending-details">Artwork photographs are shown for reference, not finished print mockups. {pendingDetails}</p></header>
    <div className="studio-editions-grid">{studioEditions.map(edition => <EditionCard key={edition.id} edition={edition}/>)}</div>
    <aside className="studio-bundle" aria-labelledby="studio-bundle-title"><div><p className="eyebrow">Planned five-print collection</p><h3 id="studio-bundle-title">{studioCollectionBundle.title}</h3><p>The five Studio Editions together. Five prints for {studioPrice(studioCollectionBundle.priceCents)}.</p></div><PriceStatus bundle/></aside>
  </section>;
}
export function ArtworkStudioEdition({ artworkId }: { artworkId: string }) {
  const edition = studioEditionFor(artworkId);
  if (!edition) return null;
  const artwork = studioArtwork(edition);
  return <section className="studio-edition-panel" id="studio-edition" aria-labelledby="studio-edition-heading">
    <div><p className="eyebrow">Studio Editions</p><h2 id="studio-edition-heading">{studioEditionTerms.label}</h2><p>An unsigned, open-edition reproduction of <em>{artwork.title}</em>.</p>
      {artwork.availability === 'not-for-sale' ? <p className="studio-original-note">The original painting is Not for Sale. This Studio Edition is a separate reproduction.</p> : <p className="studio-original-note">The original painting and its acquisition information remain separate.</p>}
      <p className="studio-pending-details">{pendingDetails}</p><ContributionIntention edition={edition}/>
      <Link className="text-link studio-details-link" to="/available-art/#studio-editions">Explore all Studio Editions</Link>
    </div><PriceStatus/>
  </section>;
}
