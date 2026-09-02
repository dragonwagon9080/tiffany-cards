import {
  parseAuctionTitle,
  type ParsedAuctionTitle,
} from "../auctionParser";

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
  description?: string;

  frontImage: string;
  additionalImages: string[];

  aspects: Record<string, string[]>;

  cardFields?: ParsedAuctionTitle & {
    certNumber: string;
  };

  aspectDiagnostics?: {
    status?: number;
    finalUrl?: string;
    htmlLength?: number;
    containsPlayerAthlete?: boolean;
    extractedAspectCount?: number;
    catalogStatus?: number;
    catalogSearchStatus?: number;
    epid?: string;
    error?: string;
  };
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

type EbayAspectGroup = {
  localizedGroupName?: string;
  localizedAspects?: EbayAspect[];
};

type EbayItemResponse = {
  legacyItemId?: string;
  epid?: string;
  inferredEpid?: string;
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

  product?: {
    title?: string;
    aspectGroups?: EbayAspectGroup[];
  };

  itemWebUrl?: string;

  errors?: Array<{
    errorId?: number;
    domain?: string;
    category?: string;
    message?: string;
    longMessage?: string;
  }>;
};

type EbayCatalogProduct = {
  epid?: string;
  title?: string;
  brand?: string;
  aspects?: Record<string, string[]>;
  errors?: Array<{
    message?: string;
    longMessage?: string;
  }>;
};

type EbayCatalogProductSummary = {
  epid?: string;
  title?: string;
};

type EbayCatalogSearchResponse = {
  productSummaries?: EbayCatalogProductSummary[];
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
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, code) =>
        String.fromCodePoint(
          parseInt(code, 16)
        )
    )
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code))
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

function isMySlabsHostname(hostname: string) {
  return (
    hostname === "myslabs.com" ||
    hostname.endsWith(".myslabs.com")
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

function mergeEbayAspects(
  item: EbayItemResponse
) {
  const groupedAspects =
    (item.product?.aspectGroups || [])
      .flatMap(function (group) {
        return Array.isArray(
          group.localizedAspects
        )
          ? group.localizedAspects
          : [];
      });

  const allAspects = [
    ...(item.localizedAspects || []),
    ...groupedAspects,
  ];

  return normalizeAspects(allAspects);
}

function extractEbayPageAspects(
  html: string
) {
  const aspects: Record<string, string[]> = {};

  /*
   * eBay renders Item Specifics as matching dt/dd
   * elements. Keep the expression bounded so unrelated
   * page labels cannot consume large sections of HTML.
   */
  const itemSpecificPattern =
    /<dt\b[^>]*>[\s\S]{0,1000}?<span\b[^>]*>([^<]+)<\/span>[\s\S]{0,1000}?<\/dt>\s*<dd\b[^>]*>[\s\S]{0,1000}?<span\b[^>]*>([^<]+)<\/span>/gi;

  let match:
    | RegExpExecArray
    | null;

  while (
    (match =
      itemSpecificPattern.exec(html))
  ) {
    const name = decodeHtml(match[1]);
    const value = decodeHtml(match[2]);

    if (!name || !value) {
      continue;
    }

    if (!aspects[name]) {
      aspects[name] = [];
    }

    if (
      aspects[name].indexOf(value) === -1
    ) {
      aspects[name].push(value);
    }
  }

  /*
   * Sold listings can redirect to an eBay product page.
   * Product details are embedded as JSON-like
   * name/value property records instead of dt/dd HTML.
   */
  const productPropertyPattern =
    /"name"\s*:\s*\{[\s\S]{0,600}?"text"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]{0,600}?"values"\s*:\s*\[[\s\S]{0,600}?"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;

  while (
    (match =
      productPropertyPattern.exec(html))
  ) {
    let rawName = match[1];
    let rawValue = match[2];

    try {
      rawName = JSON.parse(
        '"' + rawName + '"'
      );
    } catch (error) {
      // Keep the original text.
    }

    try {
      rawValue = JSON.parse(
        '"' + rawValue + '"'
      );
    } catch (error) {
      // Keep the original text.
    }

    const name = decodeHtml(rawName);
    const value = decodeHtml(rawValue);

    if (!name || !value) {
      continue;
    }

    if (!aspects[name]) {
      aspects[name] = [];
    }

    if (
      aspects[name].indexOf(value) === -1
    ) {
      aspects[name].push(value);
    }
  }

  return aspects;
}

async function requestEbayAspectPage_(
  url: string
) {
  const response = await fetch(
    url,
    {
      method: "GET",
      redirect: "follow",
      cache: "no-store",

      headers: {
        Accept:
          "text/html,application/xhtml+xml",

        "Accept-Language":
          "en-US,en;q=0.9",

        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
      },
    }
  );

  const html = response.ok
    ? await response.text()
    : "";

  const aspects = html
    ? extractEbayPageAspects(html)
    : {};

  return {
    response,
    html,
    aspects,
  };
}

async function fetchEbayCatalogAspects_(
  epid: string,
  token: string
) {
  if (!epid) {
    return {
      aspects: {},
      status: 0,
    };
  }

  try {
    const response = await fetch(
      "https://api.ebay.com/commerce/catalog/v1_beta/product/" +
        encodeURIComponent(epid),
      {
        method: "GET",
        cache: "no-store",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "X-EBAY-C-MARKETPLACE-ID":
            "EBAY_US",

          Accept:
            "application/json",
        },
      }
    );

    const text =
      await response.text();

    let product:
      EbayCatalogProduct = {};

    try {
      product = JSON.parse(text);
    } catch (error) {
      return {
        aspects: {},
        status: response.status,
      };
    }

    const aspects =
      product.aspects &&
      typeof product.aspects ===
        "object"
        ? product.aspects
        : {};

    if (
      product.brand &&
      !aspects.Manufacturer
    ) {
      aspects.Manufacturer = [
        clean(product.brand),
      ].filter(Boolean);
    }

    return {
      aspects,
      status: response.status,
    };
  } catch (error) {
    return {
      aspects: {},
      status: 0,
    };
  }
}

function ebayCatalogTitleScore_(
  listingTitle: string,
  productTitle: string
) {
  const listingTokens =
    new Set(
      clean(listingTitle)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(function (token) {
          return token.length > 1;
        })
    );

  const productTokens =
    clean(productTitle)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(function (token) {
        return token.length > 1;
      });

  return productTokens.reduce(
    function (score, token) {
      return score +
        (listingTokens.has(token)
          ? 1
          : 0);
    },
    0
  );
}

function isPsaHostname(hostname: string) {
  return (
    hostname === "psacard.com" ||
    hostname.endsWith(".psacard.com")
  );
}

async function searchEbayCatalogEpid_(
  title: string,
  token: string
) {
  if (!title) {
    return {
      epid: "",
      status: 0,
    };
  }

  try {
    const searchUrl = new URL(
      "https://api.ebay.com/commerce/catalog/v1_beta/product_summary/search"
    );

    searchUrl.searchParams.set(
      "q",
      title
    );

    searchUrl.searchParams.set(
      "limit",
      "10"
    );

    const response = await fetch(
      searchUrl,
      {
        method: "GET",
        cache: "no-store",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "X-EBAY-C-MARKETPLACE-ID":
            "EBAY_US",

          Accept:
            "application/json",
        },
      }
    );

    const text =
      await response.text();

    let data:
      EbayCatalogSearchResponse = {};

    try {
      data = JSON.parse(text);
    } catch (error) {
      return {
        epid: "",
        status: response.status,
      };
    }

    const products =
      Array.isArray(
        data.productSummaries
      )
        ? data.productSummaries
        : [];

    products.sort(function (a, b) {
      return (
        ebayCatalogTitleScore_(
          title,
          clean(b.title)
        ) -
        ebayCatalogTitleScore_(
          title,
          clean(a.title)
        )
      );
    });

    return {
      epid:
        clean(products[0]?.epid),
      status: response.status,
    };
  } catch (error) {
    return {
      epid: "",
      status: 0,
    };
  }
}

async function fetchEbayPageAspects(
  listingId: string
) {
  try {
    /*
     * nordt prevents ended/sold listings from being
     * redirected to a generic eBay product page.
     * orig_cvip requests the original completed listing.
     */
    const pageUrl =
      `https://www.ebay.com/itm/${encodeURIComponent(
        listingId
      )}` +
      "?nordt=true&orig_cvip=true";

    const originalListingResult =
      await requestEbayAspectPage_(
        pageUrl
      );

    if (
      originalListingResult.response.ok &&
      Object.keys(
        originalListingResult.aspects
      ).length
    ) {
      return {
        aspects:
          originalListingResult.aspects,

        diagnostics: {
          status:
            originalListingResult
              .response.status,

          finalUrl:
            originalListingResult
              .response.url,

          htmlLength:
            originalListingResult
              .html.length,

          containsPlayerAthlete:
            /Player\/Athlete/i.test(
              originalListingResult.html
            ),

          extractedAspectCount:
            Object.keys(
              originalListingResult.aspects
            ).length,
        },
      };
    }

    /*
     * If eBay blocks the original completed listing,
     * follow the normal item URL. Ended listings often
     * redirect to a public eBay product page containing
     * the same card identity details.
     */
    const productPageResult =
      await requestEbayAspectPage_(
        `https://www.ebay.com/itm/${encodeURIComponent(
          listingId
        )}`
      );

    const response =
      productPageResult.response;

    const html =
      productPageResult.html;

    const aspects =
      productPageResult.aspects;

    return {
      aspects,
      diagnostics: {
        status: response.status,
        finalUrl: response.url,
        htmlLength: html.length,
        containsPlayerAthlete:
          /Player\/Athlete/i.test(html),
        extractedAspectCount:
          Object.keys(aspects).length,
        error:
          Object.keys(aspects).length
            ? ""
            : (
                "Original listing status: " +
                originalListingResult
                  .response.status
              ),
      },
    };
  } catch (error) {
    /*
     * Item Specifics improve the import but should not
     * prevent the title and images from importing.
     */
    return {
      aspects: {},
      diagnostics: {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
    };
  }
}

async function importEbayAuction(
  sourceUrl: string
): Promise<AuctionImportResult> {
  // Support shortened ebay.io mobile links
if (sourceUrl.includes("ebay.io/")) {
  const redirect = await fetch(sourceUrl, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });

  sourceUrl = redirect.url;
}

const listingId = extractEbayItemId(sourceUrl);
  const token = await getEbayApplicationToken();

  const requestUrl = new URL(EBAY_ITEM_URL);

  requestUrl.searchParams.set(
    "legacy_item_id",
    listingId
  );

  /*
   * PRODUCT adds eBay catalog aspect groups. Sold or
   * ended listings may expose their visible Item
   * Specifics here instead of localizedAspects.
   */
  requestUrl.searchParams.set(
    "fieldgroups",
    "PRODUCT"
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

  const apiAspects =
    mergeEbayAspects(item);

  let urlEpid = "";

  try {
    urlEpid = clean(
      new URL(
        sourceUrl
      ).searchParams.get("epid")
    );
  } catch {
    urlEpid = "";
  }

  const itemEpid =
    clean(
      item.epid ||
        item.inferredEpid ||
        urlEpid
    );

  const catalogSearchResult =
    itemEpid
      ? {
          epid: itemEpid,
          status: 0,
        }
      : await searchEbayCatalogEpid_(
          clean(item.title),
          token
        );

  const resolvedEpid =
    itemEpid ||
    catalogSearchResult.epid;

  const catalogResult =
    await fetchEbayCatalogAspects_(
      resolvedEpid,
      token
    );

  const pageAspectResult =
    await fetchEbayPageAspects(
      clean(item.legacyItemId) ||
        listingId
    );

  const pageAspects =
    pageAspectResult.aspects;

  /*
   * The original listing page is the best source for
   * seller-entered Item Specifics. API values fill any
   * fields the page did not provide.
   */
  const aspects = {
    ...catalogResult.aspects,
    ...apiAspects,
    ...pageAspects,
  };

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

    aspects,

    aspectDiagnostics:
      {
        ...pageAspectResult.diagnostics,
        catalogStatus:
          catalogResult.status,
        catalogSearchStatus:
          catalogSearchResult.status,
        epid:
          resolvedEpid,
      },
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

function extractPsaCertNumber(
  sourceUrl: string
) {
  const parsed = new URL(sourceUrl);
  const match = parsed.pathname.match(
    /\/cert\/(\d{6,12})(?:\/|$)/i
  );

  if (!match) {
    throw new Error(
      "Unable to find a PSA certification number in this URL."
    );
  }

  return match[1];
}

function getObjectValue(
  source: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = source[key];

    if (
      value !== undefined &&
      value !== null
    ) {
      return value;
    }
  }

  return "";
}

function normalizePsaSport(value: unknown) {
  const category = clean(value).toLowerCase();

  const sports: Array<[RegExp, string]> = [
    [/\bbaseball\b/, "Baseball"],
    [/\bbasketball\b/, "Basketball"],
    [/\bfootball\b/, "Football"],
    [/\bhockey\b/, "Hockey"],
    [/\bsoccer\b/, "Soccer"],
    [/\bgolf\b/, "Golf"],
    [/\bwrestling\b/, "Wrestling"],
    [/\bpok[eé]mon\b|\btcg\b/, "Pokémon/TCG"],
  ];

  for (const [pattern, sport] of sports) {
    if (pattern.test(category)) {
      return sport;
    }
  }

  return "";
}

function formatPsaGrade(
  cert: Record<string, unknown>
) {
  const cardGrade = clean(
    getObjectValue(
      cert,
      "CardGrade",
      "cardGrade"
    )
  );

  const description = clean(
    getObjectValue(
      cert,
      "GradeDescription",
      "gradeDescription"
    )
  );

  if (
    /authentic/i.test(cardGrade) ||
    /authentic/i.test(description)
  ) {
    return "PSA Authentic";
  }

  if (cardGrade) {
    return `PSA ${cardGrade}`;
  }

  if (description) {
    return `PSA ${description.replace(
      /^PSA\s+/i,
      ""
    )}`;
  }

  return "";
}

type PsaImageCandidate = {
  url: string;
  path: string;
};

function collectPsaImageCandidates(
  value: unknown,
  path = "",
  output: PsaImageCandidate[] = []
) {
  if (typeof value === "string") {
    const url = clean(value);

    if (/^https?:\/\//i.test(url)) {
      output.push({ url, path });
    }

    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectPsaImageCandidates(
        item,
        `${path}.${index}`,
        output
      )
    );

    return output;
  }

  if (value && typeof value === "object") {
    Object.entries(
      value as Record<string, unknown>
    ).forEach(([key, item]) =>
      collectPsaImageCandidates(
        item,
        path ? `${path}.${key}` : key,
        output
      )
    );
  }

  return output;
}

function organizePsaImages(value: unknown) {
  const unique = new Map<
    string,
    PsaImageCandidate
  >();

  collectPsaImageCandidates(value).forEach(
    (candidate) => {
      if (!unique.has(candidate.url)) {
        unique.set(candidate.url, candidate);
      }
    }
  );

  const candidates = [...unique.values()];

  const front =
    candidates.find((candidate) =>
      /front|obverse/i.test(candidate.path)
    ) || candidates[0];

  const remaining = candidates
    .filter(
      (candidate) =>
        candidate.url !== front?.url
    )
    .sort((a, b) => {
      const aBack = /back|reverse/i.test(a.path)
        ? -1
        : 0;
      const bBack = /back|reverse/i.test(b.path)
        ? -1
        : 0;

      return aBack - bBack;
    })
    .map((candidate) => candidate.url);

  return {
    frontImage: front?.url || "",
    additionalImages: remaining,
  };
}

async function fetchPsaJson(
  endpoint: string,
  token: string
) {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `bearer ${token}`,
    },
    cache: "no-store",
  });

  const text = await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `PSA returned invalid JSON (${response.status}).`
    );
  }

  if (!response.ok) {
    const apiMessage = clean(
      data?.Message ||
        data?.message ||
        data?.Error ||
        data?.error
    );

    throw new Error(
      apiMessage ||
        `PSA API request failed (${response.status}).`
    );
  }

  return data;
}

