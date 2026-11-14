import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { consentKey, productionEligible, privacySignal, readConsent, type Choice } from './config';
import { setTrackingConsent, trackInquiry, trackRoute } from './tracker';
import './Analytics.css';

/** Mounted after page metadata; an empty SSR render preserves hydration. */
export function Analytics() {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    if (!productionEligible()) return;
    setReady(true);
    const update = () => setChoice(privacySignal() ? 'denied' : readConsent());
    update(); window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);
  useEffect(() => {
    if (!ready) return;
    setTrackingConsent(choice === 'granted');
    if (choice === 'granted') trackRoute(pathname);
  }, [choice, pathname, ready]);
  useEffect(() => {
    if (!ready) return;
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-analytics-artwork]') : null;
      if (target && !event.defaultPrevented && target.getAttribute('href')?.startsWith('mailto:')) {
        trackInquiry(target.dataset.analyticsArtwork!, pathname);
      }
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, [pathname, ready]);
  function choose(value: Choice) {
    // Stop collection synchronously; persistence is optional if storage is blocked.
    const next = privacySignal() ? 'denied' : value;
    setTrackingConsent(next === 'granted');
    try { localStorage.setItem(consentKey, JSON.stringify({ choice: next, time: Date.now() })); } catch { /* session choice still works */ }
    setChoice(next); setSettings(false);
  }
  if (!ready) return null;
  return <>
    <button className="analytics-preferences" type="button" onClick={() => setSettings(open => !open)} aria-expanded={settings || choice === null} aria-controls="analytics-choice">Analytics preferences</button>
    {(choice === null || settings) && <section className="analytics-notice" id="analytics-choice" aria-label="Optional analytics">
      <p>May we use Google Analytics to understand which art and collections visitors explore? If you accept, Google uses analytics cookies and processes usage data. Advertising features stay off. You can decline and keep browsing, or change your choice here at any time.</p>
      <p className="analytics-detail">We exclude inquiry contents and URL queries from the events we send. <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">How Google uses site data</a>.</p>
      <details><summary>Privacy details</summary><p>We store your choice on this device for up to 180 days. After acceptance, Google Analytics uses cookie identifiers and processes device, network, and browsing information to help us understand site use. No advertising consent is requested. Declining or withdrawing consent leaves artwork inquiries available.</p><p>For privacy questions, contact <a href="mailto:vudiphothisukart@gmail.com">vudiphothisukart@gmail.com</a>. Google’s processing and retention settings are described in its linked privacy information.</p></details>
      {privacySignal() ? <p>Your browser’s privacy signal is respected. Analytics stays off.</p> : <div className="analytics-actions"><button type="button" onClick={() => choose('granted')}>Accept analytics</button><button type="button" onClick={() => choose('denied')}>Decline analytics</button></div>}
      {settings && choice !== null && <button className="analytics-close" type="button" onClick={() => setSettings(false)}>Close preferences</button>}
    </section>}
  </>;
}
