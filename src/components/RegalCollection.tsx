import { Link } from 'react-router-dom';
import type { Collection } from '../data';
import './RegalCollection.css';

export function RegalCollection({ collection }: { collection: Collection }) {
  const navy = collection.artworks.find(art => art.slug === 'navy')!;
  return <div className="regal-collection">
    <section className="regal-intro" aria-labelledby="regal-title">
      <img className="regal-hero-texture" src={navy.images!.find(image => image.role === 'detail')!.src} alt="" fetchPriority="high"/>
      <div className="regal-intro-copy"><Link className="regal-back" to="/collections">← All collections</Link><p className="eyebrow">Vudi Phothisuk / Selected works</p><h1 id="regal-title">The Regal<br/>Collection.</h1><p className="regal-lead">A world within the surface.</p><a className="text-link" href="#regal-works">Discover the paintings <span aria-hidden="true">↓</span></a></div>
    </section>
    <section className="regal-statement" id="regal-works"><div><p className="eyebrow">The collection</p><h2>Presence meets<br/><em>purpose.</em></h2></div><div><p>This collection is a journey through memory and emotion. Each piece is a singular moment—an invitation to step into worlds of refined texture, shadows, and color. These are not just paintings, but lived experiences and learned values.</p><p className="regal-artist-line">“It’s sovereignty framed in paint and texture.”</p></div></section>
    <div className="regal-works">{collection.artworks.map((art,i)=><article className={`regal-work regal-work-${art.slug}`} id={`regal-${art.slug}`} key={art.id} aria-labelledby={`regal-heading-${art.slug}`}>
      <Link className="regal-work-image" to={`/collections/regal-collection/${art.slug}`} aria-label={`View ${art.title}`}><img src={art.image.src} srcSet={art.image.srcSet} sizes="(max-width:700px) 86vw, 40vw" alt={art.image.alt} width={art.image.width} height={art.image.height} loading="lazy" decoding="async"/></Link>
      <div className="regal-work-copy"><p className="eyebrow">0{i+1} / The Regal Collection</p><h2 id={`regal-heading-${art.slug}`}><Link to={`/collections/regal-collection/${art.slug}`}>{art.title}</Link></h2><p className="regal-work-meta">{art.dimensions}{art.availability==='sold'&&<span>Sold</span>}</p><p>{art.description?.[0]}</p><p>{art.description?.[1]}</p><Link className="text-link" to={`/collections/regal-collection/${art.slug}`}>Explore the painting <span aria-hidden="true">↗</span></Link></div>
    </article>)}</div>
    <section className="regal-close"><p className="eyebrow">A closer connection</p><h2>A painting.<br/><em>A personal presence.</em></h2><p>For artwork inquiries or a conversation about the collection.</p><a className="text-link" href="mailto:vudiphothisukart@gmail.com?subject=The%20Regal%20Collection">Get in touch →</a><Link className="regal-return" to="/collections">Explore all collections →</Link></section>
  </div>;
}