async function importPsaCertification(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const token = clean(
    process.env.PSA_API_TOKEN
  );

  if (!token) {
    throw new Error(
      "Missing PSA_API_TOKEN environment variable."
    );
  }

  const certNumber =
    extractPsaCertNumber(sourceUrl);

  const apiRoot =
    "https://api.psacard.com/publicapi/cert";

  const certResponse = await fetchPsaJson(
  `${apiRoot}/GetByCertNumber/${encodeURIComponent(
    certNumber
  )}`,
  token
);

const isValidRequest =
  certResponse?.IsValidRequest ??
  certResponse?.isValidRequest;

const serverMessage = clean(
  certResponse?.ServerMessage ??
    certResponse?.serverMessage
);

if (isValidRequest === false) {
  throw new Error(
    serverMessage ||
      `PSA rejected cert number ${certNumber}.`
  );
}

if (
  isValidRequest === true &&
  /no data found/i.test(serverMessage)
) {
  throw new Error(
    `PSA returned no certification data for ${certNumber}.`
  );
}

const certSource =
    certResponse?.PSACert ||
    certResponse?.psaCert ||
    certResponse?.Cert ||
    certResponse?.cert ||
    certResponse;

  if (
    !certSource ||
    typeof certSource !== "object" ||
    Array.isArray(certSource)
  ) {
    throw new Error(
      `PSA did not return certification data for ${certNumber}.`
    );
  }

  const cert =
    certSource as Record<string, unknown>;

  const year = clean(
    getObjectValue(cert, "Year", "year")
  );
  const brand = clean(
    getObjectValue(cert, "Brand", "brand")
  );
  const category = clean(
    getObjectValue(
      cert,
      "Category",
      "category"
    )
  );
  const cardNumber = clean(
    getObjectValue(
      cert,
      "CardNumber",
      "cardNumber"
    )
  );
  const subject = clean(
    getObjectValue(
      cert,
      "Subject",
      "subject"
    )
  );
  const variety = clean(
    getObjectValue(
      cert,
      "Variety",
      "variety"
    )
  );
  const grade = formatPsaGrade(cert);
  const sport = normalizePsaSport(category);

  let imageResponse: unknown = {};

  try {
    imageResponse = await fetchPsaJson(
      `${apiRoot}/GetImagesByCertNumber/${encodeURIComponent(
        certNumber
      )}`,
      token
    );
  } catch {
    // A cert can still be imported when PSA has no
    // public images for it.
    imageResponse = {};
  }

  const images =
    organizePsaImages(imageResponse);

  const aspects: Record<
    string,
    string[]
  > = {};

  if (year) {
    aspects.Year = [year];
    aspects.Season = [year];
  }

  if (subject) {
    aspects["Player/Athlete"] = [subject];
  }

  if (sport) {
    aspects.Sport = [sport];
  }

  if (cardNumber) {
    aspects["Card Number"] = [cardNumber];
  }

  if (brand) {
    aspects.Brand = [brand];
    aspects.Set = [brand];
  }

  if (variety) {
    aspects["Parallel/Variety"] = [variety];
  }

  const title = [
    year,
    subject,
    cardNumber ? `#${cardNumber}` : "",
    brand,
    variety,
    grade,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ok: true,
    marketplace: "psa",
    sourceUrl,
    listingId: certNumber,
    title:
      title || `PSA Cert ${certNumber}`,
    seller: "PSA",
    price: "",
    currency: "",
    endDate: "",
    certNumber,
    grade,
    serialNumber: "",
    frontImage: images.frontImage,
    additionalImages:
      images.additionalImages,
    aspects,
  };
}

function extractXStatusDetails(
  sourceUrl: string
) {
  const parsed = new URL(sourceUrl);

  const match = parsed.pathname.match(
    /^\/([^/]+)\/status\/(\d+)/i
  );

  if (!match) {
    throw new Error(
      "Enter a valid public X post URL."
    );
  }

  return {
    username: match[1],
    statusId: match[2],
    canonicalUrl:
      `https://x.com/${match[1]}/status/${match[2]}`,
  };
}

function extractXPostText(
  embedHtml: string
) {
  const paragraph =
    embedHtml.match(
      /<p\b[^>]*>([\s\S]*?)<\/p>/i
    )?.[1] || "";

  if (!paragraph) {
    return "";
  }

  const withLinks = paragraph.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    function (
      _match,
      href,
      label
    ) {
      const cleanLabel = decodeHtml(
        String(label).replace(
          /<[^>]+>/g,
          ""
        )
      );

      if (
        /pic\.twitter\.com/i.test(
          cleanLabel
        )
      ) {
        return "";
      }

      return decodeHtml(href);
    }
  );

  return decodeHtml(
    withLinks
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/\s+/g, " ").trim()
    )
    .filter(Boolean)
    .join("\n");
}

function extractXMediaImages(
  html: string
) {
  const decoded = html
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&");

  const media = new Map<
    string,
    string
  >();

  const pattern =
    /https:\/\/pbs\.twimg\.com\/media\/([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9]+))?(?:\?format=([A-Za-z0-9]+)&name=[A-Za-z0-9_]+|:[A-Za-z0-9_]+)?/gi;

  let match:
    | RegExpExecArray
    | null;

  while (
    (match = pattern.exec(decoded))
  ) {
    const mediaId = clean(match[1]);

    if (!mediaId) {
      continue;
    }

    const detectedFormat = clean(
      match[3] || match[2]
    ).toLowerCase();

    const safeFormat =
      /^(?:jpg|jpeg|png|webp|gif)$/i.test(
        detectedFormat
      )
        ? detectedFormat.replace(
            "jpeg",
            "jpg"
          )
        : "jpg";

    /*
     * Prefer a detected JPG/PNG source over WEBP when
     * duplicate responsive variants are present.
     */
    const existing = media.get(mediaId);

    if (
      !existing ||
      /format=webp/i.test(existing)
    ) {
      media.set(
        mediaId,
        `https://pbs.twimg.com/media/${mediaId}?format=${safeFormat}&name=orig`
      );
    }
  }

  return [...media.values()];
}

