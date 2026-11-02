import { Link, useParams } from 'react-router-dom';
import './Home.css';
import { useEffect } from 'react';
import { collections, findCollection, informationPages } from '../data';
import { Gallery, ArtworkViews } from '../components/Gallery';
import { RegalCollection } from '../components/RegalCollection';
import { OceanCollection } from '../components/OceanCollection';
export function PageMeta({ title, description }: { title: string; description: string }) {
  useEffect(() => { document.title = `${title} | Vudi Phothisuk Art`; document.querySelector('meta[name="description"]')?.setAttribute('content', description); }, [title, description]);
  return null;
}
export function CollectionLinks() { return <div className="collection-list">{[...collections].sort((a,b) => Number(Boolean(b.artworks.length)) - Number(Boolean(a.artworks.length))).map(collection => <Link key={collection.slug} to={`/collections/${collection.slug}`}><h3>{collection.name}</h3><span className="collection-status">{collection.artworks.length ? `${collection.artworks.length} artworks` : collection.slug === 'forest-and-flowers' ? 'Photography in preparation' : 'In preparation'}</span><span aria-hidden="true">→</span></Link>)}</div>; }
export function Home() {
  const regal = findCollection('regal-collection')!;
  const navy = regal.artworks.find(art => art.slug === 'navy')!;
  const ocean = findCollection('oceans')!.artworks.find(art => art.slug === 'the-oceans')!;
  const carnations = regal.artworks.find(art => art.slug === 'carnations')!;
  const featured = [
    { slug: 'oceans', title: 'The Oceans', image: ocean.image, description: 'Shorelines, breaking waves, and the movement of water, held in sculptural texture.' },
    { slug: 'regal-collection', title: 'The Regal Collection', image: carnations.image, description: 'Memory and emotion, expressed through layered color, carved contours, and metallic light.' },
  ];
  return <div className="home-portfolio">
    <PageMeta title="Home" description="Textured paintings and sensory experiences by Vudi Phothisuk. Explore The Oceans and The Regal Collection."/>
    <section className="home-opening" aria-labelledby="home-title">
      <figure className="home-hero-image"><Link to="/collections/regal-collection/navy" aria-label="Explore Navy"><img src={navy.image.src} srcSet={navy.image.srcSet} sizes="100vw" width={navy.image.width} height={navy.image.height} alt="Detail of Navy: sweeping blue, teal, ivory, and gold ridges of raised paint." fetchPriority="high" decoding="async"/></Link></figure>
      <div className="home-hero-caption"><span>Navy · surface detail</span><Link to="/collections/regal-collection/navy">View the painting <span aria-hidden="true">↗</span></Link></div>
      <div className="home-introduction"><h1 id="home-title">Vudi Phothisuk</h1><div><p>Textured paintings and sensory experiences.</p><a className="text-link" href="#home-collections">Explore the collections <span aria-hidden="true">↓</span></a></div></div>
    </section>
    <section className="home-collections" id="home-collections" aria-labelledby="home-collections-title"><div className="home-section-heading"><h2 id="home-collections-title">Collections</h2><Link className="text-link" to="/collections">View all collections <span aria-hidden="true">↗</span></Link></div><div className="home-collection-grid">{featured.map(collection => <Link className={`home-collection-card home-card-${collection.slug}`} key={collection.slug} to={`/collections/${collection.slug}`}><div className="home-collection-image"><img src={collection.image.src} srcSet={collection.image.srcSet} sizes="(max-width:700px) 86vw, 43vw" width={collection.image.width} height={collection.image.height} alt={collection.image.alt} loading="lazy" decoding="async"/></div><div className="home-card-heading"><h3>{collection.title}</h3><span aria-hidden="true">↗</span></div><p>{collection.description}</p><span className="text-link">Explore the collection</span></Link>)}</div><p className="home-in-progress"><Link to="/collections/forest-and-flowers">Forest & Flowers <span aria-hidden="true">→</span></Link><span>Photography in preparation.</span></p></section>
    <section className="home-artist" aria-labelledby="home-artist-title"><p className="eyebrow">Behind the work</p><div><h2 id="home-artist-title">Meet Vudi.</h2><p>Vudi Phothisuk is a multidisciplinary artist exploring landscape, memory, and emotion through texture and color. His mixed-media paintings combine acrylic and an organic plaster base, building surfaces that catch and change with the light.</p><Link className="text-link" to="/about">About the artist <span aria-hidden="true">↗</span></Link></div></section>
    <nav className="home-inquiry" aria-label="Artwork inquiries"><p>For artwork inquiries and conversations about the work.</p><a className="text-link" href="mailto:vudiphothisukart@gmail.com">Get in touch <span aria-hidden="true">↗</span></a></nav>
  </div>;
}
export function Collections() { return <section className="section page"><PageMeta title="Collections" description="Explore the collections of Vudi Phothisuk Art."/><p className="eyebrow">The portfolio</p><h1>Collections</h1><CollectionLinks/></section>; }
export function CollectionPage() { const { slug = '' } = useParams(); const collection = findCollection(slug); if (!collection) return <NotFound/>; if (slug === 'regal-collection') return <><PageMeta title={collection.name} description={collection.summary}/><RegalCollection collection={collection}/></>; if (slug === 'oceans') return <><PageMeta title={collection.name} description={collection.summary}/><OceanCollection collection={collection}/></>; return <section className="section page"><PageMeta title={collection.name} description={`${collection.name} — a collection by Vudi Phothisuk. ${collection.summary}`}/><Link className="text-link" to="/collections">← All collections</Link><p className="eyebrow">{slug === 'forest-and-flowers' ? 'Photography in preparation' : 'Collection'}</p><h1>{collection.name}</h1><p className="page-intro">{collection.summary}</p><Gallery artworks={collection.artworks}/></section>; }
export function ArtworkPage() {
  const { slug = '', artworkSlug = '' } = useParams();
  const collection = findCollection(slug);
  const artwork = collection?.artworks.find(item => item.slug === artworkSlug);
  if (!collection || !artwork) return <NotFound/>;
  const ordered = [collection.artworks.find(item => item.slug === 'the-oceans'), ...collection.artworks.filter(item => item.slug !== 'the-oceans')].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const index = ordered.findIndex(item => item.id === artwork.id);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  return <section className={`section page artwork-page artwork-theme-${artwork.slug}`}><PageMeta title={artwork.title} description={artwork.description?.[0] ?? artwork.title}/><Link className="text-link" to={`/collections/${slug}`}>← {collection.name}</Link><div className="artwork-detail"><div><img className="artwork-primary" src={artwork.image.src} srcSet={artwork.image.srcSet} sizes="(max-width: 700px) 86vw, 50vw" alt={artwork.image.alt} width={artwork.image.width} height={artwork.image.height} fetchPriority="high" decoding="async"/></div><div className="artwork-story"><p className="eyebrow">{collection.name}</p><h1>{artwork.title}</h1>{artwork.description?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<dl className="artwork-facts">{artwork.dimensions && <><dt>Dimensions</dt><dd>{artwork.dimensions}</dd></>}{artwork.medium && <><dt>Medium</dt><dd>{artwork.medium}</dd></>}</dl>{artwork.availability === 'sold' ? <p className="artwork-status">Sold</p> : <a className="text-link" href={`mailto:vudiphothisukart@gmail.com?subject=${encodeURIComponent(`Artwork inquiry: ${artwork.title}`)}`}>Inquire about this artwork →</a>}</div></div><ArtworkViews artwork={artwork}/><nav className="artwork-pagination" aria-label="Artwork navigation"><div>{previous && <Link to={`/collections/${slug}/${previous.slug}`} rel="prev" aria-label={`Previous painting: ${previous.title}`}><span>← Previous painting</span><strong>{previous.title}</strong></Link>}</div><Link className="text-link" to={`/collections/${slug}`}>View the collection</Link><div>{next && <Link to={`/collections/${slug}/${next.slug}`} rel="next" aria-label={`Next painting: ${next.title}`}><span>Next painting →</span><strong>{next.title}</strong></Link>}</div></nav></section>;
}
export function InformationPage({ page }: { page: keyof typeof informationPages }) { const content = informationPages[page]; return <section className="section page"><PageMeta title={content.title} description={content.description}/><p className="eyebrow">Vudi Phothisuk Art</p><h1>{content.title}</h1><p className="page-intro">{content.description}</p><p className="content-note">This section is being prepared for the new portfolio.</p><Link className="text-link" to="/collections">Explore the collections →</Link></section>; }
export function NotFound() { return <section className="section page"><PageMeta title="Page not found" description="This page could not be found in the Vudi Phothisuk Art portfolio."/><p className="eyebrow">404</p><h1>Page not found.</h1><Link className="button-link" to="/">Return home →</Link></section>; }
