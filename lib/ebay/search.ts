const EBAY_SEARCH_URL =
  "https://api.ebay.com/buy/browse/v1/item_summary/search";

const EBAY_CAMPAIGN_ID =
  process.env.EBAY_CAMPAIGN_ID ||
  "5339176379";

export interface EbaySearchOptions {
  limit?: number;

  /**
   * Optional eBay Browse API filter.
   *
   * Examples:
   * buyingOptions:{AUCTION}
   * itemLocationCountry:US
   */
  filter?: string;

  /**
   * Defaults to EXTENDED because the auction monitor
   * needs seller, bid and ending information.
   */
  fieldgroups?: string;
}

/**
 * Searches eBay's Browse API.
 */
export async function searchEbay(
  token: string,
  query: string,
  affiliateReference: string,
  options:
    | EbaySearchOptions
    | number = {}
) {
  const normalizedOptions:
    EbaySearchOptions =
      typeof options === "number"
        ? {
            limit: options,
          }
        : options;

  const {
    limit = 20,
    filter = "",
    fieldgroups = "EXTENDED",
  } = normalizedOptions;

  const cleanQuery =
    String(query || "")
      .replace(/\s+/g, " ")
      .trim();

  if (!cleanQuery) {
    return [];
  }

  const url =
    new URL(
      EBAY_SEARCH_URL
    );

  url.searchParams.set(
    "q",
    cleanQuery.slice(
      0,
      200
    )
  );

  url.searchParams.set(
    "limit",
    String(
      Math.max(
        1,
        Math.min(
          limit,
          200
        )
      )
    )
  );

  if (fieldgroups) {
    url.searchParams.set(
      "fieldgroups",
      fieldgroups
    );
  }

  if (filter) {
    url.searchParams.set(
      "filter",
      filter
    );
  }

  const safeAffiliateReference =
    String(
      affiliateReference ||
        "rpa-tracker"
    )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        ""
      )
      .slice(
        0,
        100
      ) ||
    "rpa-tracker";

  const response =
    await fetch(
      url.toString(),
      {
        headers: {
          Authorization:
            `Bearer ${token}`,

          "X-EBAY-C-MARKETPLACE-ID":
            "EBAY_US",

          "X-EBAY-C-ENDUSERCTX":
            `affiliateCampaignId=${EBAY_CAMPAIGN_ID},affiliateReferenceId=${safeAffiliateReference}`,
        },

        cache: "no-store",
      }
    );

  const text =
    await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `eBay search returned invalid JSON: ${text.slice(
        0,
        300
      )}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.errors?.[0]
        ?.longMessage ||
        data?.errors?.[0]
          ?.message ||
        "eBay search failed."
    );
  }

  return Array.isArray(
    data.itemSummaries
  )
    ? data.itemSummaries
    : [];
}