async function importXPost(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const details =
    extractXStatusDetails(sourceUrl);

  const embedUrl = new URL(
    "https://publish.twitter.com/oembed"
  );

  embedUrl.searchParams.set(
    "url",
    details.canonicalUrl
  );

  embedUrl.searchParams.set(
    "omit_script",
    "true"
  );

  const [embedResponse, pageResponse] =
    await Promise.all([
      fetch(embedUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }),

      fetch(details.canonicalUrl, {
        method: "GET",
        headers: {
          Accept:
            "text/html,application/xhtml+xml",
          "Accept-Language":
            "en-US,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
        },
        cache: "no-store",
        redirect: "follow",
      }),
    ]);

  const embedText =
    await embedResponse.text();

  let embedData: any = {};

  try {
    embedData = JSON.parse(embedText);
  } catch {
    embedData = {};
  }

  const pageHtml =
    pageResponse.ok
      ? await pageResponse.text()
      : "";

  const description =
    extractXPostText(
      clean(embedData?.html)
    );

  const imageUrls =
    extractXMediaImages(pageHtml);

  if (
    !embedResponse.ok &&
    !description &&
    imageUrls.length === 0
  ) {
    throw new Error(
      "Unable to import this X post. Make sure the post is public."
    );
  }

  const authorName = clean(
    embedData?.author_name
  );

  const title =
    description
      .replace(/\s+/g, " ")
      .slice(0, 200) ||
    `X post by @${
      details.username
    }`;

  return {
    ok: true,
    marketplace: "x",
    sourceUrl: details.canonicalUrl,
    listingId: details.statusId,
    title,
    seller:
      authorName ||
      `@${details.username}`,
    price: "",
    currency: "",
    endDate: "",
    description,
    frontImage:
      imageUrls[0] || "",
    additionalImages:
      imageUrls.slice(1),
    aspects: {},
  };
}

function extractInstagramPostDetails(
  sourceUrl: string
) {
  const parsed = new URL(sourceUrl);

  const match = parsed.pathname.match(
    /^\/(?:[^/]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i
  );

  if (!match) {
    throw new Error(
      "Enter a valid public Instagram post or reel URL."
    );
  }

  return {
    shortcode: match[1],
    canonicalUrl:
      `https://www.instagram.com/p/${match[1]}/`,
  };
}

function extractInstagramCaption(
  metaDescription: string
) {
  const decoded = decodeHtml(
    metaDescription
  );

  /*
   * Instagram normally formats og:description as:
   *
   * 53 likes, 7 comments - username on Date:
   * "Actual caption". 
   */
  const quoted = decoded.match(
    /:\s*["“]([\s\S]*?)["”]\.?\s*$/
  )?.[1];

  const caption =
    quoted !== undefined
      ? quoted
      : decoded;

  return caption
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/\s+/g, " ").trim()
    )
    .filter(Boolean)
    .join("\n");
}

function extractInstagramPostDate(
  html: string,
  embedHtml: string,
  metaDescription: string
) {
  const combinedHtml =
    `${html}\n${embedHtml}`;

  /*
   * Prefer machine-readable timestamps exposed by
   * Instagram's page or embed markup.
   */
  const timestampCandidates = [
    combinedHtml.match(
      /"uploadDate"\s*:\s*"([^"]+)"/i
    )?.[1],

    combinedHtml.match(
      /"datePublished"\s*:\s*"([^"]+)"/i
    )?.[1],

    combinedHtml.match(
      /"taken_at_timestamp"\s*:\s*(\d{10,13})/i
    )?.[1],

    combinedHtml.match(
      /"taken_at"\s*:\s*(\d{10,13})/i
    )?.[1],

    combinedHtml.match(
      /<time[^>]+datetime=["']([^"']+)["']/i
    )?.[1],
  ];

  for (const candidate of timestampCandidates) {
    const value =
      String(candidate || "").trim();

    if (!value) continue;

    if (/^\d{10,13}$/.test(value)) {
      const timestamp =
        Number(value);

      const milliseconds =
        value.length === 10
          ? timestamp * 1000
          : timestamp;

      const date =
        new Date(milliseconds);

      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {
        return date.toISOString();
      }
    }

    const date =
      new Date(value);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date.toISOString();
    }
  }

  /*
   * Fallback: Instagram often formats og:description as:
   *
   * username on July 6, 2023: "caption"
   */
  const descriptionText =
    decodeHtml(
      metaDescription
    );

  const descriptionDate =
    descriptionText.match(
      /\bon\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})\s*:/i
    )?.[1];

  if (descriptionDate) {
    const date =
      new Date(descriptionDate);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date.toISOString();
    }
  }

  return "";
}

function cleanInstagramImageUrl(
  value: string
) {
  return decodeHtml(
    String(value || "")
  )
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&")
    .trim();
}

function isInstagramImageUrl(
  value: string
) {
  try {
    const parsed =
      new URL(value);

    const hostname =
      parsed.hostname.toLowerCase();

    return (
      hostname ===
        "cdninstagram.com" ||
      hostname.endsWith(
        ".cdninstagram.com"
      ) ||
      hostname === "fbcdn.net" ||
      hostname.endsWith(
        ".fbcdn.net"
      )
    );
  } catch {
    return false;
  }
}

