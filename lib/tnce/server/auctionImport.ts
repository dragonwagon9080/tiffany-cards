type AuctionImportResult = {
  ok?: boolean;

  marketplace: string;
  sourceUrl: string;
  listingId: string;

  title: string;
  seller: string;

  price: string;
  currency: string;
  endDate: string;

  certNumber?: string;
  grade?: string;
  serialNumber?: string;
  lotNumber?: string;

  frontImage: string;
  additionalImages: string[];

  aspects: Record<string, string[]>;
};

type EbayTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type EbayImage = {
  imageUrl?: string;
};

type EbayAspect = {
  localizedName?: string;
  localizedValues?: string[];
};

type EbayItemResponse = {
  legacyItemId?: string;
  title?: string;

  image?: EbayImage;
  additionalImages?: EbayImage[];

  seller?: {
    username?: string;
    userId?: string;
  };

  price?: {
    value?: string;
    currency?: string;
  };

  itemEndDate?: string;

  localizedAspects?: EbayAspect[];

  itemWebUrl?: string;

  errors?: Array<{
    errorId?: number;
    domain?: string;
    category?: string;
    message?: string;
    longMessage?: string;
  }>;
};

type GoldinJsonLd = {
  "@type"?: string | string[];
  name?: string;
  headline?: string;
  description?: string;
  image?: string | string[] | Array<{ url?: string }>;
  url?: string;
  sku?: string;
  productID?: string;
  identifier?: string;
  itemCondition?: string;
  brand?: {
    name?: string;
  };
  offers?: {
    price?: string | number;
    priceCurrency?: string;
    availabilityEnds?: string;
    validThrough?: string;
  };
};

const EBAY_TOKEN_URL =
  "https://api.ebay.com/identity/v1/oauth2/token";

const EBAY_ITEM_URL =
  "https://api.ebay.com/buy/browse/v1/item/get_item_by_legacy_id";

const EBAY_SCOPE =
  "https://api.ebay.com/oauth/api_scope";

let cachedToken:
  | {
      token: string;
      expiresAt: number;
    }
  | undefined;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function decodeHtml(value: string) {
  return clean(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code))
    );
}

function normalizeUrl(value: unknown, baseUrl?: string) {
  const text = decodeHtml(clean(value));

  if (!text) return "";

  try {
    return new URL(text, baseUrl).toString();
  } catch {
    return "";
  }
}

function uniqueUrls(values: unknown[], baseUrl?: string) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const url = normalizeUrl(value, baseUrl);

    if (!url) continue;

    const key = url.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(url);
  }

  return result;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getMetaContent(
  html: string,
  propertyOrName: string
) {
  const escaped = escapeRegExp(propertyOrName);

  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }

  return "";
}

function getCanonicalUrl(html: string, fallback: string) {
  const match = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i
  );

  if (match?.[1]) {
    return normalizeUrl(match[1], fallback) || fallback;
  }

  return fallback;
}

function extractScriptContents(
  html: string,
  type: string
) {
  const escapedType = escapeRegExp(type);

  const regex = new RegExp(
    `<script[^>]+type=["']${escapedType}["'][^>]*>([\\s\\S]*?)<\\/script>`,
    "gi"
  );

  const results: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html))) {
    const value = clean(match[1]);

    if (value) {
      results.push(value);
    }
  }

  return results;
}

function flattenJsonLd(value: unknown): GoldinJsonLd[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }

  if (typeof value !== "object") {
    return [];
  }

  const object = value as Record<string, unknown>;
  const results: GoldinJsonLd[] = [
    object as GoldinJsonLd,
  ];

  if (object["@graph"]) {
    results.push(...flattenJsonLd(object["@graph"]));
  }

  return results;
}

