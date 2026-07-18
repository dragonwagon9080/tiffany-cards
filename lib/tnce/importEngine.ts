import { parseAuctionTitle } from "./auctionParser";
import { findVariationInTitle } from "./variationMatcher";

export type ImportListingInput = {
  title: string;
  variations?: string[];
};

export type ImportListingResult = {
  serialNumber: string;
  grade: string;
  gradingCompany: string;
  variation: string;
};

export function importListing(
  input: ImportListingInput
): ImportListingResult {
  const parsed = parseAuctionTitle(input.title);

  return {
    serialNumber: parsed.serialNumber,
    grade: parsed.grade,
    gradingCompany: parsed.gradingCompany,

    variation: findVariationInTitle(
      input.title,
      input.variations || []
    ),
  };
}