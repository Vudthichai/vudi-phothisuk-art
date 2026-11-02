import { useState } from 'react';
import { collections } from '../data';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
export function Layout() {
  const [open, setOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const collectionMenu = useRef<HTMLDivElement>(null);
  const collectionButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) { if (!collectionMenu.current?.contains(event.target as Node)) setCollectionsOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape' && collectionsOpen) { setCollectionsOpen(false); collectionButton.current?.focus(); } }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [collectionsOpen]);
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => { setOpen(false); setCollectionsOpen(false); if (first.current) { first.current = false; return; } main.current?.focus(); window.scrollTo(0, 0); }, [location.pathname]);
  return <><a className="skip-link" href="#main">Skip to content</a><header className={location.pathname === '/' ? 'site-header home-header' : location.pathname === '/collections/oceans' ? 'site-header ocean-header' : 'site-header'}><Link className="brand" to="/" aria-label="Vudi Phothisuk Art — Home">{location.pathname === '/' ? <img className="home-signature" src="/brand/vudi-signature.png" width="1040" height="623" alt="Vudi Phothisuk"/> : <>Vudi Phothisuk<span>ART & SENSORY EXPERIENCES</span></>}</Link><button className="menu-toggle" aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen(!open)}>Menu {open ? '−' : '+'}</button><nav id="primary-nav" className={open ? 'navigation open' : 'navigation'} aria-label="Main navigation"><div className="collections-menu" ref={collectionMenu}><button ref={collectionButton} className="collections-trigger" aria-expanded={collectionsOpen} aria-controls="collections-dropdown" onClick={() => setCollectionsOpen(!collectionsOpen)}>Collections</button><div id="collections-dropdown" className={collectionsOpen ? 'collections-dropdown expanded' : 'collections-dropdown'} aria-hidden={!collectionsOpen} inert={!collectionsOpen}><div>{collections.map(collection => <Link key={collection.slug} to={`/collections/${collection.slug}`}>{collection.name}{!collection.artworks.length && <small>Coming soon</small>}</Link>)}</div></div></div><NavLink to="/available-art">Available Art</NavLink><NavLink to="/about">About</NavLink><NavLink to="/exhibitions">Exhibitions</NavLink><NavLink to="/contact">Contact</NavLink></nav></header><main id="main" tabIndex={-1} ref={main}><Outlet/></main><footer className="site-footer"><Link className="footer-name" to="/">Vudi Phothisuk Art</Link><p>Textured paintings. Sensory experiences.</p><span>Website in development</span></footer></>;
}
