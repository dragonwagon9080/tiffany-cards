import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EBAY_TOKEN_URL =
  "https://api.ebay.com/identity/v1/oauth2/token";

const EBAY_SEARCH_URL =
  "https://api.ebay.com/buy/browse/v1/item_summary/search";

const EBAY_SCOPE =
  "https://api.ebay.com/oauth/api_scope";

const EBAY_CAMPAIGN_ID =
  process.env.EBAY_CAMPAIGN_ID ||
  "5339176379";

type CachedToken = {
  value: string;
  expiresAt: number;
};

type SearchContext = {
  title: string;
  year: string;
  player: string;
  cardNumber: string;
  brand: string;
  cardId: string;
};

type MatchType =
  | "same-card"
  | "same-set"
  | "same-year"
  | "same-player";

let cachedToken:
  | CachedToken
  | null = null;

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedText(
  value: unknown
) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function inferCardNumber(
  title: string
) {
  const match = clean(
    title
  ).match(
    /#\s*([a-z0-9.-]+)/i
  );

  return match?.[1] || "";
}

function buildContext(
  searchParams: URLSearchParams
): SearchContext {
  const title = clean(
    searchParams.get("title")
  );

  return {
    title,

    year: clean(
      searchParams.get("year")
    ),

    player: clean(
      searchParams.get("player")
    ),

    cardNumber:
      clean(
        searchParams.get(
          "cardNumber"
        )
      ) ||
      inferCardNumber(title),

    brand: clean(
      searchParams.get("brand")
    ),

    cardId: clean(
      searchParams.get("cardId")
    ),
  };
}

