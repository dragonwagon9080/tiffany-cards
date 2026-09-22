import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";

import ConfirmPurchaseForm from "./ConfirmPurchaseForm";

export const metadata: Metadata = {
  title: "Confirm Purchase | Seller Tracker",
};

export const dynamic = "force-dynamic";

type Seller = {
  Seller_ID: string;
  Platform: string;
  Username: string;
  eBay_User_ID: string;
  Store_Name: string;
  Store_URL: string;
  Profile_URL: string;
  Status: string;
  Date_Added: string;
  Last_Checked: string;
  Notes: string;
  Buyer_Feedback_ID: string;
  Star_Color: string;
  Listing_Count: number;
};

type SellersResponse = {
  ok: boolean;
  sellers?: Seller[];
  count?: number;
  error?: string;
};

async function getSellers(): Promise<Seller[]> {
  try {
    const cookieStore = await cookies();
    const requestHeaders = await headers();

    const host =
      requestHeaders.get("x-forwarded-host") ||
      requestHeaders.get("host");

    const protocol =
      requestHeaders.get("x-forwarded-proto") ||
      (host?.includes("localhost") ? "http" : "https");

    if (!host) {
      return [];
    }

    const response = await fetch(
      `${protocol}://${host}/api/seller-tracker?action=sellers`,
      {
        cache: "no-store",
        headers: {
          Cookie: cookieStore.toString(),
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data =
      (await response.json()) as SellersResponse;

    if (
      !data.ok ||
      !Array.isArray(data.sellers)
    ) {
      return [];
    }

    return data.sellers.filter(
      (seller) =>
        seller.Status?.toLowerCase() ===
        "active"
    );
  } catch {
    return [];
  }
}

export default async function ConfirmPurchasePage() {
  const sellers = await getSellers();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <Link
            href="/admin/seller-tracker"
            className="text-sm font-medium text-blue-400 transition hover:text-blue-300"
          >
            ← Seller Tracker
          </Link>

          <div className="mt-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              Seller Tracker
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Confirm Purchase
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              Add a confirmed purchase made by one of the monitored sellers.
              The purchase will later be compared against that seller&apos;s
              captured inventory.
            </p>
          </div>
        </div>

        <ConfirmPurchaseForm sellers={sellers} />
      </div>
    </main>
  );
}