function parseJsonLd(html: string) {
  const results: GoldinJsonLd[] = [];

  for (const script of extractScriptContents(
    html,
    "application/ld+json"
  )) {
    try {
      const parsed = JSON.parse(script);
      results.push(...flattenJsonLd(parsed));
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return results;
}

function getJsonLdImages(
  value: GoldinJsonLd["image"]
) {
  if (!value) return [];

  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((image) => {
      if (typeof image === "string") {
        return [image];
      }

      return image?.url ? [image.url] : [];
    });
  }

  return [];
}

function collectImageUrlsFromJson(
  value: unknown,
  results: string[] = [],
  depth = 0
) {
  if (depth > 12 || value === null || value === undefined) {
    return results;
  }

  if (typeof value === "string") {
    if (
      /^https?:\/\//i.test(value) &&
      (
        /\.(?:jpe?g|png|webp|avif)(?:[?#]|$)/i.test(value) ||
        /image|img|photo|media|cdn/i.test(value)
      )
    ) {
      results.push(value);
    }

    return results;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageUrlsFromJson(
        item,
        results,
        depth + 1
      );
    }

    return results;
  }

  if (typeof value === "object") {
    for (const [key, item] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (
        typeof item === "string" &&
        /image|img|photo|media|url|src/i.test(key) &&
        /^https?:\/\//i.test(item)
      ) {
        results.push(item);
      }

      collectImageUrlsFromJson(
        item,
        results,
        depth + 1
      );
    }
  }

  return results;
}

function extractEmbeddedJsonImages(html: string) {
  const images: string[] = [];

  const nextDataMatch = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (nextDataMatch?.[1]) {
    try {
      const parsed = JSON.parse(nextDataMatch[1]);
      collectImageUrlsFromJson(parsed, images);
    } catch {
      // Ignore invalid embedded application JSON.
    }
  }

  const escapedUrlRegex =
    /https?:\\?\/\\?\/[^"'<>\\\s]+?\.(?:jpe?g|png|webp|avif)(?:\\?[^"'<>\\\s]*)?/gi;

  for (const match of html.matchAll(escapedUrlRegex)) {
    images.push(
      match[0]
        .replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/")
        .replace(/\\"/g, '"')
    );
  }

  return images;
}

function normalizeGoldinImageUrl(
  value: unknown,
  sourceUrl: string
) {
  let url = normalizeUrl(value, sourceUrl);

  if (!url) return "";

  url = url
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/");

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

function filterGoldinImages(
  values: unknown[],
  sourceUrl: string
) {
  const excludedPatterns = [
    /logo/i,
    /favicon/i,
    /avatar/i,
    /icon/i,
    /sprite/i,
    /placeholder/i,
    /payment/i,
    /social/i,
    /app-store/i,
    /google-play/i,
  ];

  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const url = normalizeGoldinImageUrl(
      value,
      sourceUrl
    );

    if (!url) continue;

    if (excludedPatterns.some((pattern) => pattern.test(url))) {
      continue;
    }

    const key = url
      .replace(/[?&](?:width|height|w|h|quality|q)=\d+/gi, "")
      .toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    results.push(url);
  }

  return results;
}

function extractGoldinListingId(
  sourceUrl: string,
  html: string
) {
  const parsed = new URL(sourceUrl);

  const queryCandidates = [
    parsed.searchParams.get("lotId"),
    parsed.searchParams.get("lot"),
    parsed.searchParams.get("id"),
    parsed.searchParams.get("itemId"),
  ];

  for (const candidate of queryCandidates) {
    if (clean(candidate)) {
      return clean(candidate);
    }
  }

  const metadataCandidates = [
    getMetaContent(html, "product:retailer_item_id"),
    getMetaContent(html, "sku"),
    getMetaContent(html, "productID"),
  ];

  for (const candidate of metadataCandidates) {
    if (clean(candidate)) {
      return clean(candidate);
    }
  }

  const pageCandidates = [
    html.match(/Lot\s*#\s*(\d+)/i)?.[1],
    html.match(/"lotNumber"\s*:\s*"?(\d+)"?/i)?.[1],
    html.match(/"lotId"\s*:\s*"([^"]+)"/i)?.[1],
    html.match(/"itemId"\s*:\s*"([^"]+)"/i)?.[1],
  ];

  for (const candidate of pageCandidates) {
    if (clean(candidate)) {
      return clean(candidate);
    }
  }

  const slug = parsed.pathname
    .split("/")
    .filter(Boolean)
    .pop();

  return clean(slug);
}

function parsePriceText(value: string) {
  const text = clean(value);

  if (!text) {
    return {
      price: "",
      currency: "",
    };
  }

  const match = text.match(
    /(?:USD\s*)?\$?\s*([\d,]+(?:\.\d{1,2})?)/i
  );

  return {
    price: match?.[1]?.replace(/,/g, "") || "",
    currency:
      /\bUSD\b|\$/i.test(text) ? "USD" : "",
  };
}

function extractGoldinPrice(
  html: string,
  jsonLd: GoldinJsonLd[]
) {
  for (const entry of jsonLd) {
    const value = clean(entry.offers?.price);

    if (value) {
      return {
        price: value.replace(/,/g, ""),
        currency:
          clean(entry.offers?.priceCurrency) ||
          "USD",
      };
    }
  }

  const metaPrice =
    getMetaContent(html, "product:price:amount") ||
    getMetaContent(html, "og:price:amount");

  const metaCurrency =
    getMetaContent(html, "product:price:currency") ||
    getMetaContent(html, "og:price:currency");

  if (metaPrice) {
    return {
      price: metaPrice.replace(/,/g, ""),
      currency: metaCurrency || "USD",
    };
  }

  const textPatterns = [
    /Final Price:\s*[^$]{0,30}\$([\d,]+(?:\.\d{1,2})?)/i,
    /Winning Bid\s*\$([\d,]+(?:\.\d{1,2})?)/i,
    /Current Bid\s*\$([\d,]+(?:\.\d{1,2})?)/i,
    /Buy It Now\s*\$([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of textPatterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return {
        price: match[1].replace(/,/g, ""),
        currency: "USD",
      };
    }
  }

  return parsePriceText(
    getMetaContent(html, "description")
  );
}

function normalizeGoldinAspects(
  jsonLd: GoldinJsonLd[],
  html: string
) {
  const aspects: Record<string, string[]> = {};

  for (const entry of jsonLd) {
    const brand = clean(entry.brand?.name);

    if (brand) {
      aspects.Brand = [brand];
    }

    const condition = clean(entry.itemCondition);

    if (condition) {
      aspects.Condition = [condition];
    }
  }

  const lotNumber = html.match(
    /Lot\s*#\s*(\d+)/i
  )?.[1];

  if (lotNumber) {
    aspects["Lot Number"] = [lotNumber];
  }

  return aspects;
}

function isEbayHostname(hostname: string) {
  return (
    hostname === "ebay.com" ||
    hostname.endsWith(".ebay.com") ||
    hostname.startsWith("ebay.")
  );
}

function isGoldinHostname(hostname: string) {
  return (
    hostname === "goldin.co" ||
    hostname.endsWith(".goldin.co")
  );
}
function isFanaticsHostname(hostname: string) {
  return (
    hostname === "fanaticscollect.com" ||
    hostname.endsWith(".fanaticscollect.com") ||
    hostname === "pwccmarketplace.com" ||
    hostname.endsWith(".pwccmarketplace.com")
  );
}

function extractEbayItemId(value: string) {
  const text = clean(value);

  if (!text) {
    throw new Error("Missing eBay URL.");
  }

  let parsed: URL;

  try {
    parsed = new URL(text);
  } catch {
    throw new Error("Enter a valid eBay listing URL.");
  }

  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/^www\./, "");

  const allowedHosts = [
    "ebay.com",
    "ebay.co.uk",
    "ebay.ca",
    "ebay.com.au",
    "ebay.de",
    "ebay.fr",
    "ebay.it",
    "ebay.es",
  ];

  const isEbayHost = allowedHosts.some(
    (host) =>
      hostname === host ||
      hostname.endsWith(`.${host}`)
  );

  if (!isEbayHost) {
    throw new Error("Enter a valid eBay listing URL.");
  }

  const pathMatch = parsed.pathname.match(
    /\/itm\/(?:[^/]+\/)?(\d{9,20})(?:\/|$)/i
  );

  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  const queryCandidates = [
    parsed.searchParams.get("item"),
    parsed.searchParams.get("itemid"),
    parsed.searchParams.get("itemId"),
  ];

  for (const candidate of queryCandidates) {
    const match = clean(candidate).match(/\d{9,20}/);

    if (match?.[0]) {
      return match[0];
    }
  }

  throw new Error(
    "Unable to find the eBay item number in this URL."
  );
}

async function getEbayApplicationToken() {
  const clientId = clean(process.env.EBAY_CLIENT_ID);
  const clientSecret = clean(
    process.env.EBAY_CLIENT_SECRET
  );

  if (!clientId || !clientSecret) {
    throw new Error(
      "eBay API credentials are not configured."
    );
  }

  const now = Date.now();

  if (
    cachedToken &&
    cachedToken.expiresAt > now + 60_000
  ) {
    return cachedToken.token;
  }

  const basicAuth = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const response = await fetch(EBAY_TOKEN_URL, {
    method: "POST",

    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type":
        "application/x-www-form-urlencoded",
    },

    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: EBAY_SCOPE,
    }),

    cache: "no-store",
  });

  const text = await response.text();

  let data: EbayTokenResponse;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `eBay OAuth returned invalid JSON. First response text: ${text.slice(
        0,
        300
      )}`
    );
  }

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Unable to authenticate with eBay."
    );
  }

  const expiresIn = Number(data.expires_in || 7200);

  cachedToken = {
    token: data.access_token,
    expiresAt: now + expiresIn * 1000,
  };

  return data.access_token;
}

