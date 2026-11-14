import { metadata, findPage } from '../seo/catalog';
import { collections } from '../data';
import { forestCollection } from '../forest/collection';
import { measurementId, productionEligible, privacySignal } from './config';

type Parameters = Record<string, string | boolean>;
type Command = unknown[];
declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}
const disabledKey = `ga-disable-${measurementId}` as const;
let initialized = false;
let tagLoaded = false;
let allowed = false;
let lastPath: string | null = null;
let previousUrl = '';

/** Resolve only known catalog records. Never read mailto subjects, link text or user input. */
export function routeIdentity(path: string) {
  const page = findPage(path);
  if (!page) return null;
  const segments = page.path.split('/').filter(Boolean);
  const collection = collections.find(c => c.slug === segments[1]);
  const art = segments[0] === 'collections' && segments.length === 3 ?
    (collection?.slug === 'forest-and-flowers' ? forestCollection.artworks : collection?.artworks)?.find(a => a.slug === segments[2]) : undefined;
  return { page, collection, art };
}
function safeExternalReferrer() {
  try { const url = new URL(document.referrer); return url.origin === window.location.origin ? '' : url.origin + '/'; }
  catch { return ''; }
}
function command(...args: Command) { window.gtag?.(...args); }
function initialize(path: string) {
  const data = metadata(path);
  window.dataLayer ??= [];
  window.gtag = function () { window.dataLayer!.push(arguments); };
  // Basic consent mode: no tag, requests or event queue before explicit acceptance.
  command('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  command('set', 'ads_data_redaction', true);
  command('set', 'url_passthrough', false);
  command('js', new Date());
  command('consent', 'update', { analytics_storage: 'granted' });
  command('config', measurementId, {
    send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
    page_location: data.indexable ? data.url : 'https://vudiphothisukart.com/',
    page_referrer: safeExternalReferrer(), page_title: data.indexable ? data.title : 'Page not found',
    cookie_flags: 'SameSite=Lax;Secure',
  });
  const script = document.createElement('script');
  script.id = 'vpa-google-tag'; script.async = true; script.referrerPolicy = 'origin';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.onload = () => { tagLoaded = true; };
  document.head.append(script);
  initialized = true;
}
export function setTrackingConsent(granted: boolean) {
  allowed = granted && productionEligible() && !privacySignal();
  if (!allowed) {
    window[disabledKey] = true;
    if (initialized) {
      // Discard unsent manual events if consent is withdrawn while the tag is still loading.
      const queue = window.dataLayer;
      if (!tagLoaded && queue) for (let i = queue.length - 1; i >= 0; i--) if (queue[i][0] === 'event') queue.splice(i, 1);
      command('consent', 'update', { analytics_storage: 'denied' });
    }
    // Remove only this property's first-party GA cookies, including domain variants.
    for (const name of ['_ga', `_ga_${measurementId.slice(2).replaceAll('-', '_')}`]) {
      for (const domain of ['', window.location.hostname, '.' + window.location.hostname]) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure${domain ? '; Domain=' + domain : ''}`;
      }
    }
    lastPath = null;
    previousUrl = '';
  } else {
    window[disabledKey] = false;
    if (initialized) command('consent', 'update', { analytics_storage: 'granted' });
  }
}
function enabled() { return allowed && productionEligible() && !privacySignal(); }
function emit(name: string, params: Parameters) {
  if (enabled()) command('event', name, { ...params, send_to: measurementId });
}
export function trackRoute(path: string) {
  if (!enabled()) return;
  const identity = routeIdentity(path);
  // Unknown URLs may contain names/emails. Do not send their paths or titles.
  if (!identity) {
    lastPath = null; previousUrl = 'https://vudiphothisukart.com/404/';
    if (initialized) command('set', { page_location: 'https://vudiphothisukart.com/404/', page_title: 'Page not found', page_referrer: '' });
    return;
  }
  if (lastPath === identity.page.path) return;
  if (!initialized) initialize(identity.page.path);
  const data = metadata(identity.page.path);
  const referrer = previousUrl || safeExternalReferrer();
  command('set', { page_location: data.url, page_title: data.title, page_referrer: referrer });
  lastPath = identity.page.path;
  previousUrl = data.url;
  emit('page_view', { page_location: data.url, page_title: data.title, page_referrer: referrer });
  if (identity.art && identity.collection) emit('artwork_view', { artwork_id: identity.art.id, collection_id: identity.collection.slug });
  else if (identity.collection) emit('collection_view', { collection_id: identity.collection.slug });
  else if (identity.page.path === '/exhibitions/') emit('exhibition_interest', { exhibition_id: 'forest-and-flowers-2026-12-05', interest_action: 'view' });
}
export function trackInquiry(artworkPath: string, sourcePath: string) {
  const art = routeIdentity(artworkPath);
  const source = findPage(sourcePath);
  if (!source || !art?.art || !art.collection) return;
  emit('artwork_inquiry_click', { artwork_id: art.art.id, collection_id: art.collection.slug, source_page: source.path });
}
