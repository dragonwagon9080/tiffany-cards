type AuctionImportResult = {
  marketplace: string;
  sourceUrl: string;
  listingId: string;
  title: string;
  seller: string;
  price: string;
  currency: string;
  endDate: string;
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

function uniqueUrls(values: unknown[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const url = clean(value);

    if (!url) continue;

    const key = url.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(url);
  }

  return result;
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
    throw new Error(
      "This importer currently supports eBay URLs only."
    );
  }

  /*
   * Common formats:
   *
   * https://www.ebay.com/itm/123456789012
   * https://www.ebay.com/itm/title/123456789012
   * https://www.ebay.com/itm/123456789012?...
   */
  const pathMatch = parsed.pathname.match(
    /\/itm\/(?:[^/]+\/)?(\d{9,20})(?:\/|$)/i
  );

  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  /*
   * Some shared URLs include the item number in a query
   * parameter.
   */
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

  if (
    hostname === "ebay.com" ||
    hostname.endsWith(".ebay.com") ||
    hostname.startsWith("ebay.")
  ) {
    return importEbayAuction(cleanedUrl);
  }

  throw new Error(
    "This marketplace is not supported yet. eBay is currently available."
  );
}