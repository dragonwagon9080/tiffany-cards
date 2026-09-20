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

function getBaseUrl(
  requestHeaders: Awaited<ReturnType<typeof headers>>
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

  const cookie =
    requestHeaders.get("cookie");

  const response =
    await fetch(
      url.toString(),
      {
        cache: "no-store",
        headers: cookie
          ? {
              Cookie: cookie,
            }
          : undefined,
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

  const cookie =
    requestHeaders.get("cookie");

  const response =
    await fetch(
      url.toString(),
      {
        cache: "no-store",
        headers: cookie
          ? {
              Cookie: cookie,
            }
          : undefined,
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
   * Load inventory and purchases at the
   * same time instead of waiting for one
   * request to finish before starting the
   * other.
   */
  const [
    sellerResult,
    purchaseResult,
  ] = await Promise.allSettled([
    getSeller(
      decodedSellerId,
      requestHeaders
    ),
    getPurchases(
      decodedSellerId,
      requestHeaders
    ),
  ]);

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
     * prevent the seller inventory from
     * loading.
     */
    purchases = [];
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
    />
  );
}