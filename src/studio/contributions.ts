/** Intentions only; wording, beneficiaries and accounting await approval. Never initiate transfers. */
export type ContributionIntention = { percentOfProfit: number; beneficiary: string | null; status: 'pending-approval' };
export const studioContributions: Record<string, ContributionIntention> = {
  '75-leaves': { percentOfProfit: 75, beneficiary: null, status: 'pending-approval' },
  'a-forest-forgotten': { percentOfProfit: 20, beneficiary: 'Junglekeepers', status: 'pending-approval' },
};
