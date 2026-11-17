import { Link } from 'react-router-dom';
import { ForestPhotograph } from '../forest/ForestPhotograph';
import { studioArtwork, studioCollectionBundle, studioEditionFor, studioEditions, studioEditionTerms, studioPrice, studioPrintImage, studioBase, studioProductPath, type StudioEdition } from './editions';
import './StudioEditions.css';

function PriceStatus({ bundle = false }: { bundle?: boolean }) {
  return <p className="studio-price-status"><span className="studio-price">{!bundle && 'Starting at '}{studioPrice(bundle ? studioCollectionBundle.priceCents : studioEditionTerms.priceCents)}</span><span aria-hidden="true">—</span><span className="studio-status">{studioEditionTerms.status}</span></p>;
}
function EditionCard({ edition }: { edition: StudioEdition }) {
  const artwork = studioArtwork(edition);
  const path = studioProductPath(edition);
  return <article className="studio-edition-card" aria-labelledby={`${edition.id}-title`}>
    <Link className="studio-edition-image" to={path} aria-label={`View Studio Edition information for ${artwork.title}`}>
      <ForestPhotograph image={studioPrintImage(edition)} sizes="(max-width:700px) 86vw, (max-width:1000px) 40vw, 27vw"/>
    </Link>
    <div className="studio-edition-copy"><h3 id={`${edition.id}-title`}><Link to={path}>{artwork.title}</Link></h3><PriceStatus/></div>
  </article>;
}
export function StudioEditions({ title = 'Studio Editions', listingLink = true }: { title?: string; listingLink?: boolean }) {
  return <section className="studio-editions" id="studio-editions" aria-labelledby="studio-editions-title">
    <header className="studio-section-intro"><h2 id="studio-editions-title">{title}</h2>{listingLink && <Link className="text-link" to={studioBase}>View all Studio Editions</Link>}</header>
    <div className="studio-editions-grid">{studioEditions.map(edition => <EditionCard key={edition.id} edition={edition}/>)}</div>
    <aside className="studio-bundle" aria-labelledby="studio-bundle-title"><h3 id="studio-bundle-title">{studioCollectionBundle.title}</h3><PriceStatus bundle/></aside>
  </section>;
}
export function ArtworkStudioEdition({ artworkId }: { artworkId: string }) {
  const edition = studioEditionFor(artworkId);
  if (!edition) return null;
  const artwork = studioArtwork(edition);
  return <section className="studio-edition-panel" id="studio-edition" aria-labelledby="studio-edition-heading">
    <Link to={studioProductPath(edition)} className="studio-preview-image" aria-label={`View ${artwork.title} Studio Edition`}><ForestPhotograph image={studioPrintImage(edition)} sizes="(max-width:700px) 35vw, 200px"/></Link>
    <div><p className="eyebrow">Also available as a print</p><h2 id="studio-edition-heading">{artwork.title} — Studio Edition</h2><PriceStatus/><Link className="text-link" to={studioProductPath(edition)}>View Studio Edition</Link></div>
  </section>;
}