function instagramTagAttribute(
  tag: string,
  attribute: string
) {
  const pattern =
    new RegExp(
      `\\s${attribute}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,
      "i"
    );

  return cleanInstagramImageUrl(
    tag.match(pattern)?.[2] || ""
  );
}

function extractInstagramImages(
  html: string,
  primaryImage: string
) {
  const candidates: Array<{
    url: string;
    width: number;
    preferred: boolean;
  }> = [];

  const imageTags =
    html.match(
      /<img\b[^>]*>/gi
    ) || [];

  imageTags.forEach((tag) => {
    const className =
      instagramTagAttribute(
        tag,
        "class"
      );

    /*
     * Exclude profile photos and avatars from the post.
     */
    if (
      /avatar|profile/i.test(
        className
      )
    ) {
      return;
    }

    const preferred =
      /EmbeddedMediaImage|MediaImage/i.test(
        className
      );

    const src =
      instagramTagAttribute(
        tag,
        "src"
      );

    if (
      src &&
      isInstagramImageUrl(src)
    ) {
      candidates.push({
        url: src,
        width: preferred
          ? 100000
          : 1,
        preferred,
      });
    }

    const srcset =
      instagramTagAttribute(
        tag,
        "srcset"
      );

    if (srcset) {
      srcset
        .split(",")
        .forEach((entry) => {
          const match =
            entry
              .trim()
              .match(
                /^(https?:\/\/\S+?)(?:\s+(\d+)w)?$/i
              );

          if (!match) {
            return;
          }

          const url =
            cleanInstagramImageUrl(
              match[1]
            );

          if (
            !isInstagramImageUrl(
              url
            )
          ) {
            return;
          }

          const width =
            Number(
              match[2] || 0
            );

          candidates.push({
            url,
            width:
              width +
              (preferred
                ? 100000
                : 0),
            preferred,
          });
        });
    }
  });

  /*
   * Prefer the largest image from Instagram's embed page.
   * The embed page preserves the post's actual aspect ratio.
   */
  candidates.sort(
    (a, b) => {
      if (
        a.preferred !==
        b.preferred
      ) {
        return a.preferred
          ? -1
          : 1;
      }

      return (
        b.width -
        a.width
      );
    }
  );

    if (candidates.length) {
    return [
      candidates[0].url,
    ];
  }

  /*
   * Fall back to og:image only when the embed page does
   * not expose an image. Instagram sometimes crops this
   * fallback into a square preview.
   */
  const fallback =
    cleanInstagramImageUrl(
      normalizeUrl(
        primaryImage
      )
    );

  return fallback &&
    isInstagramImageUrl(
      fallback
    )
    ? [fallback]
    : [];
}

async function importInstagramPost(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const details =
    extractInstagramPostDetails(
      sourceUrl
    );

  const requestHeaders = {
    Accept:
      "text/html,application/xhtml+xml",
    "Accept-Language":
      "en-US,en;q=0.9",
        "User-Agent":
      "Mozilla/5.0",
  };

  const response =
    await fetch(
      details.canonicalUrl,
      {
        method: "GET",
        headers:
          requestHeaders,
        cache: "no-store",
        redirect: "follow",
      }
    );

  const html =
    await response.text();

  if (
    !response.ok ||
    !html
  ) {
    throw new Error(
      "Unable to import this Instagram post. Make sure the post is public."
    );
  }

  /*
   * Instagram's public embed page normally provides the
   * complete image instead of the square og:image crop.
   */
  let embedHtml = "";

  try {
    const embedResponse =
      await fetch(
        details.canonicalUrl +
          "embed/",
        {
          method: "GET",
          headers:
            requestHeaders,
          cache: "no-store",
          redirect: "follow",
        }
      );

    if (embedResponse.ok) {
      embedHtml =
        await embedResponse.text();
    }
  } catch (error) {
    console.warn(
      "Instagram embed image unavailable:",
      error
    );
  }

  const metaDescription =
    getMetaContent(
      html,
      "og:description"
    );

  const primaryImage =
    getMetaContent(
      html,
      "og:image"
    );

  const canonicalUrl =
    normalizeUrl(
      getMetaContent(
        html,
        "og:url"
      ),
      details.canonicalUrl
    ) ||
    getCanonicalUrl(
      html,
      details.canonicalUrl
    );

  const description =
    extractInstagramCaption(
      metaDescription
    );

const postDate =
  extractInstagramPostDate(
    html,
    embedHtml,
    metaDescription
  );

  const imageUrls =
    extractInstagramImages(
      embedHtml || html,
      primaryImage
    );

  if (
    !description &&
    imageUrls.length === 0
  ) {
    throw new Error(
      "Instagram did not expose a caption or image for this post. Make sure it is public."
    );
  }

  const username =
    canonicalUrl.match(
      /instagram\.com\/([^/]+)\/(?:p|reel|tv)\//i
    )?.[1] || "";

  const title =
    description
      .replace(/\s+/g, " ")
      .slice(0, 200) ||
    `Instagram post ${details.shortcode}`;

  return {
    ok: true,
    marketplace:
      "instagram",
    sourceUrl:
      canonicalUrl,
    listingId:
      details.shortcode,
    title,
    seller:
      username
        ? `@${username}`
        : "Instagram",
    price: "",
    currency: "",
    endDate: postDate,
    description,
    frontImage:
      imageUrls[0] || "",
    additionalImages:
      imageUrls.slice(1),
    aspects: {},
  };
}

const ALT_GRAPHQL_URL =
  "https://alt-platform-server.production.internal.onlyalt.com/graphql/SoldListing";

const ALT_LIVE_GRAPHQL_URL =
  "https://alt-platform-server.production.internal.onlyalt.com/graphql/PublicListingWithTransaction";

const ALT_SOLD_LISTING_QUERY = `
  query SoldListing($id: ID!) {
    externalTransaction(id: $id) {
      date
      id
      auctionHouse
      auctionName
      auctionType
      displayPrice
      label
      fees
      shipping
      usdAmount
      consolidatedSkippedReason
      currency
      asset {
        id
        name
        year
        subject
        category
        brand
        variety
        attributes {
          cardNumber
          printRun
        }
      }
      attributes {
        grade
        gradingCompany
        cert
        url
        autograph
        imgThumbnailUrl
        images {
          position
          url
        }
      }
      subjectToChange
    }
  }
`;

const ALT_LIVE_LISTING_QUERY = `
  query PublicListingWithTransaction($listingId: ID!) {
    publicListing(id: $listingId) {
      publicListing {
        id
        minOfferPrice
        listPrice
        state
        createdAt
        type
        expiresAt
        subtitle
        description
        items {
          id
          displayNames {
            itemName
            groupName
            assetName
          }
          images {
            position
            url
          }
          attributes {
            gradeNumber
            gradingCompany
            serial
            printRun
            certNumber
            autograph
            qualifier
          }
          asset {
            id
            name
            year
            subject
            category
            brand
            variety
            attributes {
              cardNumber
              printRun
            }
          }
        }
      }
    }
    listingExternalTransaction(
      listingId: $listingId
    ) {
      id
      date
      auctionHouse
      price
      asset {
        id
      }
    }
  }
`;

function extractAltListingId(
  sourceUrl: string
) {
  const parsed = new URL(sourceUrl);
  const match = parsed.pathname.match(
    /\/itm\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i
  );

  if (!match) {
    throw new Error(
      "Unable to find an Alt sold-listing ID in this URL."
    );
  }

  return match[1];
}

function normalizeAltSport(
  value: unknown
) {
  const category = clean(value)
    .replace(/_/g, " ")
    .toLowerCase();

  const sports: Array<
    [RegExp, string]
  > = [
    [/\bbaseball\b/, "Baseball"],
    [/\bbasketball\b/, "Basketball"],
    [/\bfootball\b/, "Football"],
    [/\bhockey\b/, "Hockey"],
    [/\bsoccer\b/, "Soccer"],
    [/\bgolf\b/, "Golf"],
    [/\bwrestling\b/, "Wrestling"],
    [/\bpok[eé]mon\b|\btcg\b/, "Pokémon/TCG"],
  ];

  for (const [pattern, sport] of sports) {
    if (pattern.test(category)) {
      return sport;
    }
  }

  return "";
}

async function importAltSoldListing(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const listingId =
    extractAltListingId(sourceUrl);

  const response = await fetch(
    ALT_GRAPHQL_URL,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type":
          "application/json",
        Origin: "https://alt.xyz",
        Referer: sourceUrl,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        operationName:
          "SoldListing",
        variables: {
          id: listingId,
        },
        query:
          ALT_SOLD_LISTING_QUERY,
      }),
      cache: "no-store",
    }
  );

  const text = await response.text();
  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Alt returned invalid JSON (${response.status}). First response text: ${text.slice(
        0,
        300
      )}`
    );
  }

  if (
    !response.ok ||
    json?.errors?.length
  ) {
    throw new Error(
      clean(
        json?.errors?.[0]?.message
      ) ||
        `Alt listing import failed with status ${response.status}.`
    );
  }

  const transaction =
    json?.data?.externalTransaction;

  if (!transaction) {
    throw new Error(
      "Alt returned no sold-listing data for this URL."
    );
  }

  const asset =
    transaction.asset || {};

  const attributes =
    transaction.attributes || {};

  const assetAttributes =
    asset.attributes || {};

  const year = clean(asset.year);
  const subject = clean(
    asset.subject
  );
  const brand = clean(asset.brand);
  const variety = clean(
    asset.variety
  );
  const cardNumber = clean(
    assetAttributes.cardNumber
  );
  const printRun = clean(
    assetAttributes.printRun
  );
  const sport = normalizeAltSport(
    asset.category
  );

  const gradingCompany = clean(
    attributes.gradingCompany
  ).toUpperCase();

  const numericGrade = clean(
    attributes.grade
  );

  const grade = [
    gradingCompany,
    numericGrade,
  ]
    .filter(Boolean)
    .join(" ");

  const images = Array.isArray(
    attributes.images
  )
    ? attributes.images
        .map((image: any) => ({
          position: clean(
            image?.position
          ).toUpperCase(),
          url: normalizeUrl(
            image?.url
          ),
        }))
        .filter(
          (image: {
            position: string;
            url: string;
          }) => image.url
        )
    : [];

  const frontImage =
    images.find(
      (image: {
        position: string;
        url: string;
      }) =>
        image.position === "FRONT"
    )?.url ||
    normalizeUrl(
      attributes.imgThumbnailUrl
    );

  const remainingImages =
    uniqueUrls(
      images
        .filter(
          (image: {
            position: string;
            url: string;
          }) =>
            image.url !== frontImage
        )
        .sort(
          (
            left: {
              position: string;
            },
            right: {
              position: string;
            }
          ) =>
            Number(
              right.position === "BACK"
            ) -
            Number(
              left.position === "BACK"
            )
        )
        .map(
          (image: {
            url: string;
          }) => image.url
        )
    );

  const aspects: Record<
    string,
    string[]
  > = {};

  if (year) {
    aspects.Year = [year];
    aspects.Season = [year];
  }

  if (subject) {
    aspects["Player/Athlete"] = [
      subject,
    ];
  }

  if (sport) {
    aspects.Sport = [sport];
  }

  if (brand) {
    aspects.Brand = [brand];
    aspects.Manufacturer = [brand];
    aspects.Set = [brand];
  }

  if (cardNumber) {
    aspects["Card Number"] = [
      cardNumber,
    ];
  }

  if (variety) {
    aspects["Parallel/Variety"] = [
      variety,
    ];
  }

  const autoGrade = clean(
    attributes.autograph
  ).replace(/\.0$/, "");

  const priceValue =
    transaction.usdAmount ??
    transaction.displayPrice;

  return {
    ok: true,
    marketplace: "alt",
    sourceUrl,
    listingId,
    title:
      clean(asset.name) ||
      `Alt sold listing ${listingId}`,
    seller:
      clean(
        transaction.auctionHouse
      ) || "Alt",
    price:
      priceValue === null ||
      priceValue === undefined
        ? ""
        : clean(priceValue),
    currency:
      clean(transaction.currency) ||
      "USD",
    endDate: clean(transaction.date),
    certNumber: clean(
      attributes.cert
    ),
    grade,
    serialNumber: printRun
      ? `/${printRun}`
      : "",
    description: autoGrade
      ? `Auto Grade ${autoGrade}`
      : "",
    frontImage,
    additionalImages:
      remainingImages,
    aspects,
  };
}

async function importAltLiveListing(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const listingId =
    extractAltListingId(sourceUrl);

  const response = await fetch(
    ALT_LIVE_GRAPHQL_URL,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type":
          "application/json",
        Origin: "https://alt.xyz",
        Referer: sourceUrl,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        operationName:
          "PublicListingWithTransaction",
        variables: {
          listingId,
        },
        query:
          ALT_LIVE_LISTING_QUERY,
      }),
      cache: "no-store",
    }
  );

  const text = await response.text();

  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Alt returned invalid JSON (${response.status}). First response text: ${text.slice(
        0,
        300
      )}`
    );
  }

  if (
    !response.ok ||
    json?.errors?.length
  ) {
    throw new Error(
      clean(
        json?.errors?.[0]?.message
      ) ||
        `Alt live listing import failed with status ${response.status}.`
    );
  }

  const listing =
    json?.data?.publicListing
      ?.publicListing;

  if (!listing) {
    throw new Error(
      "Alt returned no live-listing data for this URL."
    );
  }

  const item = Array.isArray(
    listing.items
  )
    ? listing.items[0]
    : null;

  if (!item) {
    throw new Error(
      "Alt returned no card information for this listing."
    );
  }

  const asset =
    item.asset || {};

  const attributes =
    item.attributes || {};

  const assetAttributes =
    asset.attributes || {};

  const displayNames =
    item.displayNames || {};

  const year =
    clean(asset.year);

  const subject =
    clean(asset.subject);

  const brand =
    clean(asset.brand);

  const variety =
    clean(asset.variety);

  const cardNumber =
    clean(
      assetAttributes.cardNumber
    );

  const serial =
    clean(attributes.serial);

  const printRun =
    clean(
      attributes.printRun ||
        assetAttributes.printRun
    );

  const sport =
    normalizeAltSport(
      asset.category
    );

  const gradingCompany =
    clean(
      attributes.gradingCompany
    ).toUpperCase();

  const numericGrade =
    clean(
      attributes.gradeNumber
    );

  const grade = [
    gradingCompany,
    numericGrade,
  ]
    .filter(Boolean)
    .join(" ");

  const imageRecords =
    Array.isArray(item.images)
      ? item.images
          .map((image: any) => ({
            position: clean(
              image?.position
            ).toUpperCase(),

            url: normalizeUrl(
              image?.url
            ),
          }))
          .filter(
            (image: {
              position: string;
              url: string;
            }) => image.url
          )
      : [];

  const frontImage =
    imageRecords.find(
      (image: {
        position: string;
        url: string;
      }) =>
        image.position === "FRONT"
    )?.url || "";

  const additionalImages =
    uniqueUrls(
      imageRecords
        .filter(
          (image: {
            position: string;
            url: string;
          }) =>
            image.url !== frontImage
        )
        .sort(
          (
            left: {
              position: string;
            },
            right: {
              position: string;
            }
          ) =>
            Number(
              right.position === "BACK"
            ) -
            Number(
              left.position === "BACK"
            )
        )
        .map(
          (image: {
            url: string;
          }) => image.url
        )
    );

  const aspects: Record<
    string,
    string[]
  > = {};

  if (year) {
    aspects.Year = [year];
    aspects.Season = [year];
  }

  if (subject) {
    aspects["Player/Athlete"] = [
      subject,
    ];
  }

  if (sport) {
    aspects.Sport = [sport];
  }

  if (brand) {
    aspects.Brand = [brand];
    aspects.Manufacturer = [brand];
    aspects.Set = [brand];
  }

  if (cardNumber) {
    aspects["Card Number"] = [
      cardNumber,
    ];
  }

  if (variety) {
    aspects["Parallel/Variety"] = [
      variety,
    ];
  }

  const autographGrade =
    clean(
      attributes.autograph
    ).replace(/\.0$/, "");

  const rawPrice =
    listing.listPrice ??
    listing.minOfferPrice;

  const numericPrice =
    Number(rawPrice);

  const price =
    rawPrice === null ||
    rawPrice === undefined ||
    rawPrice === ""
      ? ""
      : Number.isFinite(
          numericPrice
        )
      ? String(numericPrice)
      : clean(rawPrice);

  const serialNumber =
    serial && printRun
      ? `${serial}/${printRun}`
      : printRun
      ? `/${printRun}`
      : serial;

  const description = [
    autographGrade
      ? `Auto Grade ${autographGrade}`
      : "",

    clean(listing.description),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ok: true,
    marketplace: "alt",
    sourceUrl,
    listingId,

    title:
      clean(
        displayNames.itemName
      ) ||
      clean(asset.name) ||
      `Alt live listing ${listingId}`,

    seller: "Alt",

    price,
    currency: "USD",

    endDate:
      clean(listing.expiresAt),

    certNumber:
      clean(
        attributes.certNumber
      ),

    grade,
    serialNumber,
    description,
    frontImage,
    additionalImages,
    aspects,
  };
}

async function importAltListing(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const parsed =
    new URL(sourceUrl);

  const isSoldPage =
    /\/sold\/?$/i.test(
      parsed.pathname
    );

  if (isSoldPage) {
    return importAltSoldListing(
      sourceUrl
    );
  }

  return importAltLiveListing(
    sourceUrl
  );
}

function extractHeritageLotDetails(
  sourceUrl: string
) {
  const parsed =
    new URL(sourceUrl);

  /*
   * Heritage lot URLs normally end with:
   *
   * /a/50074-81418.s
   *
   * First number = auction number
   * Second number = lot number
   */
  const pathMatch =
    parsed.pathname.match(
      /\/a\/(\d+)-(\d+)\.s(?:\/|$)/i
    );

  if (!pathMatch) {
    throw new Error(
      "Unable to determine the Heritage auction and lot numbers."
    );
  }

  return {
    auctionNumber:
      pathMatch[1],

    lotNumber:
      pathMatch[2],

    canonicalUrl:
      `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
  };
}

