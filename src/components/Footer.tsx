import { Link } from 'react-router-dom';

export function Footer() {
  return <footer className="site-footer">
    <Link className="footer-name" to="/">Vudi Phothisuk Art</Link>
    <p>Make some art today.</p>
    <nav className="footer-navigation" aria-label="Footer navigation">
      <Link to="/collections">Collections</Link>
      <Link to="/available-art">Available Art</Link>
      <Link to="/about">About</Link>
      <Link to="/exhibitions">Exhibitions</Link>
      <Link to="/contact">Contact</Link>
    </nav>
    <a className="back-to-top" href="#page-top" onClick={event => {
      event.preventDefault();
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      document.getElementById('page-top')?.focus({ preventScroll: true });
    }}>Back to top <span aria-hidden="true">↑</span></a>
  </footer>;
}
