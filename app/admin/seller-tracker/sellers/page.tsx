import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Monitored Sellers | Seller Tracker | Tiffany Cards",
  robots: {
    index: false,
    follow: false,
  },
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
  Listing_Count: number;
};

type SellersResponse = {
  ok: boolean;
  sellers?: Seller[];
  count?: number;
  error?: string;
};

async function getSellers(): Promise<{
  sellers: Seller[];
  error: string | null;
}> {
  try {
    const requestHeaders = await headers();

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

    const url =
      `${protocol}://${host}` +
      "/api/seller-tracker?action=sellers";

    const cookie =
      requestHeaders.get("cookie");

    const response = await fetch(
      url,
      {
        method: "GET",
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
      (await response.json()) as SellersResponse;

    if (!data.ok) {
      throw new Error(
        data.error ||
          "Unable to load monitored sellers."
      );
    }

    return {
      sellers: data.sellers || [],
      error: null,
    };
  } catch (error: any) {
    console.error(
      "Monitored Sellers error:",
      error
    );

    return {
      sellers: [],
      error:
        error?.message ||
        "Unable to load monitored sellers.",
    };
  }
}

function formatDate(
  value: string
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

export default async function MonitoredSellersPage() {
  const {
    sellers,
    error,
  } = await getSellers();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
                Seller Tracker
              </p>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Monitored Sellers
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                Sellers whose eBay inventory is being permanently captured.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/admin/seller-tracker"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
              >
                Dashboard
              </a>

              <a
                href="/admin/seller-tracker/add-seller"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                + Add Seller
              </a>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-900/70 bg-red-950/40 p-4">
            <p className="font-semibold text-red-300">
              Unable to load monitored sellers.
            </p>

            <p className="mt-1 text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* Summary */}
        {!error && (
          <div className="mb-5 text-sm text-zinc-400">
            {sellers.length.toLocaleString()} monitored{" "}
            {sellers.length === 1
              ? "seller"
              : "sellers"}
          </div>
        )}

        {/* Sellers */}
        <div className="space-y-4">
          {sellers.map((seller) => (
            <article
              key={seller.Seller_ID}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                {/* Seller Identity */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold">
                      {seller.Store_Name ||
                        seller.Username}
                    </h2>

                    <StatusBadge
                      status={
                        seller.Status
                      }
                    />
                  </div>

                  <p className="mt-1 text-sm font-medium text-blue-400">
                    @{seller.Username}
                  </p>

                  <div className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <SellerDetail
                      label="Platform"
                      value={
                        seller.Platform ||
                        "eBay"
                      }
                    />

                    <SellerDetail
                      label="Seller ID"
                      value={
                        seller.Seller_ID
                      }
                    />

                    <SellerDetail
                      label="Listings Captured"
                      value={seller.Listing_Count.toLocaleString()}
                    />

                    <SellerDetail
                      label="Date Added"
                      value={formatDate(
                        seller.Date_Added
                      )}
                    />

                    <SellerDetail
                      label="Last Checked"
                      value={formatDate(
                        seller.Last_Checked
                      )}
                    />
                  </div>

                  {seller.Notes && (
                    <p className="mt-4 text-xs text-zinc-500">
                      {seller.Notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-wrap gap-2">
                  <a
                    href={`/admin/seller-tracker/sellers/${encodeURIComponent(
                      seller.Seller_ID
                    )}`}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
                  >
                    View Inventory
                  </a>

                  {seller.Store_URL && (
                    <a
                      href={
                        seller.Store_URL
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                    >
                      Open eBay Store
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Empty State */}
        {!error &&
          sellers.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-10 text-center">
              <h2 className="text-lg font-bold">
                No monitored sellers
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                Add an eBay seller to begin capturing permanent listing history.
              </p>

              <a
                href="/admin/seller-tracker/add-seller"
                className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                Add Seller
              </a>
            </div>
          )}
      </div>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const active =
    status
      .trim()
      .toLowerCase() ===
    "active";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
        active
          ? "border-green-800 bg-green-950/60 text-green-300"
          : "border-zinc-700 bg-zinc-950 text-zinc-300"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          active
            ? "bg-green-500"
            : "bg-zinc-500"
        }`}
      />

      {status || "Unknown"}
    </span>
  );
}

function SellerDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>

      <p className="mt-1 break-words font-medium text-zinc-200">
        {value || "—"}
      </p>
    </div>
  );
}