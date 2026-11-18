// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudioEditions } from './studio/StudioEditions';
import { studioCollectionBundle, studioEditions } from './studio/editions';
afterEach(cleanup);
it('presents both size bundles with confirmed retail values, prices and savings, without checkout or placeholders',()=>{
 const {container}=render(<MemoryRouter><StudioEditions/></MemoryRouter>);
 const options=[...container.querySelectorAll('.studio-bundle-option')];
 expect(options).toHaveLength(2);
 for(const [i,amounts] of [[0,['$200','$175','$25']],[1,['$475','$425','$50']]] as const){
  amounts.forEach(amount=>expect(options[i].textContent).toContain(amount));
  expect(within(options[i] as HTMLElement).getByText('Coming Soon')).toBeTruthy();
 }
 expect(studioCollectionBundle.galleryWallImage).toBeNull();
 expect(container.querySelector('.studio-bundle-gallery')).toBeNull();
 expect(container.querySelector('form,a[href*="checkout"]')).toBeNull();
 expect(container.textContent).not.toMatch(/buy four|get one free/i);
});
it('records auditable proportional revenue weights and defers profit/donation calculations',()=>{
 const expected=[[20000,17500,2500,4000],[47500,42500,5000,9500]];
 studioCollectionBundle.options.forEach((bundle,i)=>{
  const [retail,price,savings,weight]=expected[i];
  expect([bundle.retailValueCents,bundle.priceCents,bundle.savingsCents]).toEqual([retail,price,savings]);
  expect(bundle.revenueAllocation.lines.map(l=>l.editionId)).toEqual(studioEditions.map(e=>e.id));
  expect(bundle.revenueAllocation.lines.map(l=>l.weightCents)).toEqual(Array(5).fill(weight));
  expect(bundle.revenueAllocation.lines.reduce((sum,l)=>sum+l.weightCents,0)).toBe(bundle.revenueAllocation.denominatorCents);
  expect(bundle.revenueAllocation.lines.find(l=>l.artworkId==='75-leaves')?.contribution).toMatchObject({percentOfProfit:75,beneficiary:null});
  expect(bundle.revenueAllocation.lines.find(l=>l.artworkId==='a-forest-forgotten')?.contribution).toMatchObject({percentOfProfit:20,beneficiary:'Junglekeepers'});
  expect(bundle.profitCalculation.status).toBe('blocked-pending-confirmed-expenses');
  expect(bundle.profitCalculation.requiredInputs).toEqual(['productionCosts','paymentFees','fulfillmentExpenses']);
  expect(bundle).not.toHaveProperty('donationAmount');
 });
});
