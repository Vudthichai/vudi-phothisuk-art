import { Link } from 'react-router-dom';
import './Exhibitions.css';

export function ExhibitionsPage() {
  return <section className="exhibitions-page" aria-labelledby="exhibition-title">
    <div className="exhibition-copy">
    <header className="exhibition-heading">
      <p className="eyebrow">Exhibitions</p>
      <h1 id="exhibition-title">Forest &amp; Flowers</h1>
      <p className="exhibition-lead">I'm returning to Field Day, where I previously exhibited The Oceans Collection, to share a new chapter of my work: Forest &amp; Flowers.</p>
    </header>
    <div className="exhibition-body">
      <aside className="exhibition-details" aria-label="Exhibition details">
        <p className="eyebrow">At Field Day</p>
        <p><time dateTime="2026-12-05">December 5, 2026</time><br/><span>4:00–7:00 PM</span></p>
        <address>Field Day<br/><span>3706 Butler Street<br/>Lawrenceville, Pittsburgh, PA 15201</span></address>
      </aside>
      <div className="exhibition-synopsis">
        <h2>A closer look at the natural world.</h2>
        <p>Forest &amp; Flowers explores the hidden beauty of the natural world through sculptural texture, layered color, and changing light.</p>
        <p>Inspired by the forests, flowers, and landscapes that surround us, the collection invites viewers to look beyond what is immediately visible. From dense woodland shadows to unexpected blooms, each painting captures moments of discovery, growth, and the quiet beauty found in nature.</p>
        <Link className="text-link" to="/collections/forest-and-flowers">Explore Forest &amp; Flowers</Link>
      </div>
    </div>
    </div>
    <figure className="exhibition-venue">
      <img className="exhibition-venue-photo" src="/venues/field-day/exterior-960.webp" srcSet="/venues/field-day/exterior-640.webp 640w, /venues/field-day/exterior-960.webp 960w, /venues/field-day/exterior-1440.webp 1440w" sizes="(max-width: 800px) 86vw, (max-width: 1467px) 48vw, 704px" width="2365" height="1577" alt="Field Day’s brick exterior with two blue entrances and large industrial windows in Lawrenceville, Pittsburgh." fetchPriority="high" decoding="async"/>
      <figcaption><span className="exhibition-venue-mark"><img src="/venues/field-day/logo.png" alt="Field Day" width="558" height="358"/></span></figcaption>
    </figure>
  </section>;
}
