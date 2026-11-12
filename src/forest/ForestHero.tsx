import './ForestHero.css';

export function ForestHero() {
  return <section className="forest-collection-hero" aria-labelledby="forest-hero-title">
    <img src="/atmosphere/forest-and-flowers.png" alt="" fetchPriority="high"/>
    <div className="forest-collection-hero-copy">
      <p className="ocean-eyebrow">A tribute to the natural world</p>
      <h1 id="forest-hero-title">Forest &amp; Flowers.</h1>
      <p className="ocean-deck">An encounter with life, texture, and light.</p>
      <a className="ocean-explore" href="#forest-collection-intro">Explore the collection <span aria-hidden="true">↓</span></a>
    </div>
  </section>;
}
