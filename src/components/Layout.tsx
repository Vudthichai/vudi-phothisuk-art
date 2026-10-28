import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => { setOpen(false); if (first.current) { first.current = false; return; } main.current?.focus(); window.scrollTo(0, 0); }, [location.pathname]);
  return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><Link className="brand" to="/">Vudi Phothisuk<span>ART & SENSORY EXPERIENCES</span></Link><button className="menu-toggle" aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen(!open)}>Menu {open ? '−' : '+'}</button><nav id="primary-nav" className={open ? 'navigation open' : 'navigation'} aria-label="Main navigation"><NavLink to="/collections">Collections</NavLink><NavLink to="/available-art">Available Art</NavLink><NavLink to="/about">About</NavLink><NavLink to="/exhibitions">Exhibitions</NavLink><NavLink to="/contact">Contact</NavLink></nav></header><main id="main" tabIndex={-1} ref={main}><Outlet/></main><footer className="site-footer"><Link className="footer-name" to="/">Vudi Phothisuk Art</Link><p>Textured paintings. Sensory experiences.</p><span>Website in development</span></footer></>;
}