function stripHeritageHtml(
  value: unknown
) {
  return decodeHtml(
    String(value || "")
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
      .replace(/\s+/g, " ")
      .trim()
  );
}

function normalizeHeritageImageUrl(
  value: unknown,
  sourceUrl: string
) {
  let url =
    normalizeUrl(
      value,
      sourceUrl
    );

  if (!url) {
    return "";
  }

  url = url
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/");

  try {
    const parsed =
      new URL(url);

    const hostname =
      parsed.hostname.toLowerCase();

    const allowed =
      hostname ===
        "heritagestatic.com" ||
      hostname.endsWith(
        ".heritagestatic.com"
      ) ||
      hostname === "ha.com" ||
      hostname.endsWith(".ha.com");

    if (!allowed) {
      return "";
    }

    if (
      /logo|avatar|icon|sprite|placeholder|headquarters|office-building/i.test(
        parsed.pathname
      )
    ) {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

function extractHeritageImages(
  html: string,
  sourceUrl: string
) {
  const candidates: string[] = [];

  /*
   * Start with structured-data images because these are
   * most likely to belong to the actual auction lot.
   */
  const jsonLdScripts =
    extractScriptContents(
      html,
      "application/ld+json"
    );

  jsonLdScripts.forEach(
    (script) => {
      try {
        const parsed =
          JSON.parse(script);

        collectImageUrlsFromJson(
          parsed,
          candidates
        );
      } catch {
        // Ignore malformed JSON-LD.
      }
    }
  );

  /*
   * Heritage commonly exposes its primary lot image in
   * Open Graph and Twitter metadata.
   */
  candidates.push(
    getMetaContent(
      html,
      "og:image"
    ),

    getMetaContent(
      html,
      "og:image:url"
    ),

    getMetaContent(
      html,
      "og:image:secure_url"
    ),

    getMetaContent(
      html,
      "twitter:image"
    ),

    getMetaContent(
      html,
      "twitter:image:src"
    )
  );

  /*
   * Add only Heritage-hosted image URLs from the page.
   * Do not collect arbitrary images from unrelated hosts.
   */
  const imageRegex =
    /https?:\\?\/\\?\/[^"'<>\\\s]*(?:heritagestatic\.com|ha\.com)[^"'<>\\\s]*?\.(?:jpe?g|png|webp)(?:\\?[^"'<>\\\s]*)?/gi;

  for (
    const match of html.matchAll(
      imageRegex
    )
  ) {
    candidates.push(
      match[0]
        .replace(
          /\\u0026/gi,
          "&"
        )
        .replace(
          /\\\//g,
          "/"
        )
    );
  }

  const unique: string[] = [];
  const seen =
    new Set<string>();

  candidates.forEach(
    (candidate) => {
      const url =
        normalizeHeritageImageUrl(
          candidate,
          sourceUrl
        );

      if (!url) {
        return;
      }

      /*
       * Ignore common resize and quality parameters when
       * deciding whether two URLs represent the same image.
       */
      const key = url
        .replace(
          /[?&](?:width|height|w|h|quality|q|format)=[^&]+/gi,
          ""
        )
        .replace(/[?&]$/g, "")
        .toLowerCase();

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      unique.push(url);
    }
  );

  return unique.slice(0, 10);
}

function extractHeritageSoldDate(
  html: string
) {
  const text =
    stripHeritageHtml(html);

  const soldDate =
    text.match(
      /\bSold on\s+([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})\b/i
    )?.[1];

  if (soldDate) {
    const parsed =
      new Date(soldDate);

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed.toISOString();
    }
  }

  const structuredDate =
    html.match(
      /"(?:endDate|datePublished|dateCreated|availabilityEnds)"\s*:\s*"([^"]+)"/i
    )?.[1];

  if (structuredDate) {
    const parsed =
      new Date(
        structuredDate
      );

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed.toISOString();
    }
  }

  return "";
}

function extractHeritagePrice(
  html: string
) {
  const text =
    stripHeritageHtml(html);

  const soldPrice =
    text.match(
      /Sold on\s+[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}\s+for:\s*\$([\d,]+(?:\.\d{1,2})?)/i
    )?.[1] ||
    text.match(
      /\bSold For:\s*\$([\d,]+(?:\.\d{1,2})?)/i
    )?.[1];

  if (soldPrice) {
    return {
      price:
        soldPrice.replace(
          /,/g,
          ""
        ),

      currency: "USD",
    };
  }

  const structuredPrice =
    html.match(
      /"(?:price|highPrice|lowPrice)"\s*:\s*"?\$?([\d,]+(?:\.\d{1,2})?)"?/i
    )?.[1];

  return {
    price:
      structuredPrice
        ? structuredPrice.replace(
            /,/g,
            ""
          )
        : "",

    currency:
      structuredPrice
        ? "USD"
        : "",
  };
}

function extractHeritageDescription(
  html: string
) {
  const metaDescription =
    getMetaContent(
      html,
      "description"
    ) ||
    getMetaContent(
      html,
      "og:description"
    );

  if (metaDescription) {
    return stripHeritageHtml(
      metaDescription
    );
  }

  const descriptionMatch =
    html.match(
      /<h2[^>]*>\s*Description\s*<\/h2>([\s\S]{0,20000}?)(?:<h2|Auction Info|<\/section>)/i
    )?.[1];

  return stripHeritageHtml(
    descriptionMatch || ""
  );
}