function uniqueQueries(
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

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function buildSearchQueries(
  context: SearchContext
) {
  const exactQuery = clean(
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

  const sameSetQuery = clean(
    [
      context.player,
      context.brand,
      "trading card",
    ]
      .filter(Boolean)
      .join(" ")
  );

  const sameYearQuery = clean(
    [
      context.year,
      context.player,
      "trading card",
    ]
      .filter(Boolean)
      .join(" ")
  );

  const samePlayerQuery = clean(
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

async function getEbayToken() {
  if (
    cachedToken &&
    cachedToken.expiresAt >
      Date.now() + 60_000
  ) {
    return cachedToken.value;
  }

  const clientId =
    process.env.EBAY_CLIENT_ID;

  const clientSecret =
    process.env.EBAY_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret
  ) {
    throw new Error(
      "Missing eBay API credentials."
    );
  }

  const authorization =
    Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

  const response =
    await fetch(
      EBAY_TOKEN_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Basic ${authorization}`,

          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            grant_type:
              "client_credentials",

            scope: EBAY_SCOPE,
          }).toString(),

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
      `eBay token response was invalid JSON: ${text.slice(
        0,
        300
      )}`
    );
  }

  if (
    !response.ok ||
    !data.access_token
  ) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        "Unable to create eBay access token."
    );
  }

  const expiresIn = Number(
    data.expires_in || 7200
  );

  cachedToken = {
    value:
      data.access_token,

    expiresAt:
      Date.now() +
      expiresIn * 1000,
  };

  return cachedToken.value;
}

async function searchEbay(
  token: string,
  query: string,
  affiliateReference: string,
  limit = 20
) {
  const url = new URL(
    EBAY_SEARCH_URL
  );

  url.searchParams.set(
    "q",
    query.slice(0, 200)
  );

  url.searchParams.set(
    "limit",
    String(limit)
  );

  url.searchParams.set(
    "fieldgroups",
    "EXTENDED"
  );

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
            `affiliateCampaignId=${EBAY_CAMPAIGN_ID},affiliateReferenceId=${affiliateReference}`,
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

function wordsFrom(
  value: string,
  minimumLength = 2
) {
  return normalizedText(value)
    .split(" ")
    .filter(
      (word) =>
        word.length >=
        minimumLength
    );
}

function containsWord(
  title: string,
  word: string
) {
  return new RegExp(
    `(?:^|\\s)${word}(?:\\s|$)`
  ).test(title);
}

function classifyMatch(
  itemTitle: string,
  context: SearchContext
): {
  matchType: MatchType;
  matchLabel: string;
  score: number;
} {
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

  const lastName =
    playerWords[
      playerWords.length - 1
    ] || "";

  const brandWords =
    wordsFrom(
      context.brand,
      3
    );

  const playerMatches =
    !lastName ||
    containsWord(
      title,
      lastName
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

  const matchedBrandWords =
    brandWords.filter(
      (word) =>
        containsWord(
          title,
          word
        )
    ).length;

  const sameSet =
    brandWords.length > 0 &&
    matchedBrandWords >=
      Math.ceil(
        brandWords.length /
          2
      );

  let matchType:
    MatchType =
      "same-player";

  let matchLabel =
    "Same Player";

  let score = 100;

  if (
    playerMatches &&
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
    playerMatches &&
    sameSet
  ) {
    matchType =
      "same-set";

    matchLabel =
      "Same Set";

    score = 300;
  } else if (
    playerMatches &&
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

  playerWords.forEach(
    (word) => {
      if (
        containsWord(
          title,
          word
        )
      ) {
        score += 5;
      }
    }
  );

  score +=
    matchedBrandWords * 4;

  return {
    matchType,
    matchLabel,
    score,
  };
}

function mapItem(
  item: any,
  context: SearchContext
) {
  const title = clean(
    item.title
  );

  const match =
    classifyMatch(
      title,
      context
    );

  return {
    id: clean(
      item.itemId
    ),

    legacyItemId: clean(
      item.legacyItemId
    ),

    title,

    image: clean(
      item.image?.imageUrl ||
        item.thumbnailImages?.[0]
          ?.imageUrl
    ),

    price: {
      value: clean(
        item.price?.value ||
          item.currentBidPrice
            ?.value
      ),

      currency:
        clean(
          item.price?.currency ||
            item.currentBidPrice
              ?.currency
        ) ||
        "USD",
    },

    url: clean(
      item.itemAffiliateWebUrl ||
        item.itemWebUrl
    ),

    buyingOptions:
      Array.isArray(
        item.buyingOptions
      )
        ? item.buyingOptions
        : [],

    condition: clean(
      item.condition
    ),

    endDate: clean(
      item.itemEndDate
    ),

    seller: clean(
      item.seller?.username
    ),

    matchType:
      match.matchType,

    matchLabel:
      match.matchLabel,

    score:
      match.score,
  };
}

export async function GET(
  req: NextRequest
) {
  try {
    const {
      searchParams,
    } = new URL(req.url);

    const context =
      buildContext(
        searchParams
      );

    const {
      exactQuery,
      fallbackQueries,
    } = buildSearchQueries(
      context
    );

    if (!exactQuery) {
      return NextResponse.json(
        {
          ok: false,
          items: [],

          error:
            "Missing RPA card search information.",
        },
        {
          status: 400,
        }
      );
    }

    const token =
      await getEbayToken();

    const affiliateReference =
      context.cardId
        .replace(
          /[^a-zA-Z0-9_-]/g,
          ""
        )
        .slice(0, 100) ||
      "rpa-similar";

    /*
     * Search the same card first.
     * Variation and serial number are intentionally
     * excluded so all parallels can appear.
     */
    const exactItems =
      await searchEbay(
        token,
        exactQuery,
        affiliateReference,
        20
      );

    /*
     * When several same-card results exist, one broad
     * player search is enough to fill the remainder.
     * Otherwise search all three fallback levels.
     */
    const queriesToRun =
      exactItems.length >= 12
        ? fallbackQueries.slice(
            -1
          )
        : fallbackQueries;

    const fallbackResults =
      await Promise.allSettled(
        queriesToRun.map(
          (query) =>
            searchEbay(
              token,
              query,
              affiliateReference,
              16
            )
        )
      );

    const combined = [
      ...exactItems,
    ];

    fallbackResults.forEach(
      (result) => {
        if (
          result.status ===
          "fulfilled"
        ) {
          combined.push(
            ...result.value
          );
        }
      }
    );

    const uniqueItems =
      new Map<
        string,
        ReturnType<
          typeof mapItem
        >
      >();

    combined.forEach(
      (rawItem) => {
        const item =
          mapItem(
            rawItem,
            context
          );

        if (
          !item.title ||
          !item.image ||
          !item.url
        ) {
          return;
        }

        const key =
          item.id ||
          item.legacyItemId ||
          item.url;

        const existing =
          uniqueItems.get(key);

        if (
          !existing ||
          item.score >
            existing.score
        ) {
          uniqueItems.set(
            key,
            item
          );
        }
      }
    );

    const items = Array.from(
      uniqueItems.values()
    )
      .sort(
        (a, b) =>
          b.score -
          a.score
      )
      .slice(0, 24);

    return NextResponse.json(
      {
        ok: true,

        query:
          exactQuery,

        searchedQueries: [
          exactQuery,
          ...queriesToRun,
        ],

        items,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=1800, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "Similar eBay cards error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        items: [],

        error:
          error?.message ||
          "Unable to retrieve similar eBay cards.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}