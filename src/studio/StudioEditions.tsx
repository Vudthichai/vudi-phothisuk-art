import { contributionCardLine } from './contributions';
import { Link } from 'react-router-dom';
import { studioGallery, studioPrimaryImage } from './gallery';
import { ForestPhotograph } from '../forest/ForestPhotograph';
import { studioArtwork, studioCollectionBundle, studioEditionFor, studioEditions, studioEditionTerms, studioPrice, studioBase, studioProductPath, type StudioEdition } from './editions';
import { useStudioCheckout } from './StudioCheckout';
import './StudioEditions.css';

function PriceStatus({ available = false }: { available?: boolean }) {
  return <p className="studio-price-status"><span className="studio-price">Starting at {studioPrice(studioEditionTerms.priceCents)}</span><span aria-hidden="true">—</span><span className="studio-status">{available ? 'Available to order' : studioEditionTerms.status}</span></p>;
}
export function EditionCard({ edition, identifyPrint = true, available = false }: { edition: StudioEdition; identifyPrint?: boolean; available?: boolean }) {
  const artwork = studioArtwork(edition);
  const path = studioProductPath(edition);
  const lifestyle = studioGallery(edition).find(view => view.kind === 'lifestyle');
  return <article className="studio-edition-card" aria-labelledby={`${edition.id}-title`}>
    <Link className={`studio-edition-image${lifestyle ? ' has-lifestyle' : ''}`} to={path} aria-label={`View Studio Edition information for ${artwork.title}`}>
      <ForestPhotograph image={studioPrimaryImage(edition)} sizes="(max-width:700px) 86vw, (max-width:1000px) 40vw, 27vw"/>{lifestyle && <span className="studio-card-lifestyle" aria-hidden="true"><ForestPhotograph image={{...lifestyle.image,alt:''}} sizes="(max-width:700px) 86vw, 27vw"/></span>}
    </Link>
    <div className="studio-edition-copy"><h3 id={`${edition.id}-title`}><Link to={path}>{artwork.title}</Link></h3>{identifyPrint && <p className="studio-card-identification">Studio Print</p>}<PriceStatus available={available}/>{edition.contribution && <p className="studio-card-giving">{contributionCardLine(edition.contribution)}</p>}</div>
  </article>;
}
export function StudioEditions({ title = 'Studio Editions', listingLink = true }: { title?: string; listingLink?: boolean }) {
  const access = useStudioCheckout(false);
  const available = Boolean(access && !access.invite);
  return <section className="studio-editions" id="studio-editions" aria-labelledby="studio-editions-title">
    <header className="studio-section-intro"><h2 id="studio-editions-title">{title}</h2>{listingLink && <Link className="text-link" to={studioBase}>View all Studio Editions</Link>}</header>
    <div className="studio-editions-grid">{studioEditions.map(edition => <EditionCard key={edition.id} edition={edition} available={available}/>)}</div>
    <aside className="studio-bundle" aria-labelledby="studio-bundle-title">
      <h3 id="studio-bundle-title">{studioCollectionBundle.title}</h3>
      {studioCollectionBundle.galleryWallImage && <figure className="studio-bundle-gallery"><ForestPhotograph image={studioCollectionBundle.galleryWallImage} sizes="86vw"/></figure>}
      <div className="studio-bundle-options">{studioCollectionBundle.options.map(option => <section className="studio-bundle-option" key={option.id} aria-labelledby={option.id}>
        <h4 id={option.id}>{option.sizeLabel.replace(' inches', '')} Collection Bundle</h4>
        <p>Buy 4, get 1 free. Includes all five Forest &amp; Flowers Studio Prints in {option.sizeLabel}.</p>
        <p className="studio-bundle-retail">Individual retail value: {studioPrice(option.retailValueCents)}</p>
        <p className="studio-price-status"><span className="studio-price">{studioPrice(option.priceCents)}</span><span aria-hidden="true">—</span><span className="studio-status">{option.status}</span></p>
        <p className="studio-bundle-savings">Save {studioPrice(option.savingsCents)}</p>
      </section>)}</div>
    </aside>
  </section>;
}
export function ArtworkStudioEdition({ artworkId }: { artworkId: string }) {
  const edition = studioEditionFor(artworkId);
  if (!edition) return null;
  const artwork = studioArtwork(edition);
  return <section className="studio-edition-panel" id="studio-edition" aria-labelledby="studio-edition-heading">
    <Link to={studioProductPath(edition)} className="studio-preview-image" aria-label={`View ${artwork.title} Studio Edition`}><ForestPhotograph image={studioPrimaryImage(edition)} sizes="(max-width:700px) 35vw, 200px"/></Link>
    <div><p className="eyebrow">Also available as a print</p><h2 id="studio-edition-heading">{artwork.title} — Studio Edition</h2><PriceStatus/><Link className="text-link" to={studioProductPath(edition)}>View Studio Edition</Link></div>
  </section>;
}