function extractHeritageCertNumber(
  html: string
) {
  const patterns = [
    /psacard\.com\/cert\/(\d{6,12})/i,
    /\/cert\/(\d{6,12})(?:\/|["'?&])/i,
    /\bcert(?:ification)?\s*(?:number|#|no\.?)?\s*[:#]?\s*(\d{6,12})\b/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      html.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

async function importHeritageAuction(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const lotDetails =
    extractHeritageLotDetails(
      sourceUrl
    );

  const response =
    await fetch(
      lotDetails.canonicalUrl,
      {
        method: "GET",

        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

          "Accept-Language":
            "en-US,en;q=0.9",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
        },

        cache: "no-store",
        redirect: "follow",
      }
    );

  const html =
    await response.text();

  if (
    !response.ok ||
    !html ||
    html.length < 500
  ) {
    throw new Error(
      `Heritage Auctions import failed with status ${response.status}.`
    );
  }

  const finalUrl =
    response.url ||
    lotDetails.canonicalUrl;

  const title =
    getMetaContent(
      html,
      "og:title"
    ) ||
    getMetaContent(
      html,
      "twitter:title"
    ) ||
    stripHeritageHtml(
      html.match(
        /<h1[^>]*>([\s\S]*?)<\/h1>/i
      )?.[1] || ""
    ) ||
    stripHeritageHtml(
      html.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
      )?.[1] || ""
    );

  const cleanedTitle =
    title
      .replace(
        /\s*\|\s*Lot\s*#?\d+[\s\S]*$/i,
        ""
      )
      .replace(
        /\s*\|\s*Heritage Auctions\s*$/i,
        ""
      )
      .trim();

  const images =
    extractHeritageImages(
      html,
      finalUrl
    );

  const price =
    extractHeritagePrice(
      html
    );

  const description =
    extractHeritageDescription(
      html
    );

  if (
    !cleanedTitle &&
    images.length === 0
  ) {
    throw new Error(
      "Heritage Auctions did not expose the lot title or images."
    );
  }

  return {
    ok: true,

    marketplace:
      "heritage",

    sourceUrl:
      getCanonicalUrl(
        html,
        finalUrl
      ) || finalUrl,

    listingId:
      lotDetails.lotNumber,

    lotNumber:
      lotDetails.lotNumber,

    title:
      cleanedTitle,

    seller:
      "Heritage Auctions",

    price:
      price.price,

    currency:
      price.currency,

    endDate:
      extractHeritageSoldDate(
        html
      ),

    certNumber:
      extractHeritageCertNumber(
        html
      ),

    description,

    frontImage:
      images[0] || "",

    additionalImages:
      images.slice(1),

    aspects: {
      "Auction Number": [
        lotDetails.auctionNumber,
      ],

      "Lot Number": [
        lotDetails.lotNumber,
      ],
    },
  };
}

/* =========================================================
MYSLABS
========================================================= */

function extractMySlabsListingId(
  sourceUrl: string
) {
  const parsed =
    new URL(sourceUrl);

  const match =
    parsed.pathname.match(
      /\/slab\/view\/(\d+)(?:\/|$)/i
    );

  if (!match?.[1]) {
    throw new Error(
      "Unable to determine the MySlabs listing ID from this URL."
    );
  }

  return match[1];
}

function stripMySlabsHtml(
  value: unknown
) {
  return decodeHtml(
    clean(value)
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
  ).trim();
}

function cleanMySlabsTitle(
  value: unknown
) {
  return stripMySlabsHtml(
    value
  )
    .replace(
      /\s*\|\s*MySlabs\s*$/i,
      ""
    )
    .replace(
      /\s+on\s+MySlabs\s*$/i,
      ""
    )
    .trim();
}

function extractMySlabsImages(
  html: string,
  sourceUrl: string
) {
  const candidates: string[] = [];

  /*
   * Collect normal image attributes.
   */
  const attributeRegex =
    /(?:src|data-src|data-lazy-src|href)=["']([^"']+\.(?:jpe?g|png|webp|avif)(?:\?[^"']*)?)["']/gi;

  for (
    const match of html.matchAll(
      attributeRegex
    )
  ) {
    if (match[1]) {
      candidates.push(
        match[1]
      );
    }
  }

  /*
   * MySlabs can also expose image URLs inside
   * escaped JavaScript/page data.
   */
  const escapedRegex =
    /https?:\\?\/\\?\/[^"'<>\\\s]+?\.(?:jpe?g|png|webp|avif)(?:\\?[^"'<>\\\s]*)?/gi;

  for (
    const match of html.matchAll(
      escapedRegex
    )
  ) {
    candidates.push(
      match[0]
        .replace(
          /\\u0026/g,
          "&"
        )
        .replace(
          /\\\//g,
          "/"
        )
    );
  }

  /*
   * Metadata fallbacks.
   */
  candidates.push(
    getMetaContent(
      html,
      "og:image"
    ),
    getMetaContent(
      html,
      "og:image:url"
    ),
    getMetaContent(
      html,
      "twitter:image"
    )
  );

  const excluded = [
    /logo/i,
    /favicon/i,
    /banner/i,
    /social/i,
    /instagram/i,
    /twitter/i,
    /facebook/i,
    /ebay/i,
    /beckett-logo/i,
    /spinner/i,
    /placeholder/i,
    /icon/i,
    /flag/i,
    /google/i,
    /130point/i,
  ];

  const normalized =
    uniqueUrls(
      candidates,
      sourceUrl
    ).filter(
      (url) =>
        !excluded.some(
          (pattern) =>
            pattern.test(url)
        )
    );

  /*
   * Prefer actual MySlabs listing photos.
   *
   * Current MySlabs filenames look like:
   *
   *   NZRKXFA_1646178569_1.png
   *   NZRKXFA_1646178569_2.png
   *
   * The same physical image may appear several
   * times with different width/quality parameters.
   *
   * Deduplicate by pathname so all resized versions
   * of _1.png become one image, all resized versions
   * of _2.png become one image, etc.
   */
  const numbered =
    normalized.filter(
      (url) =>
        /_\d+\.(?:jpe?g|png|webp|avif)(?:\?|$)/i.test(
          url
        )
    );

  if (numbered.length) {
    const byImage =
      new Map<
        string,
        string
      >();

    for (
      const imageUrl of numbered
    ) {
      let parsed: URL;

      try {
        parsed =
          new URL(imageUrl);
      } catch {
        continue;
      }

      /*
       * Query parameters such as width and quality
       * do not define a different physical photo.
       */
      const key =
        `${parsed.hostname}${parsed.pathname}`
          .toLowerCase();

      const existing =
        byImage.get(key);

      if (!existing) {
        byImage.set(
          key,
          imageUrl
        );
        continue;
      }

      /*
       * If several resized versions exist,
       * keep the one with the largest requested width.
       */
      const widthOf = (
        value: string
      ) => {
        try {
          const url =
            new URL(value);

          return Number(
            url.searchParams.get(
              "width"
            ) ||
              url.searchParams.get(
                "w"
              ) ||
              0
          );
        } catch {
          return 0;
        }
      };

      if (
        widthOf(imageUrl) >
        widthOf(existing)
      ) {
        byImage.set(
          key,
          imageUrl
        );
      }
    }

    /*
     * Sort _1, _2, _3... in their intended order.
     */
    return Array.from(
      byImage.values()
    ).sort(
      (a, b) => {
        const aNumber =
          Number(
            a.match(
              /_(\d+)\.(?:jpe?g|png|webp|avif)(?:\?|$)/i
            )?.[1] ||
              999999
          );

        const bNumber =
          Number(
            b.match(
              /_(\d+)\.(?:jpe?g|png|webp|avif)(?:\?|$)/i
            )?.[1] ||
              999999
          );

        return (
          aNumber -
          bNumber
        );
      }
    );
  }

  /*
   * Fallback for MySlabs pages that do not use
   * numbered listing-image filenames.
   */
  const large =
    normalized.filter(
      (url) =>
        /(?:\?|&)width=(?:800|1000|1200|1600)(?:&|$)/i.test(
          url
        ) ||
        /(?:\?|&)w=(?:800|1000|1200|1600)(?:&|$)/i.test(
          url
        )
    );

  return large.length
    ? large
    : normalized;
}

function extractMySlabsPrice(
  html: string
) {
  const structured =
    getMetaContent(
      html,
      "product:price:amount"
    ) ||
    getMetaContent(
      html,
      "og:price:amount"
    );

  if (structured) {
    return {
      price:
        structured.replace(
          /,/g,
          ""
        ),

      currency:
        getMetaContent(
          html,
          "product:price:currency"
        ) ||
        getMetaContent(
          html,
          "og:price:currency"
        ) ||
        "USD",
    };
  }

  const patterns =
    [
      /\b(?:asking\s+price|sale\s+price|price)\s*[:\-]?\s*\$([\d,]+(?:\.\d{1,2})?)/i,

      /\b(?:sold\s+for|sold)\s*[:\-]?\s*\$([\d,]+(?:\.\d{1,2})?)/i,

      /\$\s*([\d,]+(?:\.\d{1,2})?)/,
    ];

  for (
    const pattern of patterns
  ) {
    const match =
      html.match(pattern);

    if (match?.[1]) {
      return {
        price:
          match[1].replace(
            /,/g,
            ""
          ),

        currency:
          "USD",
      };
    }
  }

  return {
    price: "",
    currency: "",
  };
}

function extractMySlabsSoldDate(
  html: string
) {
  /*
   * MySlabs displays completed-sale dates as:
   *
   * Mar 12, 2022
   *
   * Search the visible page text rather than scripts/styles
   * so unrelated JavaScript dates are not selected.
   */
  const text =
    stripMySlabsHtml(html);

  const monthPattern =
    "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

  /*
   * Prefer a date appearing shortly after SOLD.
   * Example:
   *
   * $2,225 / SOLD
   * Mar 12, 2022
   */
  const soldMatch =
    text.match(
      new RegExp(
        `\\bSOLD\\b[\\s\\S]{0,150}?(${monthPattern}\\s+\\d{1,2},\\s+\\d{4})`,
        "i"
      )
    );

  if (soldMatch?.[1]) {
    return soldMatch[1];
  }

  /*
   * Fallback for MySlabs pages where the date is visible
   * but SOLD is separated from it by additional markup/text.
   */
  const dateMatch =
    text.match(
      new RegExp(
        `\\b(${monthPattern}\\s+\\d{1,2},\\s+\\d{4})\\b`,
        "i"
      )
    );

  return dateMatch?.[1] || "";
}

function extractMySlabsDescription(
  html: string
) {
  return stripMySlabsHtml(
    getMetaContent(
      html,
      "description"
    ) ||
      getMetaContent(
        html,
        "og:description"
      )
  );
}

async function importMySlabsListing(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const listingId =
    extractMySlabsListingId(
      sourceUrl
    );

  const response =
    await fetch(
      sourceUrl,
      {
        method:
          "GET",

        redirect:
          "follow",

        cache:
          "no-store",

        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

          "Accept-Language":
            "en-US,en;q=0.9",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
        },
      }
    );

  const html =
    await response.text();

  if (
    !response.ok ||
    !html ||
    html.length < 500
  ) {
    throw new Error(
      `MySlabs import failed with status ${response.status}.`
    );
  }

  const finalUrl =
    response.url ||
    sourceUrl;

  const rawTitle =
    getMetaContent(
      html,
      "og:title"
    ) ||
    getMetaContent(
      html,
      "twitter:title"
    ) ||
    decodeHtml(
      html.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
      )?.[1] ||
        ""
    );

  const title =
    cleanMySlabsTitle(
      rawTitle
    );

  const images =
    extractMySlabsImages(
      html,
      finalUrl
    );

  const price =
    extractMySlabsPrice(
      html
    );

  const description =
    extractMySlabsDescription(
      html
    );

  /*
   * IMPORTANT:
   *
   * The MySlabs page contains generic CertNumber
   * JavaScript, but the actual listing-specific
   * BGS cert was not present as searchable text
   * in the Larry Bird test listing.
   *
   * Do NOT OCR or guess the cert number.
   */
  const certNumber = "";

  if (
    !title &&
    images.length === 0
  ) {
    throw new Error(
      "MySlabs did not expose the listing title or card images."
    );
  }

  return {
    ok: true,

    marketplace:
      "myslabs",

    sourceUrl:
      getCanonicalUrl(
        html,
        finalUrl
      ) ||
      finalUrl,

    listingId,

    title,

    seller:
      "MySlabs",

    price:
      price.price,

    currency:
      price.currency ||
      "USD",

    endDate:
  extractMySlabsSoldDate(
    html
  ),

    certNumber,

    description,

    frontImage:
      images[0] ||
      "",

    additionalImages:
      images.slice(1),

    aspects: {},
  };
}

/* =========================================================
BLOWOUT FORUMS
========================================================= */

function extractBlowoutPostId(
  sourceUrl: string
) {
  const parsed =
    new URL(sourceUrl);

  /*
   * Individual post:
   * showpost.php?p=17061022
   *
   * Thread URL:
   * showthread.php?p=17061022
   */
  const queryPost =
    clean(
      parsed.searchParams.get(
        "p"
      )
    );

  if (
    /^\d+$/.test(queryPost)
  ) {
    return queryPost;
  }

  /*
   * Also support:
   * #post17061022
   */
  const hashMatch =
    parsed.hash.match(
      /post(\d+)/i
    );

  if (hashMatch?.[1]) {
    return hashMatch[1];
  }

  throw new Error(
    "Unable to determine the Blowout post ID from this URL."
  );
}

function extractBlowoutMessageHtml(
  html: string,
  postId: string
) {
  /*
   * First locate the post ID anywhere in the
   * server-returned HTML.
   */
  const postIdIndex =
    html.indexOf(postId);

  /*
   * Look for the normal vBulletin message ID,
   * allowing whitespace around "=" and either
   * quote style.
   */
  const markerRegex =
    new RegExp(
      `id\\s*=\\s*["']post_message_${escapeRegExp(
        postId
      )}["']`,
      "i"
    );

  const markerMatch =
    markerRegex.exec(html);

  if (!markerMatch) {
    /*
     * TEMPORARY DIAGNOSTIC:
     *
     * Show us the actual HTML surrounding the
     * post ID returned to the Next.js server.
     */
    const nearby =
      postIdIndex >= 0
        ? html.slice(
            Math.max(
              0,
              postIdIndex - 500
            ),
            Math.min(
              html.length,
              postIdIndex + 1500
            )
          )
        : html.slice(
            0,
            2000
          );

    throw new Error(
      `Blowout post container could not be located.

Post ID: ${postId}
HTML length: ${html.length}
Contains post ID: ${
        postIdIndex >= 0
      }
Contains post_message_: ${html.includes(
        "post_message_"
      )}

SERVER HTML:
${nearby}`
    );
  }

  const markerIndex =
    markerMatch.index;

  const contentStart =
    html.indexOf(
      ">",
      markerIndex
    );

  if (contentStart < 0) {
    throw new Error(
      "Blowout post message opening tag could not be parsed."
    );
  }

  /*
   * vBulletin ends the message area with:
   *
   * <!-- / message -->
   *
   * Allow whitespace differences in that
   * comment instead of requiring one exact
   * literal string.
   */
  const afterStart =
    html.slice(
      contentStart + 1
    );

  const endMatch =
    /<!--\s*\/\s*message\s*-->/i.exec(
      afterStart
    );

  if (!endMatch) {
    throw new Error(
      `Blowout post message end marker could not be located.

Post ID: ${postId}
HTML length: ${html.length}

SERVER HTML:
${afterStart.slice(0, 2000)}`
    );
  }

  const contentEnd =
    contentStart +
    1 +
    endMatch.index;

  let messageHtml =
    html
      .slice(
        contentStart + 1,
        contentEnd
      )
      .trim();

  /*
   * Remove the closing tag belonging to the
   * post_message container itself.
   */
  messageHtml =
    messageHtml.replace(
      /<\/div>\s*$/i,
      ""
    );

  return messageHtml.trim();
}

function stripBlowoutPostHtml(
  value: string
) {
  return decodeHtml(
    value
      /*
       * Preserve the author's intended
       * line breaks before stripping tags.
       */
      .replace(
        /<br\s*\/?>/gi,
        "\n"
      )
      .replace(
        /<\/p>/gi,
        "\n"
      )
      .replace(
        /<\/div>/gi,
        "\n"
      )
      .replace(
        /<img\b[^>]*>/gi,
        ""
      )
      .replace(
        /<[^>]+>/g,
        ""
      )
      .replace(
        /\r/g,
        ""
      )
      .replace(
        /[ \t]+\n/g,
        "\n"
      )
      .replace(
        /\n[ \t]+/g,
        "\n"
      )
      .replace(
        /\n{3,}/g,
        "\n\n"
      )
      .trim()
  );
}

function extractBlowoutUsername(
  html: string,
  postId: string
) {
  const marker =
    `post_message_${postId}`;

  const index =
    html.indexOf(marker);

  if (index < 0) {
    return "";
  }

  /*
   * Username appears before the message body
   * in the individual post container.
   */
  const before =
    html.slice(
      Math.max(
        0,
        index - 12000
      ),
      index
    );

  const matches =
    Array.from(
      before.matchAll(
        /<a[^>]+class=["'][^"']*\bbigusername\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi
      )
    );

  const last =
    matches[
      matches.length - 1
    ];

  return last?.[1]
    ? stripBlowoutPostHtml(
        last[1]
      )
    : "";
}

function extractBlowoutPostDate(
  html: string,
  postId: string
) {
  const marker =
    `post_message_${postId}`;

  const index =
    html.indexOf(marker);

  if (index < 0) {
    return "";
  }

  /*
   * The post header is immediately before
   * the message body.
   *
   * Example:
   * 03-02-2021, 01:04 PM
   */
  const before =
    html.slice(
      Math.max(
        0,
        index - 12000
      ),
      index
    );

  const matches =
    Array.from(
      before.matchAll(
        /\b(\d{1,2}-\d{1,2}-\d{4})(?:,\s*\d{1,2}:\d{2}\s*(?:AM|PM))?/gi
      )
    );

  const last =
    matches[
      matches.length - 1
    ];

  return last?.[1] || "";
}

function extractBlowoutImages(
  messageHtml: string,
  sourceUrl: string
) {
  const candidates: string[] = [];

  /*
   * Prefer full-size images linked around
   * thumbnails when Blowout users use them.
   */
  for (
    const match of messageHtml.matchAll(
      /<a[^>]+href=["']([^"']+\.(?:jpe?g|png|webp|gif)(?:\?[^"']*)?)["'][^>]*>[\s\S]*?<img\b/gi
    )
  ) {
    if (match[1]) {
      candidates.push(
        match[1]
      );
    }
  }

  /*
   * Normal embedded post images.
   */
  for (
    const match of messageHtml.matchAll(
      /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    )
  ) {
    if (match[1]) {
      candidates.push(
        match[1]
      );
    }
  }

  return uniqueUrls(
    candidates,
    sourceUrl
  ).filter(
    (url) =>
      !/\/(?:images|image)\/(?:smilies|avatars|icons)\//i.test(
        url
      ) &&
      !/smilie|avatar|signature|favicon/i.test(
        url
      )
  );
}

