import { Link } from 'react-router-dom';
import { ForestPhotograph } from '../forest/ForestPhotograph';
import { studioArtwork, studioCollectionBundle, studioEditionFor, studioEditions, studioEditionTerms, studioPrice, studioPrintImage, type StudioEdition } from './editions';
import './StudioEditions.css';

const collectionPath = '/collections/forest-and-flowers';
function PriceStatus({ bundle = false }: { bundle?: boolean }) {
  return <p className="studio-price-status"><span className="studio-price">{studioPrice(bundle ? studioCollectionBundle.priceCents : studioEditionTerms.priceCents)}</span><span aria-hidden="true">—</span><span className="studio-status">{studioEditionTerms.status}</span></p>;
}
function EditionCard({ edition }: { edition: StudioEdition }) {
  const artwork = studioArtwork(edition);
  const path = `${collectionPath}/${artwork.slug}/#studio-edition`;
  return <article className="studio-edition-card" aria-labelledby={`${edition.id}-title`}>
    <Link className="studio-edition-image" to={path} aria-label={`View Studio Edition information for ${artwork.title}`}>
      <ForestPhotograph image={studioPrintImage(edition)} sizes="(max-width:700px) 86vw, (max-width:1000px) 40vw, 27vw"/>
    </Link>
    <div className="studio-edition-copy"><h3 id={`${edition.id}-title`}><Link to={path}>{artwork.title}</Link></h3><PriceStatus/></div>
  </article>;
}
export function StudioEditions() {
  return <section className="studio-editions" id="studio-editions" aria-labelledby="studio-editions-title">
    <header className="studio-section-intro"><h2 id="studio-editions-title">Studio Editions</h2></header>
    <div className="studio-editions-grid">{studioEditions.map(edition => <EditionCard key={edition.id} edition={edition}/>)}</div>
    <aside className="studio-bundle" aria-labelledby="studio-bundle-title"><h3 id="studio-bundle-title">{studioCollectionBundle.title}</h3><PriceStatus bundle/></aside>
  </section>;
}
export function ArtworkStudioEdition({ artworkId }: { artworkId: string }) {
  if (!studioEditionFor(artworkId)) return null;
  return <section className="studio-edition-panel" id="studio-edition" aria-labelledby="studio-edition-heading">
    <h2 id="studio-edition-heading">Studio Edition Print</h2><PriceStatus/>
  </section>;
}
