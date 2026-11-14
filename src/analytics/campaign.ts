/** Owner-approved outreach convention (2026-11-14); never accept arbitrary text. */
export type Campaign = {
  campaign_source: 'gallery-outreach' | 'collector-outreach';
  campaign_medium: 'email';
  campaign_name: 'forest-flowers-2026';
  campaign_content?: string;
};
const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
export function approvedCampaign(search: string): Campaign | null {
  // Bound parsing work too; oversized or ambiguous inputs fail closed.
  if (search.length > 2048) return null;
  const query = new URLSearchParams(search);
  if (keys.some(key => query.getAll(key).length > 1)) return null;
  const source = query.get('utm_source');
  if ((source !== 'gallery-outreach' && source !== 'collector-outreach') ||
      query.get('utm_medium') !== 'email' || query.get('utm_campaign') !== 'forest-flowers-2026') return null;
  const content = query.get('utm_content');
  if (content !== null) {
    const prefix = source === 'gallery-outreach' ? 'gallery' : 'outreach';
    if (content.length !== prefix.length + 4 || !new RegExp(`^${prefix}-(?!000$)[0-9]{3}$`).test(content)) return null;
  }
  return { campaign_source: source, campaign_medium: 'email', campaign_name: 'forest-flowers-2026',
    ...(content !== null ? { campaign_content: content } : {}) };
}
/** Called only AFTER consent. Browser navigation timing retains the document's
 * landing URL across SPA navigation; we do not capture/store queries beforehand. */
export function landingCampaign(): Campaign | null {
  const navigation = performance.getEntriesByType?.('navigation')[0];
  try {
    const landing = new URL(navigation?.name ?? window.location.href);
    if (landing.origin !== window.location.origin) return null;
    return approvedCampaign(landing.search);
  } catch { return null; }
}
