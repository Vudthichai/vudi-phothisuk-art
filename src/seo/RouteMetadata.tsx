import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { metadata } from './catalog';

/** Keep canonical, social and structured metadata correct after client navigation too. */
export function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const data = metadata(pathname);
    document.title = data.title;
    const set = (selector: string, element: string, attrs: Record<string, string>) => {
      let node = document.head.querySelector(selector);
      if (!node) { node = document.createElement(element); document.head.append(node); }
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    };
    const meta = (attr: 'name' | 'property', key: string, content: string) => set(`meta[${attr}="${key}"]`, 'meta', { [attr]: key, content });
    meta('name', 'description', data.description);
    if (data.indexable) {
      document.querySelector('meta[name="robots"][content="noindex"]')?.remove();
      set('link[rel="canonical"]', 'link', { rel: 'canonical', href: data.url });
    } else {
      document.querySelector('link[rel="canonical"]')?.remove();
      meta('name', 'robots', 'noindex');
    }
    document.head.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]').forEach(node => node.remove());
    if (data.social) {
      for (const [key, value] of Object.entries({ type: 'website', site_name: 'Vudi Phothisuk Art', url: data.url, title: data.title, description: data.description, image: data.social.image, 'image:type': 'image/jpeg', 'image:width': '1200', 'image:height': '630', 'image:alt': data.social.alt })) meta('property', `og:${key}`, value);
      for (const [key, value] of Object.entries({ card: 'summary_large_image', title: data.title, description: data.description, image: data.social.image, 'image:alt': data.social.alt })) meta('name', `twitter:${key}`, value);
    }
    document.getElementById('page-schema')?.remove();
    if (data.indexable) {
      const script = document.createElement('script'); script.id = 'page-schema'; script.type = 'application/ld+json'; script.textContent = JSON.stringify(data.jsonLd); document.head.append(script);
    }
  }, [pathname]);
  return null;
}
