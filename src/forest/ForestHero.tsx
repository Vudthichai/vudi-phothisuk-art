import './ForestHero.css';

export function ForestHero() {
  return <section className="forest-collection-hero" aria-labelledby="forest-hero-title">
    <img src="/atmosphere/forest-bluebells-1920.webp" srcSet="/atmosphere/forest-bluebells-768.webp 768w, /atmosphere/forest-bluebells-1280.webp 1280w, /atmosphere/forest-bluebells-1920.webp 1920w" sizes="(max-width:700px) max(100vw, 816px, calc(160svh - 176px)), max(100vw, 896px, calc(160svh - 184px))" width="1920" height="1200" alt="" fetchPriority="high"/>
    <div className="forest-collection-hero-copy">
      <p className="ocean-eyebrow">A tribute to the natural world</p>
      <h1 id="forest-hero-title">Forest &amp; Flowers.</h1>
      <p className="ocean-deck">An encounter with life, texture, and light.</p>
      <a className="ocean-explore" href="#forest-collection-intro">Explore the collection <span aria-hidden="true">↓</span></a>
    </div>
  </section>;
}