function detectBlowoutCertNumbers(
  text: string
) {
  const certs =
    new Set<string>();

  const patterns = [
    /\b(?:PSA|BGS|BECKETT|SGC|CGC|CSG)\s+(?:CERT(?:IFICATION)?\s*)?#?\s*(\d{6,12})\b/gi,

    /\bCERT(?:IFICATION)?\s*#?\s*(\d{6,12})\b/gi,
  ];

  for (
    const pattern of patterns
  ) {
    for (
      const match of text.matchAll(
        pattern
      )
    ) {
      if (match[1]) {
        certs.add(
          match[1]
        );
      }
    }
  }

  return Array.from(certs);
}

function detectBlowoutGrades(
  text: string
) {
  const grades =
    new Set<string>();

  const pattern =
    /\b(PSA|BGS|BECKETT|SGC|CGC|CSG)\s+(AUTHENTIC(?:\s+ALTERED)?|10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/gi;

  for (
    const match of text.matchAll(
      pattern
    )
  ) {
    const company =
      String(
        match[1] || ""
      )
        .toUpperCase()
        .replace(
          "BECKETT",
          "BGS"
        );

    const grade =
      clean(match[2]);

    if (
      company &&
      grade
    ) {
      grades.add(
        `${company} ${grade}`
      );
    }
  }

  return Array.from(grades);
}

function chooseBlowoutCardTitle(
  postText: string
) {
  const lines =
    postText
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

  /*
   * Strongest card-title signal:
   * year + descriptive text + card number.
   *
   * Example:
   * 1949 Bowman Bob Lemon #238
   */
  const yearCardLine =
    lines.find(
      (line) =>
        /\b(?:18|19|20)\d{2}(?:-\d{2})?\b/.test(
          line
        ) &&
        /#\s*[A-Za-z0-9-]+/.test(
          line
        )
    );

  if (yearCardLine) {
    return yearCardLine;
  }

  /*
   * Otherwise prefer a year-containing line
   * that isn't simply a cert or price note.
   */
  const yearLine =
    lines.find(
      (line) =>
        /\b(?:18|19|20)\d{2}(?:-\d{2})?\b/.test(
          line
        ) &&
        !/\bcert\b/i.test(
          line
        )
    );

  if (yearLine) {
    return yearLine;
  }

  /*
   * Last fallback: first meaningful line that
   * isn't only a cert/value/registry statement.
   */
  return (
    lines.find(
      (line) =>
        !/^(?:PSA|BGS|SGC|CGC|CSG)?\s*cert\b/i.test(
          line
        ) &&
        !/^value\s+(?:gain|increase|change)/i.test(
          line
        ) &&
        !/^PSA\s+Set\s+Registry/i.test(
          line
        )
    ) ||
    lines[0] ||
    "Blowout Forums Post"
  );
}

async function importBlowoutPost(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const postId =
    extractBlowoutPostId(
      sourceUrl
    );

  const response =
    await fetch(
      sourceUrl,
      {
        method: "GET",
        redirect: "follow",
        cache: "no-store",

        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

          "Accept-Language":
            "en-US,en;q=0.9",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
        },
      }
    );

  const html =
    await response.text();

  /*
   * Blowout Forums is protected by
   * Imperva / Incapsula.
   *
   * Browser visits work, but server-side fetches
   * may receive an anti-bot page instead of the
   * actual forum post.
   */
  const blockedByImperva =
    /_Incapsula_Resource/i.test(
      html
    ) ||
    /Incapsula incident ID/i.test(
      html
    ) ||
    /Request unsuccessful/i.test(
      html
    ) ||
    /NOINDEX,\s*NOFOLLOW/i.test(
      html
    ) &&
      html.length < 5000;

  if (blockedByImperva) {
    throw new Error(
      "Blowout Forums blocks automated imports. Open the post in your browser, copy the webpage source/text, and paste it below."
    );
  }

  if (
    !response.ok ||
    !html ||
    html.length < 500
  ) {
    throw new Error(
      `Blowout Forums import failed with status ${response.status}.`
    );
  }

  const messageHtml =
    extractBlowoutMessageHtml(
      html,
      postId
    );

  const postText =
    stripBlowoutPostHtml(
      messageHtml
    );

  const images =
    extractBlowoutImages(
      messageHtml,
      response.url ||
        sourceUrl
    );

  const username =
    extractBlowoutUsername(
      html,
      postId
    );

  const postDate =
    extractBlowoutPostDate(
      html,
      postId
    );

  const certNumbers =
    detectBlowoutCertNumbers(
      postText
    );

  const grades =
    detectBlowoutGrades(
      postText
    );

  const title =
    chooseBlowoutCardTitle(
      postText
    );

  if (
    !postText &&
    images.length === 0
  ) {
    throw new Error(
      "Blowout Forums post was found, but no post content or images could be extracted."
    );
  }

  return {
    ok: true,

    marketplace:
      "blowout",

    sourceUrl:
      response.url ||
      sourceUrl,

    listingId:
      postId,

    title,

    seller:
      username ||
      "Blowout Forums",

    price:
      "",

    currency:
      "",

    /*
     * Blowout post date =
     * Sale / Event Date.
     */
    endDate:
      postDate,

    /*
     * If exactly one cert/grade is detected,
     * it is safe to populate automatically.
     *
     * Multiple states remain available in
     * aspects and are NOT arbitrarily chosen.
     */
    certNumber:
      certNumbers.length === 1
        ? certNumbers[0]
        : "",

    grade:
      grades.length === 1
        ? grades[0]
        : "",

    description:
      postText,

    frontImage:
      images[0] || "",

    additionalImages:
      images.slice(1),

    aspects: {
      "Blowout Post ID": [
        postId,
      ],

      ...(certNumbers.length
        ? {
            "Detected Cert Numbers":
              certNumbers,
          }
        : {}),

      ...(grades.length
        ? {
            "Detected Grades":
              grades,
          }
        : {}),
    },
  };
}

/* =========================================================
FACEBOOK
========================================================= */

