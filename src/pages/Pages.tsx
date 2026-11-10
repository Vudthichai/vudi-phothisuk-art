import { MotherNature } from '../components/MotherNature';
import { RegalPreview } from '../components/RegalPreview';
import { AvailableArt } from './AvailableArt';
import { ExhibitionsPage } from './Exhibitions';
import { Link, useParams } from 'react-router-dom';
import './Home.css';
import './Contact.css';
import './About.css';
import { useEffect } from 'react';
import { collections, findCollection, informationPages } from '../data';
import { Gallery, ArtworkViews } from '../components/Gallery';
import { RegalCollection } from '../components/RegalCollection';
import { OceanCollection } from '../components/OceanCollection';
export function PageMeta({ title, description }: { title: string; description: string }) {
  useEffect(() => { document.title = `${title} | Vudi Phothisuk Art`; document.querySelector('meta[name="description"]')?.setAttribute('content', description); }, [title, description]);
  return null;
}
export function CollectionLinks() {
  const entries = collections.map(collection => ({
    collection,
    count: collection.artworkCount ?? collection.artworks.length,
  })).sort((a, b) => Number(Boolean(b.count)) - Number(Boolean(a.count)));
  return <div className="collection-list">{entries.map(({ collection, count }) => (
    <Link key={collection.slug} to={`/collections/${collection.slug}`}>
      <h3>{collection.name}</h3><span className="collection-status">{count ? `${count} artworks` : 'In preparation'}</span><span aria-hidden="true">→</span>
    </Link>
  ))}</div>;
}
export function Home() {
  const ocean = findCollection('oceans')!.artworks.find(art => art.slug === 'the-oceans')!;
  return <div className="forest-home">
    <PageMeta title="Home" description="Make some art today. Explore dimensional mixed-media paintings and the stories behind the work of Vudi Phothisuk."/>
    <section className="forest-opening" aria-labelledby="home-title">
      <div className="forest-masthead"><p>Vudi Phothisuk Art</p><h1 id="home-title"><span className="home-title-reveal">Make some art today.</span></h1><span>Paintings · Texture · Stories</span></div>
      <MotherNature/>
    </section>
    <section className="forest-introduction" aria-labelledby="forest-title"><p className="eyebrow">Forest & Flowers</p><div><h2 id="forest-title">A presence within the forest.</h2><p>A hidden goddess emerges from leaves, vines, and flowers. Beside her, a pale river winds between densely textured mountains.</p><p><em>Mother Nature</em> considers our dependence on the natural world—and the difference between appreciating nature and believing we control it.</p><p className="forest-small">A first look at Forest & Flowers. More paintings and new photography to come.</p></div></section>
    <section className="home-ocean-feature" id="home-paintings" aria-labelledby="home-ocean-title"><Link className="home-ocean-canvas" to="/collections/oceans" aria-label="Explore The Oceans"><img src={ocean.image.src} srcSet={ocean.image.srcSet} sizes="94vw" width={ocean.image.width} height={ocean.image.height} alt={ocean.image.alt} loading="lazy"/></Link><div className="home-ocean-copy"><div className="home-ocean-description"><h2 id="home-ocean-title">The Oceans</h2><p>Shorelines, breaking waves, and the movement of water, held in sculptural texture.</p></div><Link className="text-link" to="/collections/oceans">Explore the collection</Link></div></section>
    <RegalPreview/>
    <section className="forest-closing"><div><img className="forest-monogram" src="/brand/msat-floral.png" alt="Make some art today floral monogram" width="96" height="96" loading="lazy"/><p className="eyebrow">Behind the work</p><h2>Made with depth.<br/>And something to say.</h2><p>I’m Vudi Phothisuk. My paintings bring landscape, memory, and emotion into sculpted surfaces, layered color, and changing light.</p></div><div><p>Curious about a painting, or imagining something personal?</p><a className="text-link" href="mailto:vudiphothisukart@gmail.com?subject=Artwork%20%26%20commission%20conversation">Talk with Vudi</a></div></section>
  </div>;
}
export function Collections() { return <section className="section page"><PageMeta title="Collections" description="Explore the collections of Vudi Phothisuk Art."/><p className="eyebrow">The portfolio</p><h1>Collections</h1><CollectionLinks/></section>; }
export function CollectionPage() { const { slug = '' } = useParams(); const collection = findCollection(slug); if (!collection) return <NotFound/>; if (slug === 'regal-collection') return <><PageMeta title={collection.name} description={collection.summary}/><RegalCollection collection={collection}/></>; if (slug === 'oceans') return <><PageMeta title={collection.name} description={collection.summary}/><OceanCollection collection={collection}/></>; return <section className="section page"><PageMeta title={collection.name} description={`${collection.name} — a collection by Vudi Phothisuk. ${collection.summary}`}/><Link className="text-link" to="/collections">← All collections</Link><p className="eyebrow">{slug === 'forest-and-flowers' ? 'Coming soon' : 'Collection'}</p><h1>{collection.name}</h1><p className="page-intro">{collection.summary}</p><Gallery artworks={collection.artworks}/></section>; }
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
export function ContactPage() {
  return <section className="contact-page" aria-labelledby="contact-title">
    <PageMeta title="Commissions & Contact" description="Contact Vudi Phothisuk about an original painting, a commission, or the story behind the work."/>
    <div className="contact-hero">
      <img className="contact-hero-image" src="/artist/mother-nature-contact-full.jpeg" alt="An angled close-up of Mother Nature, with sculpted orange flowers and green and gold leaves." fetchPriority="high"/>
      <div className="contact-copy"><p className="eyebrow">Commissions & Contact</p><h1 id="contact-title">Let’s talk art.</h1>
        <p className="contact-intro">Have a painting in mind, a question about the work, or an idea for something personal? I’d love to hear from you.</p>
        <a className="contact-email" href="mailto:vudiphothisukart@gmail.com">vudiphothisukart@gmail.com</a>
      </div>
    </div>
    <div className="contact-details">
      <div className="contact-topics">
        <div><h2>A painting you love</h2><p>Include the painting’s title and anything you’d like to know about it.</p><a className="text-link" href="mailto:vudiphothisukart@gmail.com?subject=Artwork%20inquiry">Ask about an artwork</a></div>
        <div><h2>Something personal</h2><p>Tell me about your idea, the space, and any size or timing you have in mind. It’s fine if you’re still figuring it out.</p><a className="text-link" href="mailto:vudiphothisukart@gmail.com?subject=Commission%20conversation">Start a commission conversation</a></div>
      </div>
    </div>
  </section>;
}
export function InformationPage({ page }: { page: keyof typeof informationPages }) { if (page === 'available-art') return <><PageMeta title={informationPages[page].title} description={informationPages[page].description}/><AvailableArt/></>; if (page === 'contact') return <ContactPage/>; if (page === 'about') return <AboutPage/>; if (page === 'exhibitions') return <><PageMeta title="Forest & Flowers — Exhibitions" description={informationPages.exhibitions.description}/><ExhibitionsPage/></>; return <NotFound/>; }
export function NotFound() { return <section className="section page"><PageMeta title="Page not found" description="This page could not be found in the Vudi Phothisuk Art portfolio."/><p className="eyebrow">404</p><h1>Page not found.</h1><Link className="button-link" to="/">Return home →</Link></section>; }

function AboutPage() {
  return <section className="about-page"><PageMeta title="About the Artist" description="Meet Vudi Phothisuk and discover the sculptural texture, layered color, and deliberate form behind his paintings."/><div className="about-copy"><p className="eyebrow">About the artist</p><h1>Life isn’t 2D.<br/>Why should your art be?</h1><p>To me, a painting is not simply something to view — it’s something to feel. It’s a conversation starter, a memory holder, a lived experience embedded in pigment and form.</p><p>My work blends sculptural texture, layered color, and deliberate form, brought to life through collections that act as immersive environments.</p><p>I chase presence over trends and look for purpose in the middle of utility and design.</p><p>I hope the pieces I make offer space to pause — to notice, to reflect, to feel something textured and real, even in a world that rarely allows for it.</p><p className="about-signoff">Vudi Phothisuk</p><Link className="text-link" to="/contact">Let’s talk art</Link></div><img src="/artist/vudi-about.jpg" alt="Vudi Phothisuk holding a textured turquoise shoreline painting" width="1161" height="2035"/></section>;
}
