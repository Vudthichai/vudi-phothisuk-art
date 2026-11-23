/** Migration review data only; intentionally not imported into the React application. */
export type StableId = `${'art' | 'col' | 'img'}_${string}`;
export interface Artwork {
  id: StableId;
  collectionIds: StableId[];
  title: string;
  sourceUrl: string;
  originalPath: string;
  sourceStatus: 'retrieved' | 'rate-limited-not-retrieved' | 'prior-public-inspection-caption-recapture-needed';
  membershipEvidence: { sourceUrl: string; linkedPath: string | null; titleText: string; note?: string };
  /** Original DOM paragraph text. Do not trim, normalize punctuation or silently correct. */
  descriptionParagraphsVerbatim: string[];
  technicalTextVerbatim: string | null;
  dimensionsVerbatim: string | null;
  mediumVerbatim: string | null;
  sales: {
    displayedPrice: string | null;
    currency: string | null;
    availabilityText: string | null;
    status: 'sold' | 'unknown';
    inquiryTextVerbatim: string[];
    observedAt: string | null;
  };
  imageIds: StableId[];
  approvedExhibitionDescription: { text: string; source: string; approvedAt: string } | null;
  missing: string[];
  reviewStatus: 'needs-owner-review';
}
export interface Collection {
  id: StableId;
  name: string;
  sourceUrl: string | null;
  status: 'observed' | 'not-found-in-inspected-navigation-and-sitemap';
  descriptionBlocksVerbatim: string[];
  artworkIds: StableId[];
}
export interface Catalog {
  schemaVersion: 1;
  status: 'partial-rate-limited';
  collections: Collection[];
  artworks: Artwork[];
}
export interface ImageReference {
  id: StableId;
  url: string;
  sourceKind: 'website-reference';
  metadata: Record<string, string>;
  sourceUrls: string[];
  binaryDownloaded: false;
  quality: 'unverified';
  preferredOriginalId: StableId | null;
}
export interface ImageMatch {
  artworkId: StableId;
  imageId: StableId;
  confidence: 'confirmed-page-association';
  evidence: { sourceUrl: string; locator: string };
  role: 'unconfirmed';
  visualMatchVerified: false;
  placementApproved: false;
}
