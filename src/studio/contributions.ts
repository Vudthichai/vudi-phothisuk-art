/** Artist-confirmed commitments for Studio Print profits only; no payment automation. */
export type ContributionIntention = {
  percentOfProfit: number;
  beneficiary: string | null;
  cause: 'veterans' | 'rainforest conservation';
  heading: string;
  status: 'artist-confirmed';
};
export const studioContributions: Record<string, ContributionIntention> = {
  '75-leaves': { percentOfProfit: 75, beneficiary: null, cause: 'veterans', heading: 'Giving Back', status: 'artist-confirmed' },
  'a-forest-forgotten': { percentOfProfit: 20, beneficiary: 'Junglekeepers', cause: 'rainforest conservation', heading: 'Art for Conservation', status: 'artist-confirmed' },
};
export function contributionStatement(giving: ContributionIntention) {
  return giving.cause === 'veterans'
    ? `${giving.percentOfProfit}% of profits from this Studio Print will support a veterans foundation, honoring those who served. The recipient organization will be announced.`
    : `${giving.percentOfProfit}% of profits from this Studio Print will be donated to ${giving.beneficiary} in support of rainforest conservation.`;
}
export function contributionCardLine(giving: ContributionIntention) {
  return `${giving.percentOfProfit}% of profits support ${giving.cause}`;
}
