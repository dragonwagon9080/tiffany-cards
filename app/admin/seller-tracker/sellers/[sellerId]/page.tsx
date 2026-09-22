import type { Metadata } from "next";
import { headers } from "next/headers";

import SellerInventory from "./SellerInventory";

export const metadata: Metadata = {
  title: "Seller Inventory | Seller Tracker | Tiffany Cards",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type Seller = {
  Seller_ID: string;
  Platform?: string;
  Username?: string;
  Store_Name?: string;
  Store_URL?: string;
  Status?: string;
  Last_Checked?: string;
};

export type SellerListing = {
  Listing_ID?: string;
  Seller_ID?: string;
  eBay_Item_ID?: string;
  First_Seen?: string;
  Last_Seen?: string;
  Status?: string;
  Listing_URL?: string;
  Title?: string;
  Year?: string | number;
  Brand?: string;
  Set?: string;
  Player_First?: string;
  Player_Last?: string;
  Card_Number?: string | number;
  Parallel?: string;
  Serial_Number?: string;
  Grade_Company?: string;
  Grade?: string | number;
  Cert_Number?: string | number;
  Price?: string | number;
  Sold_Price?: string | number;
  Image_1?: string;
  Image_2?: string;
  Image_3?: string;
  Image_4?: string;
  Description?: string;
  eBay_Listing_Date?: string;
  Cloud_Image_URLs_JSON?: string;
};

export type ConfirmedPurchase = {
  Purchase_ID?: string;
  Seller_ID?: string;
  Source?: string;
  Source_URL?: string;
  Date_Added?: string;
  Purchase_Date?: string;
  Title?: string;
  Year?: string | number;
  Brand?: string;
  Set?: string;
  Player_First?: string;
  Player_Last?: string;
  Card_Number?: string | number;
  Parallel?: string;
  Serial_Number?: string;
  Grade_Company?: string;
  Grade?: string | number;
  Cert_Number?: string | number;
  Purchase_Price?: string | number;
  Image_1?: string;
  Image_2?: string;
  Image_3?: string;
  Image_4?: string;
  Description?: string;
  Import_Status?: string;
  Match_Status?: string;
  Notes?: string;
};

export type SellerMatch = {
  Match_ID?: string;
  Seller_ID?: string;
  Purchase_ID?: string;
  Listing_ID?: string;
  Detected_Date?: string;
  Match_Score?: string | number;
  Match_Level?: string;
  Match_Reasons?: string;
  Purchase_Title?: string;
  Listing_Title?: string;
  Purchase_Grade?: string | number;
  Listing_Grade?: string | number;
  Purchase_Cert?: string | number;
  Listing_Cert?: string | number;
  Purchase_Serial?: string;
  Listing_Serial?: string;
  Purchase_URL?: string;
  Listing_URL?: string;
  Purchase_Image?: string;
  Listing_Image?: string;
  Review_Status?: string;
  Notes?: string;
  Listing_Images?: string[];
  Purchase_Images?: string[];
};

type SellerResponse = {
  ok: boolean;
  seller?: Seller;
  listings?: SellerListing[];
  listingCount?: number;
  error?: string;
};

type PurchasesResponse = {
  ok: boolean;
  sellerId?: string;
  purchases?: ConfirmedPurchase[];
  count?: number;
  error?: string;
};

type MatchesResponse = {
  ok: boolean;
  sellerId?: string;
  matches?: SellerMatch[];
  count?: number;
  error?: string;
};

function getBaseUrl(
  requestHeaders: Awaited<
    ReturnType<typeof headers>
  >
) {
  const host =
    requestHeaders.get("host");

  if (!host) {
    throw new Error(
      "Unable to determine request host."
    );
  }

  const forwardedProto =
    requestHeaders.get(
      "x-forwarded-proto"
    );

  const protocol =
    forwardedProto ||
    (host.includes("localhost")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

function getCookieHeaders(
  requestHeaders: Awaited<
    ReturnType<typeof headers>
  >
) {
  const cookie =
    requestHeaders.get("cookie");

  return cookie
    ? {
        Cookie: cookie,
      }
    : undefined;
}

async function getSeller(
  sellerId: string,
  requestHeaders: Awaited<
    ReturnType<typeof headers>
  >
): Promise<SellerResponse> {
  const baseUrl =
    getBaseUrl(requestHeaders);

  const url =
    new URL(
      `${baseUrl}/api/seller-tracker`
    );

  url.searchParams.set(
    "action",
    "seller"
  );

  url.searchParams.set(
    "sellerId",
    sellerId
  );

  const response =
    await fetch(
      url.toString(),
      {
        cache: "no-store",
        headers:
          getCookieHeaders(
            requestHeaders
          ),
      }
    );

  if (!response.ok) {
    throw new Error(
      `Seller Tracker API returned ${response.status}.`
    );
  }

  const data =
    (await response.json()) as SellerResponse;

  if (!data.ok) {
    throw new Error(
      data.error ||
        "Unable to load seller."
    );
  }

  return data;
}

async function getPurchases(
  sellerId: string,
  requestHeaders: Awaited<
    ReturnType<typeof headers>
  >
): Promise<PurchasesResponse> {
  const baseUrl =
    getBaseUrl(requestHeaders);

  const url =
    new URL(
      `${baseUrl}/api/seller-tracker`
    );

  url.searchParams.set(
    "action",
    "purchases"
  );

  url.searchParams.set(
    "sellerId",
    sellerId
  );

  const response =
    await fetch(
      url.toString(),
      {
        cache: "no-store",
        headers:
          getCookieHeaders(
            requestHeaders
          ),
      }
    );

  if (!response.ok) {
    throw new Error(
      `Purchase API returned ${response.status}.`
    );
  }

  const data =
    (await response.json()) as PurchasesResponse;

  if (!data.ok) {
    throw new Error(
      data.error ||
        "Unable to load purchases."
    );
  }

  return data;
}

async function getMatches(
  sellerId: string,
  requestHeaders: Awaited<
    ReturnType<typeof headers>
  >
): Promise<MatchesResponse> {
  const baseUrl =
    getBaseUrl(requestHeaders);

  const url =
    new URL(
      `${baseUrl}/api/seller-tracker`
    );

  url.searchParams.set(
    "action",
    "matches"
  );

  url.searchParams.set(
    "sellerId",
    sellerId
  );

  const response =
    await fetch(
      url.toString(),
      {
        cache: "no-store",
        headers:
          getCookieHeaders(
            requestHeaders
          ),
      }
    );

  if (!response.ok) {
    throw new Error(
      `Matches API returned ${response.status}.`
    );
  }

  const data =
    (await response.json()) as MatchesResponse;

  if (!data.ok) {
    throw new Error(
      data.error ||
        "Unable to load matches."
    );
  }

  return data;
}

export default async function SellerInventoryPage({
  params,
}: {
  params: Promise<{
    sellerId: string;
  }>;
}) {
  const {
    sellerId,
  } = await params;

  const decodedSellerId =
    decodeURIComponent(
      sellerId
    );

  const requestHeaders =
    await headers();

  /*
 * Apps Script can become unreliable when
 * these larger requests are fired at the
 * same time. Load them sequentially to
 * avoid overlapping backend executions.
 */
const sellerResult =
  await Promise.allSettled([
    getSeller(
      decodedSellerId,
      requestHeaders
    ),
  ]).then(
    ([result]) => result
  );

const purchaseResult =
  await Promise.allSettled([
    getPurchases(
      decodedSellerId,
      requestHeaders
    ),
  ]).then(
    ([result]) => result
  );

const matchResult =
  await Promise.allSettled([
    getMatches(
      decodedSellerId,
      requestHeaders
    ),
  ]).then(
    ([result]) => result
  );

  let sellerData: SellerResponse;

  if (
    sellerResult.status ===
    "fulfilled"
  ) {
    sellerData =
      sellerResult.value;
  } else {
    sellerData = {
      ok: false,
      error:
        sellerResult.reason
          ?.message ||
        "Unable to load seller.",
    };
  }

  if (
    !sellerData.ok ||
    !sellerData.seller
  ) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <a
            href="/admin/seller-tracker/sellers"
            className="text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            ← Monitored Sellers
          </a>

          <div className="mt-6 rounded-xl border border-red-900/70 bg-red-950/40 p-5">
            <h1 className="font-bold text-red-300">
              Unable to load seller
            </h1>

            <p className="mt-2 text-sm text-red-400">
              {sellerData.error ||
                "Seller not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  let purchases:
    ConfirmedPurchase[] = [];

  if (
    purchaseResult.status ===
    "fulfilled"
  ) {
    purchases =
      purchaseResult.value
        .purchases || [];
  } else {
    console.error(
      "Unable to load confirmed purchases:",
      purchaseResult.reason
    );

    /*
     * Purchase retrieval should never
     * prevent inventory from loading.
     */
    purchases = [];
  }

  let matches:
    SellerMatch[] = [];

  if (
    matchResult.status ===
    "fulfilled"
  ) {
    matches =
      matchResult.value
        .matches || [];
  } else {
    console.error(
      "Unable to load matches:",
      matchResult.reason
    );

    /*
     * Match retrieval should never
     * prevent inventory from loading.
     */
    matches = [];
  }

  return (
    <SellerInventory
      seller={
        sellerData.seller
      }
      listings={
        sellerData.listings ||
        []
      }
      purchases={
        purchases
      }
      matches={
        matches
      }
    />
  );
}