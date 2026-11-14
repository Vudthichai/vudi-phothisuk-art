import { describe, expect, it } from 'vitest';
import { approvedCampaign } from './analytics/campaign';
const gallery = '?utm_source=gallery-outreach&utm_medium=email&utm_campaign=forest-flowers-2026';
describe('approved non-personal campaign convention', () => {
  it('maps approved UTMs to recognized Google campaign configuration fields', () => {
    expect(approvedCampaign(gallery + '&utm_content=gallery-001')).toEqual({ campaign_source: 'gallery-outreach', campaign_medium: 'email', campaign_name: 'forest-flowers-2026', campaign_content: 'gallery-001' });
    expect(approvedCampaign(gallery.replace('gallery-outreach', 'collector-outreach') + '&utm_content=outreach-999')).toMatchObject({ campaign_source: 'collector-outreach', campaign_content: 'outreach-999' });
    expect(approvedCampaign(gallery)).not.toBeNull();
  });
  it.each(['alice@example.com', 'alice-smith', 'gallery-jane', 'gallery-000', 'gallery-1000', 'gallery-001\n', 'outreach-001', '', 'gallery-001?<script>'])('rejects unapproved/sensitive content %j', content => {
    expect(approvedCampaign(gallery + '&utm_content=' + encodeURIComponent(content))).toBeNull();
  });
  it('rejects personal sources, unapproved campaigns, missing fields and duplicate pollution', () => {
    for (const query of [gallery.replace('gallery-outreach', 'jane-smith'), gallery.replace('forest-flowers-2026', 'private-client'), '?utm_source=gallery-outreach', gallery + '&utm_source=alice@example.com', gallery + '&utm_content=gallery-001&utm_content=gallery-002', '?' + 'x'.repeat(2049)]) expect(approvedCampaign(query)).toBeNull();
  });
  it('discards arbitrary query fields, contact content and advertising click IDs', () => {
    const result = approvedCampaign(gallery + '&utm_content=gallery-001&email=private@example.com&body=secret&gclid=secret&fbclid=secret&utm_term=secret');
    expect(result).toEqual(approvedCampaign(gallery + '&utm_content=gallery-001'));
    expect(JSON.stringify(result)).not.toMatch(/private|secret|gclid|fbclid|utm_term/);
  });
});
