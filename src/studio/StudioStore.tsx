import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { NotFound } from '../pages/Pages';
import { ForestPhotograph } from '../forest/ForestPhotograph';
import { FullscreenArtworkViewer } from '../forest/FullscreenArtworkViewer';
import { studioGallery } from './gallery';
import { StudioPrintNavigation } from './StudioPrintNavigation';
import { StudioEditions } from './StudioEditions';
import { studioArtwork, studioBase, studioEditionFor, studioEditionTerms, studioPrice, studioSizes } from './editions';
import './StudioStore.css';
export function StudioListing() {
  return <section className="section page studio-store"><nav className="studio-breadcrumbs" aria-label="Studio navigation"><Link to="/available-art">Available Art</Link><Link to="/collections/forest-and-flowers">Forest &amp; Flowers</Link></nav><p className="eyebrow">Forest &amp; Flowers</p><h1>Studio Editions</h1><StudioEditions title="The collection" listingLink={false}/></section>;
}
export function StudioProduct() {
  const { productSlug } = useParams();
  const edition = studioEditionFor(productSlug ?? '');
  if (!edition) return <NotFound/>;
  return <Product key={edition.id} edition={edition}/>;
}
function Product({ edition }: { edition: NonNullable<ReturnType<typeof studioEditionFor>> }) {
  const artwork = studioArtwork(edition);
  const [size, setSize] = useState(studioSizes[0].id);
  const views = studioGallery(edition, size);
  const [viewIndex, setViewIndex] = useState(0);
  const image = views[viewIndex].image;
  const [open, setOpen] = useState(false);
  const selected = studioSizes.find(option => option.id === size)!;
  return <section className="section page studio-store">
    <nav className="studio-breadcrumbs" aria-label="Studio navigation"><Link to={studioBase}>Studio Editions</Link><Link to="/available-art">Available Art</Link><Link to="/collections/forest-and-flowers">Forest &amp; Flowers</Link></nav>
    <div className="studio-product-layout"><div className="studio-product-gallery"><button type="button" className="studio-product-image" aria-label={`Enlarge ${artwork.title} ${views[viewIndex].label.toLowerCase()}`} onClick={() => setOpen(true)}><ForestPhotograph image={image} eager sizes="(max-width:700px) 86vw, 52vw"/></button><p className="studio-gallery-caption">{views[viewIndex].label}{views[viewIndex].kind !== 'clean' && views[viewIndex].kind !== 'reference' && ` · ${selected.label}`}</p><button type="button" className="text-link studio-inspect" onClick={() => setOpen(true)}>Inspect print detail</button>{views.length > 1 && <div className="studio-gallery-views" role="group" aria-label="Print views">{views.map((view,index) => <button key={view.id} type="button" aria-pressed={index === viewIndex} onClick={() => setViewIndex(index)}><ForestPhotograph image={{...view.image,alt:''}} sizes="100px"/><span>{view.label}</span></button>)}</div>}</div>
      <div className="studio-product-copy"><p className="eyebrow">Studio Edition</p><h1>{artwork.title}</h1><p className="studio-product-price">Starting at {studioPrice(studioEditionTerms.priceCents)} <span>· Coming Soon</span></p>
        <fieldset className="studio-size-options"><legend>Print size</legend>{studioSizes.map(option => <label key={option.id}><input type="radio" name="print-size" value={option.id} checked={size === option.id} onChange={() => { setSize(option.id); setViewIndex(0); }}/><span>{option.label}</span></label>)}</fieldset>
        <p className="studio-size-note" aria-live="polite">{selected.label}. Size-specific pricing to be confirmed.</p>
        <Link className="text-link" to={`/collections/forest-and-flowers/${artwork.slug}/`}>View the original artwork</Link>
      </div>
    </div>
    <StudioPrintNavigation edition={edition}/>
    {open && <FullscreenArtworkViewer title={`${artwork.title} Studio Edition`} images={views.map(view => view.image)} initialIndex={viewIndex} onClose={() => setOpen(false)}/>}
  </section>;
}