function normalizeAspects(
  aspects: EbayAspect[] | undefined
) {
  const result: Record<string, string[]> = {};

  for (const aspect of aspects || []) {
    const name = clean(aspect.localizedName);

    const values = Array.isArray(
      aspect.localizedValues
    )
      ? aspect.localizedValues
          .map(clean)
          .filter(Boolean)
      : [];

    if (!name || values.length === 0) continue;

    result[name] = values;
  }

  return result;
}

async function importEbayAuction(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const listingId = extractEbayItemId(sourceUrl);
  const token = await getEbayApplicationToken();

  const requestUrl = new URL(EBAY_ITEM_URL);

  requestUrl.searchParams.set(
    "legacy_item_id",
    listingId
  );

  const response = await fetch(requestUrl, {
    method: "GET",

    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      Accept: "application/json",
    },

    cache: "no-store",
  });

  const text = await response.text();

  let item: EbayItemResponse;

  try {
    item = JSON.parse(text);
  } catch {
    throw new Error(
      `eBay Browse API returned invalid JSON. First response text: ${text.slice(
        0,
        300
      )}`
    );
  }

  if (!response.ok) {
    const ebayError =
      item.errors?.[0]?.longMessage ||
      item.errors?.[0]?.message;

    throw new Error(
      ebayError ||
        `eBay listing import failed with status ${response.status}.`
    );
  }

  const frontImage = clean(item.image?.imageUrl);

  const additionalImages = uniqueUrls(
    (item.additionalImages || []).map(
      (image) => image.imageUrl
    )
  ).filter((url) => url !== frontImage);

  return {
    marketplace: "ebay",

    sourceUrl:
      clean(item.itemWebUrl) || sourceUrl,

    listingId:
      clean(item.legacyItemId) || listingId,

    title: clean(item.title),

    seller:
      clean(item.seller?.username) ||
      clean(item.seller?.userId),

    price: clean(item.price?.value),

    currency: clean(item.price?.currency),

    endDate: clean(item.itemEndDate),

    frontImage,

    additionalImages,

    aspects: normalizeAspects(
      item.localizedAspects
    ),
  };
}

