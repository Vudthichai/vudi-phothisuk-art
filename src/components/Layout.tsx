import { ForestDecorations } from './ForestDecorations';
import './MobileNavigation.css';
import { Footer } from './Footer';
import { useState } from 'react';
import { collections } from '../data';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
export function Layout() {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const query = window.matchMedia?.('(max-width:700px)');
    setCompact(query?.matches ?? false);
    const update = () => { if (query?.matches && document.getElementById('primary-nav')?.contains(document.activeElement)) menuButton.current?.focus(); setCompact(query?.matches ?? false); setOpen(false); setCollectionsOpen(false); };
    query?.addEventListener?.('change', update);
    return () => query?.removeEventListener?.('change', update);
  }, []);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const collectionMenu = useRef<HTMLDivElement>(null);
  const collectionButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent | MouseEvent) {
      const target = event.target as Node;
      if (!collectionMenu.current?.contains(target)) setCollectionsOpen(false);
      if (compact && open && !navPanel.current?.contains(target) && !menuButton.current?.contains(target)) {
        setOpen(false);
        setCollectionsOpen(false);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (compact && open) { setOpen(false); setCollectionsOpen(false); menuButton.current?.focus(); }
      else if (collectionsOpen) { setCollectionsOpen(false); collectionButton.current?.focus(); }
    }
    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('click', dismiss, true);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss, true); document.removeEventListener('click', dismiss, true); document.removeEventListener('keydown', escape); };
  }, [collectionsOpen, open, compact]);
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => { setOpen(false); setCollectionsOpen(false); if (first.current) { first.current = false; return; } main.current?.focus(); window.scrollTo(0, 0); }, [location.pathname]);
  return <><a className="skip-link" href="#main">Skip to content</a><header id="page-top" tabIndex={-1} className={location.pathname === '/' ? 'site-header home-header' : location.pathname === '/collections/oceans' ? 'site-header ocean-header' : 'site-header'}><Link className="brand" to="/" aria-label="Vudi Phothisuk Art — Home"><img className="home-signature" src="/brand/vudi-signature.png" width="1040" height="623" alt="Vudi Phothisuk"/></Link><button ref={menuButton} className="menu-toggle" aria-expanded={open} aria-controls="primary-nav" onClick={() => { if (open) menuButton.current?.focus(); setOpen(!open); setCollectionsOpen(false); }}>Menu {open ? '−' : '+'}</button><div ref={navPanel} className={`nav-panel ${open ? 'is-open' : ''}`} inert={compact && !open} aria-hidden={compact && !open}><nav id="primary-nav" className={open ? 'navigation open' : 'navigation'} aria-label="Main navigation" onClick={event => { if ((event.target as Element).closest('a[href]')) { setOpen(false); setCollectionsOpen(false); if (compact) main.current?.focus({ preventScroll: true }); } }}><div className="navigation-links"><div className="collections-menu" ref={collectionMenu}><button ref={collectionButton} className="collections-trigger" aria-expanded={collectionsOpen} aria-controls="collections-dropdown" onClick={() => setCollectionsOpen(!collectionsOpen)}>Collections</button><div id="collections-dropdown" className={collectionsOpen ? 'collections-dropdown expanded' : 'collections-dropdown'} aria-hidden={!collectionsOpen} inert={!collectionsOpen}><div>{collections.map(collection => <NavLink end key={collection.slug} to={`/collections/${collection.slug}`}>{collection.name}{!(collection.artworkCount ?? collection.artworks.length) && <small>Coming soon</small>}</NavLink>)}</div></div></div><NavLink to="/available-art">Available Art</NavLink><NavLink to="/about">About</NavLink><NavLink to="/exhibitions">Exhibitions</NavLink><NavLink to="/contact">Contact</NavLink></div></nav>{compact && open && (location.pathname === '/' || location.pathname === '/collections/forest-and-flowers') && <ForestDecorations/>}</div></header><main id="main" tabIndex={-1} ref={main}><Outlet/></main><Footer/></>;
}