function extractFacebookId(
  sourceUrl: string
) {
  try {
    const parsed =
      new URL(sourceUrl);

    /*
     * Direct photo URL:
     *
     * facebook.com/photo/?fbid=1554708609685622
     */
    const fbid =
      clean(
        parsed.searchParams.get(
          "fbid"
        )
      );

    if (fbid) {
      return fbid;
    }

    /*
     * Share URL:
     *
     * facebook.com/share/p/17icaySF51/
     */
    const shareMatch =
      parsed.pathname.match(
        /\/share\/(?:p|r|v)\/([^/?#]+)/i
      );

    if (shareMatch?.[1]) {
      return clean(
        shareMatch[1]
      );
    }

    /*
     * Normal posts:
     *
     * facebook.com/.../posts/123456
     */
    const postMatch =
      parsed.pathname.match(
        /\/posts\/([^/?#]+)/i
      );

    if (postMatch?.[1]) {
      return clean(
        postMatch[1]
      );
    }

    /*
     * Videos / reels.
     */
    const mediaMatch =
      parsed.pathname.match(
        /\/(?:videos|reel)\/([^/?#]+)/i
      );

    if (mediaMatch?.[1]) {
      return clean(
        mediaMatch[1]
      );
    }
  } catch {
    // Preserve the source URL even when no ID can be extracted.
  }

  return "";
}


function extractFacebookImages(
  html: string,
  sourceUrl: string
) {
  const candidates: string[] =
    [];

  /*
   * OpenGraph image is normally the best public
   * representation of a Facebook photo/post.
   */
  candidates.push(
    getMetaContent(
      html,
      "og:image"
    )
  );

  candidates.push(
    getMetaContent(
      html,
      "og:image:url"
    )
  );

  candidates.push(
    getMetaContent(
      html,
      "og:image:secure_url"
    )
  );

  candidates.push(
    getMetaContent(
      html,
      "twitter:image"
    )
  );

  /*
   * Facebook frequently embeds CDN image URLs in
   * page JSON rather than ordinary <img> elements.
   */
  const escapedImageRegex =
    /https?:\\?\/\\?\/[^"'<>\\\s]+?(?:fbcdn\.net|fbsbx\.com)[^"'<>\\\s]*/gi;

  for (
    const match of html.matchAll(
      escapedImageRegex
    )
  ) {
    candidates.push(
      match[0]
        .replace(
          /\\u0026/g,
          "&"
        )
        .replace(
          /\\\//g,
          "/"
        )
        .replace(
          /&amp;/gi,
          "&"
        )
    );
  }

  const normalImageRegex =
    /https?:\/\/[^"'<>\\\s]+?(?:fbcdn\.net|fbsbx\.com)[^"'<>\\\s]*/gi;

  for (
    const match of html.matchAll(
      normalImageRegex
    )
  ) {
    candidates.push(
      match[0]
    );
  }

  return uniqueUrls(
    candidates,
    sourceUrl
  ).filter((url) => {
    return (
      !/emoji/i.test(url) &&
      !/profile/i.test(url) &&
      !/avatar/i.test(url)
    );
  });
}


async function importFacebookPost(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const response =
    await fetch(
      sourceUrl,
      {
        method: "GET",

        redirect:
          "follow",

        cache:
          "no-store",

        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

          "Accept-Language":
            "en-US,en;q=0.9",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36",
        },
      }
    );

  const html =
    await response.text();

  if (
    !response.ok ||
    !html ||
    html.length < 500
  ) {
    throw new Error(
      "Facebook blocked the direct import. Copy the Facebook post/page and paste the copied page text instead."
    );
  }

  const finalUrl =
    response.url ||
    sourceUrl;

  /*
   * Facebook may redirect an unauthenticated request
   * to login/checkpoint pages.
   */
  const blocked =
    /login|checkpoint/i.test(
      finalUrl
    ) ||
    /Log into Facebook|Log in to Facebook|You must log in/i.test(
      html
    );

  if (blocked) {
    throw new Error(
      "Facebook requires a login for this post. Copy the Facebook post/page and paste the copied page text instead."
    );
  }

  const title =
    getMetaContent(
      html,
      "og:title"
    ) ||
    getMetaContent(
      html,
      "twitter:title"
    ) ||
    decodeHtml(
      html.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
      )?.[1] || ""
    );

  const description =
    getMetaContent(
      html,
      "og:description"
    ) ||
    getMetaContent(
      html,
      "description"
    ) ||
    getMetaContent(
      html,
      "twitter:description"
    );

  const images =
    extractFacebookImages(
      html,
      finalUrl
    );

  /*
   * Don't require an image here.
   *
   * Some public Facebook posts expose text metadata
   * but protect the actual image from server requests.
   */
  if (
    !title &&
    !description &&
    images.length === 0
  ) {
    throw new Error(
      "Facebook did not expose this post publicly. Copy the Facebook post/page and paste the copied page text instead."
    );
  }

  return {
    ok: true,

    marketplace:
      "facebook",

    /*
     * Preserve the URL the contributor supplied.
     * This is preferable for Facebook share URLs
     * because redirects can produce login/tracking URLs.
     */
    sourceUrl,

    listingId:
      extractFacebookId(
        sourceUrl
      ),

    title:
      title
        .replace(
          /\s*\|\s*Facebook\s*$/i,
          ""
        )
        .trim(),

    seller:
      "Facebook",

    price:
      "",

    currency:
      "",

    endDate:
      "",

    description,

    frontImage:
      images[0] || "",

    additionalImages:
      images.slice(1),

    aspects: {},
  };
}

/* =========================================================
BUY NICE CARDS
========================================================= */

async function importBuyNiceCardsListing(
  sourceUrl: string
): Promise<AuctionImportResult> {
  const parsedUrl = new URL(sourceUrl);
  const pathParts = parsedUrl.pathname
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  const productIndex = pathParts.findIndex(
    (part) => part.toLowerCase() === "product"
  );

  const handle =
    productIndex >= 0
      ? clean(pathParts[productIndex + 1])
      : "";

  if (!handle) {
    throw new Error(
      "Unable to determine the Buy Nice Cards product handle from this URL."
    );
  }

  const endpoint =
    "https://buy-nice-cards.myshopify.com/api/2025-01/graphql.json";

  /*
   * Buy Nice Cards exposes this Shopify Storefront token in its
   * public browser application. Storefront tokens are intended for
   * client-side storefront access; this is not an Admin API token.
   */
  const storefrontToken =
    "cd534675008f8bd8c38ff050c1561e4c";

  const query = `
    query BuyNiceCardsProduct($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        productType
        tags
        description
        vendor
        availableForSale
        variants(first: 10) {
          edges {
            node {
              id
              title
              availableForSale
              price {
                amount
                currencyCode
              }
            }
          }
        }
        images(first: 20) {
          edges {
            node {
              url
              altText
              width
              height
            }
          }
        }
      }
    }
  `;

  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
      Origin: "https://buynicecards.com",
      Referer: sourceUrl,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      query,
      variables: { handle },
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Buy Nice Cards import failed with status ${response.status}.`
    );
  }

  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      "Buy Nice Cards returned an invalid Shopify response."
    );
  }

  if (Array.isArray(json?.errors) && json.errors.length > 0) {
    const message = clean(json.errors[0]?.message);

    throw new Error(
      message
        ? `Buy Nice Cards Shopify API error: ${message}`
        : "Buy Nice Cards Shopify API returned an error."
    );
  }

  const product = json?.data?.productByHandle;

  if (!product) {
    throw new Error(
      "Buy Nice Cards did not return a product for this URL."
    );
  }

  const variants = Array.isArray(product?.variants?.edges)
    ? product.variants.edges
        .map((edge: any) => edge?.node)
        .filter(Boolean)
    : [];

  const firstVariant = variants[0] || null;

  const images = uniqueUrls(
    Array.isArray(product?.images?.edges)
      ? product.images.edges.map(
          (edge: any) => edge?.node?.url
        )
      : []
  );

  const tags = Array.isArray(product?.tags)
    ? product.tags
        .map((tag: unknown) => clean(tag))
        .filter(Boolean)
    : [];

  const aspects: Record<string, string[]> = {};

  if (clean(product?.productType)) {
    aspects["Product Type"] = [
      clean(product.productType),
    ];
  }

  if (tags.length > 0) {
    aspects.Tags = tags;
  }

  if (clean(product?.vendor)) {
    aspects.Vendor = [clean(product.vendor)];
  }

  aspects.Availability = [
    product?.availableForSale ? "Available" : "Unavailable",
  ];

  return {
    ok: true,
    marketplace: "buynicecards",
    sourceUrl,
    listingId: clean(product?.handle) || handle,
    title: clean(product?.title),
    seller: clean(product?.vendor) || "Buy Nice Cards",
    price: clean(firstVariant?.price?.amount),
    currency:
      clean(firstVariant?.price?.currencyCode) || "USD",

    /*
     * Shopify Storefront product data does not provide a reliable
     * sold date. Do not substitute createdAt/updatedAt for the sale
     * date because those timestamps describe the product record.
     */
    endDate: "",

    description: clean(product?.description),
    frontImage: images[0] || "",
    additionalImages: images.slice(1),
    aspects,
  };
}

function addNormalizedCardFields(
  result: AuctionImportResult
): AuctionImportResult {
  const parsed = parseAuctionTitle(
    result.title,
    result.aspects
  );

  return {
    ...result,

    cardFields: {
      ...parsed,

      grade:
        clean(result.grade) ||
        parsed.grade,

      serialNumber:
        clean(result.serialNumber) ||
        parsed.serialNumber,

      certNumber:
        clean(result.certNumber),
    },
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
    return addNormalizedCardFields(
      await importEbayAuction(cleanedUrl)
    );
  }

  if (isPsaHostname(hostname)) {
    return addNormalizedCardFields(
      await importPsaCertification(
        cleanedUrl
      )
    );
  }

  if (isXHostname(hostname)) {
    return addNormalizedCardFields(
      await importXPost(cleanedUrl)
    );
  }

  if (
    isInstagramHostname(hostname)
  ) {
    return addNormalizedCardFields(
      await importInstagramPost(
        cleanedUrl
      )
    );
  }

if (
  isFacebookHostname(
    hostname
  )
) {
  return addNormalizedCardFields(
    await importFacebookPost(
      cleanedUrl
    )
  );
}

if (
  isHeritageHostname(
    hostname
  )
) {
  throw new Error(
    "Heritage Auctions blocks automated imports. Please enter the sale details manually and upload or link the card images."
  );
}

  if (isAltHostname(hostname)) {
  return addNormalizedCardFields(
    await importAltListing(
      cleanedUrl
    )
  );
}

  if (isGoldinHostname(hostname)) {
  return addNormalizedCardFields(
    await importGoldinAuction(
      cleanedUrl
    )
  );
}

if (
  hostname === "buynicecards.com" ||
  hostname.endsWith(".buynicecards.com")
) {
  return addNormalizedCardFields(
    await importBuyNiceCardsListing(
      cleanedUrl
    )
  );
}

if (
  isMySlabsHostname(
    hostname
  )
) {
  return addNormalizedCardFields(
    await importMySlabsListing(
      cleanedUrl
    )
  );
}

if (
  isBlowoutHostname(
    hostname
  )
) {
  return addNormalizedCardFields(
    await importBlowoutPost(
      cleanedUrl
    )
  );
}

function isBlowoutHostname(
  hostname: string
) {
  return (
    hostname === "blowoutforums.com" ||
    hostname.endsWith(
      ".blowoutforums.com"
    )
  );
}

if (
  hostname === "fanaticscollect.com" ||
  hostname.endsWith(".fanaticscollect.com") ||
  hostname === "pwccmarketplace.com" ||
  hostname.endsWith(".pwccmarketplace.com")
) {
  return addNormalizedCardFields(
    await importFanaticsAuction(
      cleanedUrl
    )
  );
}

function isXHostname(hostname: string) {
  return (
    hostname === "x.com" ||
    hostname.endsWith(".x.com") ||
    hostname === "twitter.com" ||
    hostname.endsWith(".twitter.com")
  );
}

function isFacebookHostname(
  hostname: string
) {
  return (
    hostname === "facebook.com" ||
    hostname.endsWith(".facebook.com") ||
    hostname === "fb.com" ||
    hostname.endsWith(".fb.com")
  );
}

function isInstagramHostname(
  hostname: string
) {
  return (
    hostname === "instagram.com" ||
    hostname.endsWith(
      ".instagram.com"
    )
  );
}

function isHeritageHostname(
  hostname: string
) {
  return (
    hostname === "ha.com" ||
    hostname.endsWith(".ha.com")
  );
}

function isAltHostname(
  hostname: string
) {
  return (
    hostname === "alt.xyz" ||
    hostname.endsWith(".alt.xyz")
  );
}

throw new Error(
  "This source is not supported yet. eBay, Heritage Auctions, Alt, X, Instagram, Facebook, PSA, Goldin, Fanatics Collect, Buy Nice Cards, MySlabs, and Blowout Forums are currently available."
);
}