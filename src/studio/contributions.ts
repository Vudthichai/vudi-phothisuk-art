export const junglekeepersUrl = 'https://www.junglekeepers.org';

/** Artist-confirmed profit commitments with explicit product scope; no payment automation. */
export type ContributionIntention = {
  percentOfProfit: number;
  beneficiary: string | null;
  cause: 'veterans' | 'rainforest conservation';
  heading: string;
  status: 'artist-confirmed';
  appliesTo: readonly ('original' | 'studio-print' | 'bundle-share')[];
};
export const studioContributions: Record<string, ContributionIntention> = {
  '75-leaves': { percentOfProfit: 75, beneficiary: null, cause: 'veterans', heading: 'Giving Back', status: 'artist-confirmed', appliesTo: ['studio-print', 'bundle-share'] },
  'a-forest-forgotten': { percentOfProfit: 20, beneficiary: 'Junglekeepers', cause: 'rainforest conservation', heading: 'Art for Conservation', status: 'artist-confirmed', appliesTo: ['original', 'studio-print', 'bundle-share'] },
};
export function contributionStatement(giving: ContributionIntention, includeOriginal = false) {
  const subject = includeOriginal && giving.appliesTo.includes('original') ? 'this original artwork and its Studio Prints' : 'this Studio Print';
  return giving.cause === 'veterans'
    ? `${giving.percentOfProfit}% of profits from this Studio Print will support a veterans foundation, honoring those who served. The recipient organization will be announced.`
    : `${giving.percentOfProfit}% of profits from ${subject} will be donated to ${giving.beneficiary} in support of rainforest conservation.`;
}
export function contributionCardLine(giving: ContributionIntention) {
  return `${giving.percentOfProfit}% of profits support ${giving.cause}`;
}

export function contributionSummary(giving: ContributionIntention) {
  return giving.cause === 'veterans'
    ? `${giving.percentOfProfit}% of profits from this Studio Print will support a veterans foundation. Recipient to be announced.`
    : contributionStatement(giving);
}
