import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { ForestArtwork } from './types';
import { forestCollection as data } from './collection';
import { closerLook } from './closerLook';
import { BotanicalFall } from '../components/BotanicalFall';
import './PrivateForest.css';
import { FullscreenArtworkViewer } from './FullscreenArtworkViewer';
import { ForestPhotograph as Photograph } from './ForestPhotograph';
import { primaryForestImage } from './types';
const base = '/collections/forest-and-flowers';
function artworkInquiryUrl(artwork: ForestArtwork) {
  return `mailto:vudiphothisukart@gmail.com?subject=${encodeURIComponent('Artwork inquiry — ' + artwork.title)}`;
}
function Inquiry({ artwork }: { artwork: ForestArtwork }) {
  return artwork.availability === 'not-for-sale' ? <p className="private-availability">{artwork.availabilityNote}</p> : <div><p className="private-availability">{artwork.availabilityNote}</p><a className="text-link" href={artworkInquiryUrl(artwork)}>Inquire for Pricing</a></div>;
}
export function ForestCollection() {
  const { artworkSlug } = useParams();
  const location = useLocation();
  const [sequence, setSequence] = useState(0);
  const artwork = data.artworks.find(a => a.slug === artworkSlug);
  const title = artwork ? `${artwork.title} | Forest & Flowers` : artworkSlug ? 'Painting not found' : data.title;
  const summary = artwork?.description[0] ?? data.introduction[0];

  useEffect(() => {
    const oldTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const oldDescription = description?.getAttribute('content');
    document.title = `${title} | Vudi Phothisuk Art`;
    description?.setAttribute('content', summary);
    return () => {
      document.title = oldTitle;
      if (oldDescription != null) description?.setAttribute('content', oldDescription);
      else description?.removeAttribute('content');
    };
  }, [title, summary]);
  useEffect(() => { setSequence(0); }, [location.pathname]);

  return <section className="private-forest section page">
      <div className="forest-private-toolbar"><Link className="text-link" to={artworkSlug ? base : '/collections'}>{artworkSlug ? 'Back to collection' : 'All collections'}</Link></div>
      {artworkSlug ? artwork ? <ForestArtworkEditorial key={artwork.id} artwork={artwork}/> : <div><h1>Painting not found</h1><Link to={base}>View the collection</Link></div> : <>
        <header className="private-forest-intro"><p className="eyebrow">Collection</p><h1>{data.title}</h1>{data.introduction.map((p,index) => <p key={index}>{p}</p>)}<button className="text-link" onClick={() => setSequence(n => n + 1)}>A moment in the forest</button>{sequence > 0 && <BotanicalFall key={sequence} particles={[{ assetId:'leaf-green', left:'6%', duration:3.2, delay:0, displayWidth:25 },{ assetId:'petal-tiger-lily', left:'92%', drift:-30, duration:3.4, delay:.4, displayWidth:26 }]} distance="280px"/>}</header>
        <div className="private-forest-gallery">
          {data.artworks.map(art => (
            <article key={art.id} className="forest-exhibit" aria-labelledby={`forest-exhibit-${art.id}`}>
              <Link className="forest-overview-image" to={`${base}/${art.slug}`} aria-label={`View ${art.title}`}>
                <Photograph image={primaryForestImage(art)} sizes="(max-width: 800px) 90vw, 55vw"/>
              </Link>
              <div className="forest-overview-copy">
                <Link to={`${base}/${art.slug}`}><h2 id={`forest-exhibit-${art.id}`}>{art.title}</h2></Link>
                <p>{art.dimensions ?? 'Dimensions to be confirmed'}</p>
                {art.description.slice(0, art.id === 'mother-nature' ? 1 : 2).map(paragraph => <p className="forest-featured-excerpt" key={paragraph}>{paragraph}</p>)}
                <Inquiry artwork={art}/>
                <Link className="text-link forest-artwork-link" to={`${base}/${art.slug}`}>View painting</Link>
              </div>
            </article>
          ))}
        </div>
      </>}
  </section>;
}


