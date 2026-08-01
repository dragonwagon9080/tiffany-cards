export interface SearchContext {
  title: string;
  year: string;
  player: string;
  cardNumber: string;
  brand: string;
  cardId: string;
  slug?: string;
}

export type MatchType =
  | "same-card"
  | "same-set"
  | "same-year"
  | "same-player";

export interface MatchResult {
  matchType: MatchType;
  matchLabel: string;
  score: number;
  reasons: string[];
}

export interface StrictMatchResult {
  accepted: boolean;
  score: number;
  confidence: number;
  reasons: string[];
  missingReasons: string[];
}

export interface EbayPrice {
  value: string;
  currency: string;
}

export interface ListingFingerprint {
  listingId: string;
  legacyListingId: string;
  seller: string;
  certNumber: string;
  serialNumber: string;
  imageId: string;
}

export interface EbayListing {
  id: string;
  legacyItemId: string;

  title: string;
  image: string;
  url: string;

  marketplace: "eBay";

  seller: string;
  endDate: string;

  buyingOptions: string[];
  condition: string;

  price: EbayPrice;

  score: number;
  confidence: number;

  matchType: MatchType;
  matchLabel: string;
  reasons: string[];

  certNumber: string;
  serialNumber: string;
  imageId: string;

  fingerprint: ListingFingerprint;
  fingerprintHash: string;

  registryUrl: string;
}

export interface CachedToken {
  value: string;
  expiresAt: number;
}