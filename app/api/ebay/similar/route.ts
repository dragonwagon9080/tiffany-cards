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

let cachedToken:
  | CachedToken
  | null = null;

function clean(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .replace(/\s+/g, " ")
    .trim();
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

  const expiresIn =
    Number(
      data.expires_in ||
        7200
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

function buildQuery(
  searchParams: URLSearchParams
) {
  const title =
    clean(
      searchParams.get(
        "title"
      )
    );

  const year =
    clean(
      searchParams.get(
        "year"
      )
    );

  const player =
    clean(
      searchParams.get(
        "player"
      )
    );

  const cardNumber =
    clean(
      searchParams.get(
        "cardNumber"
      )
    );

  const brand =
    clean(
      searchParams.get(
        "brand"
      )
    );

  const variation =
    clean(
      searchParams.get(
        "variation"
      )
    );

  if (title) {
    return [
      title,

      variation &&
      variation.toLowerCase() !==
        "base"
        ? variation
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 200);
  }

  return [
    year,
    player,

    cardNumber
      ? `#${cardNumber}`
      : "",

    brand,

    variation &&
    variation.toLowerCase() !==
      "base"
      ? variation
      : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 200);
}

function normalizedText(
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

function relevanceScore(
  itemTitle: string,
  context: {
    year: string;
    player: string;
    cardNumber: string;
    brand: string;
    variation: string;
  }
) {
  const title =
    normalizedText(
      itemTitle
    );

  let score = 0;

  const year =
    normalizedText(
      context.year
    );

  if (
    year &&
    title.includes(year)
  ) {
    score += 5;
  }

  const playerWords =
    normalizedText(
      context.player
    )
      .split(" ")
      .filter(
        (word) =>
          word.length > 1
      );

  playerWords.forEach(
    (word) => {
      if (
        title.includes(word)
      ) {
        score += 4;
      }
    }
  );

  const cardNumber =
    normalizedText(
      context.cardNumber
    );

  if (
    cardNumber &&
    new RegExp(
      `(?:^|\\s)${cardNumber}(?:\\s|$)`
    ).test(title)
  ) {
    score += 5;
  }

  const brandWords =
    normalizedText(
      context.brand
    )
      .split(" ")
      .filter(
        (word) =>
          word.length > 2
      );

  brandWords.forEach(
    (word) => {
      if (
        title.includes(word)
      ) {
        score += 2;
      }
    }
  );

  const variation =
    normalizedText(
      context.variation
    );

  if (
    variation &&
    variation !== "base" &&
    title.includes(variation)
  ) {
    score += 3;
  }

  return score;
}

export async function GET(
  req: NextRequest
) {
  try {
    const {
      searchParams,
    } = new URL(req.url);

    const query =
      buildQuery(
        searchParams
      );

    if (!query) {
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

    const ebayUrl =
      new URL(
        EBAY_SEARCH_URL
      );

    ebayUrl.searchParams.set(
      "q",
      query
    );

    ebayUrl.searchParams.set(
      "limit",
      "30"
    );

    ebayUrl.searchParams.set(
      "fieldgroups",
      "EXTENDED"
    );

    const affiliateReference =
      clean(
        searchParams.get(
          "cardId"
        )
      )
        .replace(
          /[^a-zA-Z0-9_-]/g,
          ""
        )
        .slice(0, 100) ||
      "rpa-similar";

    const response =
      await fetch(
        ebayUrl.toString(),
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
      data = JSON.parse(
        text
      );
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

    const context = {
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
        ),

      brand:
        clean(
          searchParams.get(
            "brand"
          )
        ),

      variation:
        clean(
          searchParams.get(
            "variation"
          )
        ),
    };

    const rawItems =
      Array.isArray(
        data.itemSummaries
      )
        ? data.itemSummaries
        : [];

    const items =
      rawItems
        .map(
          (item: any) => ({
            id:
              clean(
                item.itemId
              ),

            legacyItemId:
              clean(
                item.legacyItemId
              ),

            title:
              clean(
                item.title
              ),

            image:
              clean(
                item.image
                  ?.imageUrl ||
                  item.thumbnailImages?.[0]
                    ?.imageUrl
              ),

            price: {
              value:
                clean(
                  item.price
                    ?.value
                ),

              currency:
                clean(
                  item.price
                    ?.currency
                ) ||
                "USD",
            },

            url:
              clean(
                item.itemAffiliateWebUrl ||
                  item.itemWebUrl
              ),

            buyingOptions:
              Array.isArray(
                item.buyingOptions
              )
                ? item.buyingOptions
                : [],

            condition:
              clean(
                item.condition
              ),

            endDate:
              clean(
                item.itemEndDate
              ),

            seller:
              clean(
                item.seller
                  ?.username
              ),

            score:
              relevanceScore(
                clean(
                  item.title
                ),
                context
              ),
          })
        )
        .filter(
          (item: any) =>
            item.title &&
            item.image &&
            item.url
        )
        .sort(
          (
            a: any,
            b: any
          ) =>
            b.score -
            a.score
        )
        .slice(0, 20);

    return NextResponse.json(
      {
        ok: true,
        query,
        items,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=900, stale-while-revalidate=3600",
        },
      }
    );
  } catch (
    error: any
  ) {
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