const motherNatureChapters = [
  {
    imageId: 'mother-nature-angle-img-8275',
    title: 'The Hidden Goddess',
    description: 'The goddess is not immediately revealed. Her profile emerges from the surrounding foliage, inviting the viewer to look beyond the landscape and discover the presence hidden within it.',
  },
  {
    imageId: 'mother-nature-angle-img-8272',
    title: 'Sculpted by Nature',
    description: 'Leaves, vines, and flowers extend beyond the painted surface, transforming the canvas into a dimensional landscape. Organic plaster and layered textures create an interplay between painting and sculpture.',
  },
  {
    imageId: 'mother-nature-angle-img-8269',
    title: 'Where Two Worlds Meet',
    description: 'The painted river draws the eye into the distance while sculpted foliage emerges toward the viewer. Together, these contrasting depths blur the boundary between the landscape and the living presence within it.',
  },
];

function ForestArtworkEditorial({ artwork }: { artwork: ForestArtwork }) {
  const hero = primaryForestImage(artwork);
  const isMotherNature = artwork.id === 'mother-nature';
  const details = artwork.images.filter(image => image.role === 'detail');
  const position = data.artworks.indexOf(artwork) + 1;
  const previous = data.artworks[position - 2];
  const next = data.artworks[position];
  const chapters = closerLook[artwork.id] ?? [];
  const [openPhoto, setOpenPhoto] = useState<number | null>(null);

  function renderPhoto(imageId: string, label: string, finale = false, caption?: string) {
    const index = artwork.images.findIndex(image => image.id === imageId);
    const image = artwork.images[index];
    if (!image) return null;

    return <figure key={imageId} className={finale ? 'forest-editorial-finale' : 'forest-editorial-chapter-photo'}>
      <button type="button" className="forest-editorial-photo" aria-label={`Enlarge ${label}`} onClick={() => setOpenPhoto(index)}>
        <Photograph image={image} sizes={finale ? '(max-width: 600px) 100vw, (max-width: 1500px) 86vw, 1290px' : '(max-width: 600px) 94vw, (max-width: 800px) 86vw, (max-width: 1500px) 46vw, 690px'}/>
      </button>
      {(caption ?? (finale ? label : undefined)) && <figcaption>{caption ?? label}</figcaption>}
    </figure>;
  }

  return <article className="forest-editorial">
    <div className="forest-editorial-opening">
      <header className="forest-editorial-title">
        <p className="eyebrow forest-editorial-number">{String(position).padStart(2, '0')} / {data.artworks.length} — Forest &amp; Flowers</p>
        <h1>{artwork.title}</h1>
        <p>{artwork.dimensions ?? 'Dimensions to be confirmed'}</p>
        <p className="forest-editorial-mobile-medium">{artwork.medium ?? 'Medium to be confirmed'}</p>
      </header>
      <figure className="forest-editorial-hero">
        <button type="button" className="forest-editorial-photo" aria-label={`Enlarge ${artwork.title}`} onClick={() => setOpenPhoto(artwork.images.indexOf(hero))}>
          <Photograph image={hero} eager sizes="(max-width: 600px) 100vw, (max-width: 800px) 86vw, 56vw"/>
        </button>
        <figcaption className="forest-editorial-hero-caption">
          <span>Full composition</span>
          <button className="text-link forest-enlarge-link" type="button" onClick={() => setOpenPhoto(artwork.images.indexOf(hero))}>Enlarge artwork</button>
          <span className="forest-editorial-mobile-hint" aria-hidden="true">Tap the photograph to enlarge</span>
        </figcaption>
      </figure>
      <div className="forest-editorial-facts">
        <div className="forest-editorial-desktop-facts">
          <p>{artwork.medium ?? 'Medium to be confirmed'}</p>
        </div>
        <section className="forest-editorial-story" aria-labelledby="forest-artwork-story">
          <h2 id="forest-artwork-story">About the painting</h2>
          {artwork.copyStatus === 'provisional' && <p className="private-copy-note">Provisional description — pending artist approval.</p>}
          {artwork.description.slice(0, 2).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {artwork.description.length > 2 && <aside aria-label="Conservation pledge">
            {artwork.description.slice(2).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </aside>}
        </section>
      </div>
    </div>
    {(isMotherNature || details.length > 0) && <section className="forest-editorial-details" aria-labelledby="forest-artwork-details">
      <header className="forest-editorial-detail-heading">
        <h2 id="forest-artwork-details">Closer look</h2>
      </header>
      {isMotherNature ? <>
      {motherNatureChapters.map(({ imageId, title, description }) => (
        <section className="forest-editorial-chapter" key={imageId} aria-labelledby={`${imageId}-title`}>
          <div className="forest-editorial-chapter-copy">
            <h3 id={`${imageId}-title`}>{title}</h3>
            <p>{description}</p>
          </div>
          {renderPhoto(imageId, title)}
        </section>
      ))}
      {renderPhoto('mother-nature-angle-img-8264', 'Flowers in Relief', true)}
      </> : <>
        {details.slice(0, chapters.length).map((image, index) => (
          <section className="forest-editorial-chapter" key={image.id} aria-labelledby={`${image.id}-title`}>
            <div className="forest-editorial-chapter-copy">
              <h3 id={`${image.id}-title`}>{chapters[index].title}</h3>
              <p>{chapters[index].description}</p>
            </div>
            {renderPhoto(image.id, `${artwork.title}: ${image.caption ?? 'detail'}`, false, image.caption)}
          </section>
        ))}
        {details.length > chapters.length && <div className="forest-editorial-targets forest-editorial-continuation">
          {details.slice(chapters.length).map(image => renderPhoto(image.id, `${artwork.title}: ${image.caption ?? 'detail'}`, false, image.caption))}
        </div>}
      </>}
    </section>}
    {openPhoto !== null && <FullscreenArtworkViewer title={artwork.title} images={artwork.images} initialIndex={openPhoto} onClose={() => setOpenPhoto(null)}/>}
    <footer className="forest-acquisition">
      <section className="forest-acquisition-inquiry" aria-labelledby="forest-artwork-inquiry">
        <p className="eyebrow">Original artwork</p>
        {artwork.availability === 'not-for-sale' ? (
          <p className="private-availability" id="forest-artwork-inquiry">Not for Sale</p>
        ) : <>
          <h2 id="forest-artwork-inquiry">Interested in {artwork.title}?</h2>
          <p>For availability, pricing, and acquisition inquiries.</p>
          <a className="forest-acquisition-action" href={artworkInquiryUrl(artwork)}>
            Inquire About This Artwork
          </a>
        </>}
      </section>
      <nav className={`forest-acquisition-navigation${previous && next ? ' has-both-neighbors' : ''}`} aria-label="More paintings">
        {previous && <ArtworkNeighbor artwork={previous} direction="previous"/>}
        <div className="forest-acquisition-collection">
          <p className="eyebrow">Explore the collection</p>
          <Link to={base}>View the Full Collection</Link>
        </div>
        {next && <ArtworkNeighbor artwork={next} direction="next"/>}
      </nav>
    </footer>
  </article>;
}


function ArtworkNeighbor({ artwork, direction }: { artwork: ForestArtwork; direction: 'previous' | 'next' }) {
  const label = direction === 'previous' ? 'Previous artwork' : 'Next artwork';
  return <div className={`forest-acquisition-${direction}`}>
    <p className="eyebrow">{label}</p>
    <Link className="forest-acquisition-next-link" to={`${base}/${artwork.slug}`} aria-label={`${label}: ${artwork.title}`}>
      <Photograph image={{ ...primaryForestImage(artwork), alt: '' }} sizes="72px"/>
      <span>
        <span className="forest-acquisition-next-title">
          {direction === 'previous' && <span className="forest-acquisition-arrow forest-acquisition-arrow-back" aria-hidden="true"/>}
          {artwork.title}
          {direction === 'next' && <> <span className="forest-acquisition-arrow" aria-hidden="true"/></>}
        </span>
        <span className="forest-acquisition-next-description">View the {direction} artwork</span>
      </span>
    </Link>
  </div>;
}
