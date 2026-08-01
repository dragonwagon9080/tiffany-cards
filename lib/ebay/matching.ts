import {
  buildFingerprintHash,
  extractCertNumber,
  extractImageId,
  extractSerialNumber,
} from "./extract";

import type {
  EbayListing,
  MatchResult,
  SearchContext,
  StrictMatchResult,
} from "./types";

export function clean(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

export function normalizedText(
  value: unknown
) {
  return clean(value)
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}

export function inferCardNumber(
  title: string
) {
  const match =
    clean(title).match(
      /#\s*([a-z0-9.-]+)/i
    );

  return match?.[1] || "";
}

export function buildContext(
  searchParams:
    URLSearchParams
): SearchContext {
  const title =
    clean(
      searchParams.get(
        "title"
      )
    );

  return {
    title,

    year:
      clean(
        searchParams.get(
          "year"
        )
      ),

    player:
      clean(
        searchParams.get(
          "player"
        )
      ),

    cardNumber:
      clean(
        searchParams.get(
          "cardNumber"
        )
      ) ||
      inferCardNumber(
        title
      ),

    brand:
      clean(
        searchParams.get(
          "brand"
        )
      ),

    cardId:
      clean(
        searchParams.get(
          "cardId"
        )
      ),

    slug:
      clean(
        searchParams.get(
          "slug"
        )
      ),
  };
}

export function uniqueQueries(
  values: string[]
) {
  const seen =
    new Set<string>();

  return values
    .map((value) =>
      clean(value)
    )
    .filter(Boolean)
    .filter((value) => {
      const key =
        value.toLowerCase();

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    });
}

/**
 * Query builder used by the current Similar Cards page.
 *
 * This preserves its broader fallback behavior.
 * The scheduled auction monitor will not use the fallback
 * queries.
 */
export function buildSearchQueries(
  context: SearchContext
) {
  const exactQuery =
    clean(
      [
        context.year,
        context.player,

        context.cardNumber
          ? `#${context.cardNumber}`
          : "",

        context.brand,
      ]
        .filter(Boolean)
        .join(" ")
    );

  const sameSetQuery =
    clean(
      [
        context.player,
        context.brand,
        "trading card",
      ]
        .filter(Boolean)
        .join(" ")
    );

  const sameYearQuery =
    clean(
      [
        context.year,
        context.player,
        "trading card",
      ]
        .filter(Boolean)
        .join(" ")
    );

  const samePlayerQuery =
    clean(
      [
        context.player,
        "trading card",
      ]
        .filter(Boolean)
        .join(" ")
    );

  return {
    exactQuery:
      exactQuery ||
      context.title,

    fallbackQueries:
      uniqueQueries([
        sameSetQuery,
        sameYearQuery,
        samePlayerQuery,
      ]).filter(
        (query) =>
          query.toLowerCase() !==
          exactQuery.toLowerCase()
      ),
  };
}

/**
 * Strict query used by the scheduled auction monitor.
 *
 * No same-player or same-year fallback is included.
 */
export function buildStrictAuctionQuery(
  context: SearchContext
) {
  return clean(
    [
      context.year,
      context.player,

      context.cardNumber
        ? `#${context.cardNumber}`
        : "",

      context.brand,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function wordsFrom(
  value: string,
  minimumLength = 2
) {
  return normalizedText(
    value
  )
    .split(" ")
    .filter(
      (word) =>
        word.length >=
        minimumLength
    );
}

function escapeRegExp(
  value: string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

export function containsWord(
  title: string,
  word: string
) {
  if (!word) {
    return false;
  }

  return new RegExp(
    `(?:^|\\s)${escapeRegExp(
      word
    )}(?:\\s|$)`
  ).test(title);
}

function getMatchFacts(
  itemTitle: string,
  context: SearchContext
) {
  const title =
    normalizedText(
      itemTitle
    );

  const year =
    normalizedText(
      context.year
    );

  const cardNumber =
    normalizedText(
      context.cardNumber
    );

  const playerWords =
    wordsFrom(
      context.player
    );

  const firstName =
    playerWords[0] || "";

  const lastName =
    playerWords[
      playerWords.length - 1
    ] || "";

  const brandWords =
    wordsFrom(
      context.brand,
      3
    );

  const matchedPlayerWords =
    playerWords.filter(
      (word) =>
        containsWord(
          title,
          word
        )
    );

  const matchedBrandWords =
    brandWords.filter(
      (word) =>
        containsWord(
          title,
          word
        )
    );

  const lastNameMatches =
    Boolean(lastName) &&
    containsWord(
      title,
      lastName
    );

  const firstNameMatches =
    Boolean(firstName) &&
    containsWord(
      title,
      firstName
    );

  const samePlayer =
    lastNameMatches &&
    (
      playerWords.length === 1 ||
      firstNameMatches ||
      matchedPlayerWords.length >=
        Math.min(
          2,
          playerWords.length
        )
    );

  const sameYear =
    Boolean(year) &&
    containsWord(
      title,
      year
    );

  const sameCardNumber =
    Boolean(cardNumber) &&
    containsWord(
      title,
      cardNumber
    );

  const requiredBrandMatches =
    brandWords.length
      ? Math.max(
          1,
          Math.ceil(
            brandWords.length /
              2
          )
        )
      : 0;

  const sameSet =
    brandWords.length > 0 &&
    matchedBrandWords.length >=
      requiredBrandMatches;

  return {
    title,
    year,
    cardNumber,

    playerWords,
    brandWords,

    matchedPlayerWords,
    matchedBrandWords,

    samePlayer,
    sameYear,
    sameCardNumber,
    sameSet,
  };
}

/**
 * Match classifier used by the Similar Cards page.
 */
export function classifyMatch(
  itemTitle: string,
  context: SearchContext
): MatchResult {
  const facts =
    getMatchFacts(
      itemTitle,
      context
    );

  const {
    playerWords,
    matchedPlayerWords,
    matchedBrandWords,

    samePlayer,
    sameYear,
    sameCardNumber,
    sameSet,
  } = facts;

  let matchType:
    MatchResult["matchType"] =
      "same-player";

  let matchLabel =
    "Same Player";

  let score = 100;

  if (
    samePlayer &&
    sameYear &&
    sameSet &&
    sameCardNumber
  ) {
    matchType =
      "same-card";

    matchLabel =
      "Same Card";

    score = 400;
  } else if (
    samePlayer &&
    sameSet
  ) {
    matchType =
      "same-set";

    matchLabel =
      "Same Set";

    score = 300;
  } else if (
    samePlayer &&
    sameYear
  ) {
    matchType =
      "same-year";

    matchLabel =
      "Same Year";

    score = 200;
  }

  if (sameYear) {
    score += 20;
  }

  if (sameSet) {
    score += 20;
  }

  if (sameCardNumber) {
    score += 25;
  }

  score +=
    matchedPlayerWords.length *
    5;

  score +=
    matchedBrandWords.length *
    4;

  const reasons:
    string[] = [];

  if (samePlayer) {
    reasons.push(
      "Matched player"
    );
  }

  if (sameYear) {
    reasons.push(
      "Matched year"
    );
  }

  if (sameSet) {
    reasons.push(
      "Matched set/brand"
    );
  }

  if (sameCardNumber) {
    reasons.push(
      "Matched card number"
    );
  }

  if (
    !reasons.length &&
    playerWords.length
  ) {
    reasons.push(
      "Possible player match"
    );
  }

  return {
    matchType,
    matchLabel,
    score,
    reasons,
  };
}

/**
 * Strict auction-watch classifier.
 *
 * A listing must match:
 * - player
 * - year
 * - card number
 * - set or brand
 *
 * This prevents broad same-player results from being sent
 * in the daily email.
 */
export function classifyStrictAuctionMatch(
  itemTitle: string,
  context: SearchContext
): StrictMatchResult {
  const facts =
    getMatchFacts(
      itemTitle,
      context
    );

  const reasons:
    string[] = [];

  const missingReasons:
    string[] = [];

  if (facts.samePlayer) {
    reasons.push(
      "Matched player"
    );
  } else {
    missingReasons.push(
      "Player did not match"
    );
  }

  if (facts.sameYear) {
    reasons.push(
      "Matched year"
    );
  } else {
    missingReasons.push(
      "Year did not match"
    );
  }

  if (facts.sameCardNumber) {
    reasons.push(
      "Matched card number"
    );
  } else {
    missingReasons.push(
      "Card number did not match"
    );
  }

  if (facts.sameSet) {
    reasons.push(
      "Matched set/brand"
    );
  } else {
    missingReasons.push(
      "Set/brand did not match strongly enough"
    );
  }

  let score = 0;

  if (facts.samePlayer) {
    score += 35;
  }

  if (facts.sameYear) {
    score += 20;
  }

  if (facts.sameCardNumber) {
    score += 25;
  }

  if (facts.sameSet) {
    score += 20;
  }

  const accepted =
    facts.samePlayer &&
    facts.sameYear &&
    facts.sameCardNumber &&
    facts.sameSet;

  return {
    accepted,
    score,
    confidence:
      Math.min(
        100,
        score
      ),
    reasons,
    missingReasons,
  };
}

function buildRegistryUrl(
  context: SearchContext
) {
  const slug =
    clean(
      context.slug
    );

  if (!slug) {
    return "";
  }

  const configuredBaseUrl =
    clean(
      process.env
        .NEXT_PUBLIC_SITE_URL
    ) ||
    clean(
      process.env
        .SITE_URL
    ) ||
    "https://www.tiffanycards.com";

  return `${configuredBaseUrl.replace(
    /\/+$/,
    ""
  )}/rpa-tracker/group/${encodeURIComponent(
    slug
  )}`;
}

/**
 * Converts an eBay Browse API item into the normalized
 * listing shape used by both the website and monitor.
 */
export function mapItem(
  item: any,
  context: SearchContext
): EbayListing {
  const title =
    clean(
      item?.title
    );

  const image =
    clean(
      item?.image
        ?.imageUrl ||
      item
        ?.thumbnailImages?.[0]
        ?.imageUrl
    );

  const id =
    clean(
      item?.itemId
    );

  const legacyItemId =
    clean(
      item?.legacyItemId
    );

  const seller =
    clean(
      item?.seller
        ?.username
    );

  const certNumber =
    extractCertNumber(
      title
    );

  const serialNumber =
    extractSerialNumber(
      title
    );

  const imageId =
    extractImageId(
      image
    );

  const match =
    classifyMatch(
      title,
      context
    );

  const strictMatch =
    classifyStrictAuctionMatch(
      title,
      context
    );

  const fingerprint = {
    listingId:
      id,

    legacyListingId:
      legacyItemId,

    seller,

    certNumber,

    serialNumber,

    imageId,
  };

  return {
    id,

    legacyItemId,

    title,

    image,

    price: {
      value:
        clean(
          item?.currentBidPrice
            ?.value ||
          item?.price
            ?.value
        ),

      currency:
        clean(
          item?.currentBidPrice
            ?.currency ||
          item?.price
            ?.currency
        ) ||
        "USD",
    },

    url:
      clean(
        item
          ?.itemAffiliateWebUrl ||
        item?.itemWebUrl
      ),

    buyingOptions:
      Array.isArray(
        item?.buyingOptions
      )
        ? item.buyingOptions
        : [],

    condition:
      clean(
        item?.condition
      ),

    endDate:
      clean(
        item?.itemEndDate
      ),

    seller,

    marketplace:
      "eBay",

    matchType:
      match.matchType,

    matchLabel:
      match.matchLabel,

    score:
      match.score,

    confidence:
      strictMatch.confidence,

    reasons:
      strictMatch.reasons,

    certNumber,

    serialNumber,

    imageId,

    fingerprint,

    fingerprintHash:
      buildFingerprintHash(
        fingerprint
      ),

    registryUrl:
      buildRegistryUrl(
        context
      ),
  };
}