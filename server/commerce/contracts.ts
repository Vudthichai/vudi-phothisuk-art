/** Future server-only contracts, not an active backend or selected supplier.
 * Never import private bindings or production-file keys into browser components.
 */
export type Money = { amountCents: number; currency: string };
export type VariantSelection = { productId: string; sizeId: string; finishId: string | null; frameId: string | null };
export type SupplierBinding = {
  variant: VariantSelection;
  providerKey: string;
  supplierProductId: string;
  supplierVariantId: string;
  productionAssetKey: string; // Opaque private vault key, never a public URL.
  supportedCountryCodes: readonly string[];
};
export type OrderState = 'payment-pending' | 'paid' | 'submission-pending' | 'submitted' | 'in-production' | 'shipped' | 'delivered' | 'canceled' | 'refunded' | 'needs-review';
export type FulfillmentOrder = { id: string; idempotencyKey: string; state: OrderState; lines: readonly { variant: VariantSelection; quantity: number }[] };
export type TrackingUpdate = { orderId: string; providerEventId: string; state: OrderState; trackingUrl?: string; carrier?: string };
export type ReplacementRequest = { originalOrderId: string; lineId: string; reason: 'damaged' | 'lost' | 'incorrect'; evidenceKeys: readonly string[]; approval: 'pending' | 'approved' | 'declined'; idempotencyKey: string };
export type ContributionEntry = { orderId: string; productId: string; allocatedRevenue: Money; approvedCosts: Money; refundAdjustments: Money; beneficiaryKey: string | null; status: 'terms-pending' | 'review' | 'approved' | 'transferred' };
export interface FutureFulfillmentAdapter {
  submitPaidOrder(order: FulfillmentOrder, privateBindings: readonly SupplierBinding[]): Promise<{ supplierOrderId: string }>;
  normalizeVerifiedTrackingEvent(rawEvent: unknown): Promise<TrackingUpdate>;
  submitApprovedReplacement(request: ReplacementRequest): Promise<{ supplierOrderId: string }>;
}
// No adapter, credentials, vault entries, product mappings, API endpoints or orders exist.