async function fetchGoldinLotData(sourceUrl: string) {
  const parsedSourceUrl = new URL(sourceUrl);

  const slug = parsedSourceUrl.pathname
    .split("/")
    .filter(Boolean)
    .pop();

  if (!slug) {
    throw new Error(
      "Unable to determine the Goldin listing slug."
    );
  }

  const queryId =
    parsedSourceUrl.searchParams.get("queryId") || "";

  const response = await fetch(
    "https://d1wu47wucybvr3.cloudfront.net/api/lots",
    {
      method: "POST",
      cache: "no-store",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: "https://goldin.co",
        Referer: "https://goldin.co/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
      },

      body: JSON.stringify({
        queryType: "Search",
        queryId,
        slug: [slug],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Goldin lot API failed with status ${response.status}.`
    );
  }

  const json = await response.json();

 const lot = json?.body?.lots?.[0];

  if (!lot) {
    throw new Error(
      "Goldin returned no lot data for this listing."
    );
  }

  return lot;
}

async function fetchFanaticsListingData(sourceUrl: string) {
  const parsedUrl = new URL(sourceUrl);

  const pathParts = parsedUrl.pathname
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  const listingTypeIndex = pathParts.findIndex((part) => {
  const value = part.toLowerCase();

  return (
    value === "weekly" ||
    value === "buy-now" ||
    value === "premier"
  );
});

const listingId =
  listingTypeIndex >= 0
    ? pathParts[listingTypeIndex + 1]
    : "";

if (!listingId) {
  throw new Error(
    "Unable to determine the Fanatics listing ID from this URL."
  );
}

const listingType =
  pathParts.includes("buy-now")
    ? "BO"
    : pathParts.includes("premier")
      ? "PREMIER"
      : "WEEKLY";

const query = `
  query webWeeklyListingQuery(
    $id: UUID!
    $type: CollectListingType!
  ) {
    collectListing(id: $id, type: $type) {
      id
      integerId
      title
      subtitle
      slug
      listingType
      certifiedSeller
      lotString
      status
      bidCount

      currentBid {
        amountInCents
        currency
      }

      soldFor {
        amountInCents
        currency
      }

      startingPrice {
        amountInCents
        currency
      }

      imageSets {
        large
        medium
        small
        thumbnail
      }
        auction {
          id
          name
          shortName
          startsAt
          endsAt
          status
        }

        vaultItem {
          gradingServiceUrl
        }
      }
    }
  `;

  const response = await fetch(
    "https://app.fanaticscollect.com/graphql?webWeeklyListingQuery",
    {
      method: "POST",
      headers: {
        Accept:
          "application/graphql-response+json, application/json;q=0.9",
        "Content-Type": "application/json",
        Origin: "https://www.fanaticscollect.com",
        Referer: "https://www.fanaticscollect.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36",
        "x-platform": "web",
        "x-platform-app": "collect",
      },
      body: JSON.stringify({
        operationName: "webWeeklyListingQuery",
        variables: {
          id: listingId,
          type: listingType,
        },
        query,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Fanatics listing API failed with status ${response.status}.`
    );
  }

  const json = await response.json();

  if (json?.errors?.length) {
    throw new Error(
      json.errors[0]?.message ||
        "Fanatics returned a GraphQL error."
    );
  }

  const listing = json?.data?.collectListing;

  if (!listing) {
    throw new Error(
      "Fanatics returned no listing data for this URL."
    );
  }

  return listing;
}

async function importFanaticsAuction(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const listing =
  await fetchFanaticsListingData(sourceUrl);

console.log(
  JSON.stringify(listing, null, 2)
);

  const images = Array.isArray(listing.imageSets)
    ? listing.imageSets
        .map((image: any) =>
          String(
            image?.large ||
              image?.medium ||
              image?.small ||
              image?.thumbnail ||
              ""
          ).trim()
        )
        .filter(Boolean)
    : [];

  const priceObject =
    listing.soldFor ||
    listing.currentBid ||
    listing.startingPrice ||
    null;

  const amountInCents = Number(
    priceObject?.amountInCents
  );

  const price =
    Number.isFinite(amountInCents)
      ? (amountInCents / 100).toFixed(2)
      : "";

  const gradingServiceUrl = String(
    listing.vaultItem?.gradingServiceUrl || ""
  );

  const certMatch = gradingServiceUrl.match(
  /\/cert\/(\d+)/i
);

const certNumber = certMatch?.[1] || "";

return {
  ok: true,
  marketplace: "fanatics",

  sourceUrl,

  listingId: String(
    listing.id ||
      listing.integerId ||
      ""
  ),

  title: String(listing.title || ""),

  seller: String(
    listing.certifiedSeller || "Fanatics Collect"
  ),

  price,

  currency: String(
    priceObject?.currency || "USD"
  ),

  endDate: String(
    listing.auction?.endsAt || ""
  ),

  certNumber,

  lotNumber: String(
    listing.lotString || ""
  ),

  frontImage: images[0] || "",

  additionalImages: images.slice(1),

  aspects: {
    auction: listing.auction?.name
      ? [String(listing.auction.name)]
      : [],
  },
};
}

async function importGoldinAuction(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const response = await fetch(sourceUrl, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",

    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Goldin listing import failed with status ${response.status}.`
    );
  }

  const html = await response.text();

  if (!html || html.length < 500) {
    throw new Error(
      "Goldin returned an incomplete listing page."
    );
  }

  const finalUrl =
    response.url ||
    getCanonicalUrl(html, sourceUrl) ||
    sourceUrl;

    const goldinLot = await fetchGoldinLotData(finalUrl);

  const jsonLd = parseJsonLd(html);

  const productJsonLd =
    jsonLd.find((entry) => {
      const types = Array.isArray(entry["@type"])
        ? entry["@type"]
        : [entry["@type"]];

      return types.some((type) =>
        /product|auction|offer/i.test(clean(type))
      );
    }) || jsonLd[0];

  const title =
  clean(goldinLot?.title) ||
  clean(productJsonLd?.name) ||
  clean(productJsonLd?.headline) ||
  getMetaContent(html, "og:title") ||
  getMetaContent(html, "twitter:title") ||
  decodeHtml(
    html.match(
      /<title[^>]*>([\s\S]*?)<\/title>/i
    )?.[1] || ""
  );

 const apiImagePaths = Array.isArray(
  goldinLot?.images
)
  ? goldinLot.images
  : [];

const apiMediaPaths = Array.isArray(
  goldinLot?.media
)
  ? goldinLot.media
      .filter(
        (item: any) =>
          item?.type === "image" &&
          item?.image_path
      )
      .map((item: any) =>
        String(item.image_path)
      )
  : [];

const goldinApiImages = [
  ...apiImagePaths,
  ...apiMediaPaths,
].map((imagePath) => {
  const cleanPath = String(imagePath || "").trim();

  if (!cleanPath) {
    return "";
  }

  if (/^https?:\/\//i.test(cleanPath)) {
    return cleanPath;
  }

  return `https://d2tt46f3mh26nl.cloudfront.net/${cleanPath.replace(
    /^\/+/,
    ""
  )}@1x`;
});

const jsonLdImages = jsonLd.flatMap((entry) =>
  getJsonLdImages(entry.image)
);

const metaImages = [
  getMetaContent(html, "og:image"),
  getMetaContent(html, "og:image:url"),
  getMetaContent(html, "og:image:secure_url"),
  getMetaContent(html, "twitter:image"),
  getMetaContent(html, "twitter:image:src"),
];

const embeddedImages =
  extractEmbeddedJsonImages(html);

const allImages = filterGoldinImages(
  [
    ...goldinApiImages,
    ...jsonLdImages,
    ...metaImages,
    ...embeddedImages,
  ],
  finalUrl
);

  if (allImages.length === 0) {
    throw new Error(
      "The Goldin listing was found, but no listing images could be extracted."
    );
  }

  const frontImage = allImages[0];
  const additionalImages = allImages
    .slice(1)
    .filter((url) => url !== frontImage);

  const priceData = {
  price:
    goldinLot?.current_price !== undefined &&
    goldinLot?.current_price !== null
      ? String(goldinLot.current_price)
      : extractGoldinPrice(html, jsonLd).price,

  currency:
    clean(goldinLot?.currency) ||
    extractGoldinPrice(html, jsonLd).currency ||
    "USD",
};

  const endDate =
  clean(goldinLot?.end_timestamp) ||
  clean(productJsonLd?.offers?.availabilityEnds) ||
  clean(productJsonLd?.offers?.validThrough) ||
  getMetaContent(
    html,
    "product:expiration_time"
  ) ||
  getMetaContent(html, "auction:end_time") ||
  clean(
    html.match(
      /"(?:endDate|endTime|auctionEndDate)"\s*:\s*"([^"]+)"/i
    )?.[1]
  );

  const listingId =
  clean(goldinLot?.lot_id) ||
  clean(goldinLot?.lot_number) ||
  clean(productJsonLd?.sku) ||
  clean(productJsonLd?.productID) ||
  clean(productJsonLd?.identifier) ||
  extractGoldinListingId(finalUrl, html);

  return {
    marketplace: "goldin",

    sourceUrl:
      getCanonicalUrl(html, finalUrl) ||
      finalUrl,

    listingId,

    title: title.replace(/\s+on Goldin Auctions\s*$/i, ""),

    seller: "Goldin",

    price: priceData.price,

    currency: priceData.currency,

    endDate,

    frontImage,

    additionalImages,

    aspects: normalizeGoldinAspects(
      jsonLd,
      html
    ),
  };
}

export async function importAuction(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const cleanedUrl = clean(sourceUrl);

  if (!cleanedUrl) {
    throw new Error("Missing auction URL.");
  }

  let parsed: URL;

  try {
    parsed = new URL(cleanedUrl);
  } catch {
    throw new Error(
      "Enter a valid marketplace URL."
    );
  }

  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/^www\./, "");

  if (isEbayHostname(hostname)) {
    return importEbayAuction(cleanedUrl);
  }

  if (isGoldinHostname(hostname)) {
  return importGoldinAuction(cleanedUrl);
}

if (
  hostname === "fanaticscollect.com" ||
  hostname.endsWith(".fanaticscollect.com") ||
  hostname === "pwccmarketplace.com" ||
  hostname.endsWith(".pwccmarketplace.com")
) {
  return importFanaticsAuction(cleanedUrl);
}

throw new Error(
  "This marketplace is not supported yet. eBay, Goldin, and Fanatics Collect are currently available."
);
}