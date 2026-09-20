import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Seller Tracker Admin | Tiffany Cards",
  description:
    "Private Tiffany Cards administration dashboard for monitoring card sellers and reviewing potential card matches.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type DashboardStats = {
  activeSellers: number;
  listingsCaptured: number;
  confirmedPurchases: number;
  needsReview: number;
};

type DashboardResponse = {
  ok: boolean;
  stats?: DashboardStats;
  error?: string;
};

async function getDashboardStats(): Promise<{
  stats: DashboardStats;
  error: string | null;
}> {
  const fallback: DashboardStats = {
    activeSellers: 0,
    listingsCaptured: 0,
    confirmedPurchases: 0,
    needsReview: 0,
  };

  try {
    /*
     * Build the internal URL from the current request so this
     * works locally and in production without hard-coding
     * tiffanycards.com.
     */
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
      "/api/seller-tracker?action=dashboard";

    /*
     * Forward the cookie so the protected internal API route
     * recognizes the existing admin session.
     */
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
      (await response.json()) as DashboardResponse;

    if (
      !data.ok ||
      !data.stats
    ) {
      throw new Error(
        data.error ||
          "Unable to load Seller Tracker statistics."
      );
    }

    return {
      stats: data.stats,
      error: null,
    };
  } catch (error: any) {
    console.error(
      "Seller Tracker dashboard error:",
      error
    );

    return {
      stats: fallback,
      error:
        error?.message ||
        "Unable to load dashboard statistics.",
    };
  }
}

export default async function SellerTrackerAdminPage() {
  const {
    stats,
    error,
  } = await getDashboardStats();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
                Tiffany Cards Admin
              </p>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Seller Tracker
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Monitor seller inventory, record confirmed
                purchases, and review potential card matches.
              </p>
            </div>

            <a
              href="/admin/tnce"
              className="inline-flex w-fit items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              TNCE Admin
            </a>
          </div>
        </div>

        {/* API Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-900/70 bg-red-950/40 p-4">
            <p className="font-semibold text-red-300">
              Unable to load live Seller Tracker data.
            </p>

            <p className="mt-1 text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* Live Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active Sellers"
            value={stats.activeSellers}
            description="Currently monitored"
          />

          <StatCard
            label="Listings Captured"
            value={stats.listingsCaptured}
            description="Permanent seller history"
          />

          <StatCard
            label="Confirmed Purchases"
            value={stats.confirmedPurchases}
            description="Purchases being tracked"
          />

          <StatCard
            label="Needs Review"
            value={stats.needsReview}
            description="Candidate matches"
          />
        </section>

        {/* Main Actions */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold">
              Seller Tracker
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Choose an area to manage.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <ActionCard
              title="Monitored Sellers"
              description="View monitored sellers, listing counts, status, last checked time, and captured inventory."
              href="/admin/seller-tracker/sellers"
              buttonText="View Sellers"
            />

            <ActionCard
              title="Add Seller"
              description="Add a seller using an eBay store, profile, or seller URL and begin building permanent listing history."
              href="/admin/seller-tracker/add-seller"
              buttonText="Add Seller"
            />

            <ActionCard
              title="Confirm Purchase"
              description="Enter an eBay purchase URL to archive the original listing and compare it against the monitored seller's inventory."
              href="/admin/seller-tracker/confirm-purchase"
              buttonText="Add Purchase"
            />

            <ActionCard
              title="Match Review"
              description="Review candidate matches side-by-side using listing details, chronology, match reasons, and archived images."
              href="/admin/seller-tracker/matches"
              buttonText="Review Matches"
            />
          </div>
        </section>

        {/* Backend Status */}
        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                Monitoring Status
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                {error
                  ? "Seller Tracker backend could not be reached."
                  : "Seller Tracker backend is connected and returning live data."}
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm font-semibold text-zinc-200">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  error
                    ? "bg-red-500"
                    : "bg-green-500"
                }`}
              />

              {error
                ? "Backend Error"
                : "Backend Connected"}
            </div>
          </div>
        </section>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          Match candidates are generated from listing and
          purchase data. Final card identification is determined
          through manual review.
        </p>
      </div>
    </main>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  description: string;
};

function StatCard({
  label,
  value,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm font-medium text-zinc-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight">
        {value.toLocaleString()}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        {description}
      </p>
    </div>
  );
}

type ActionCardProps = {
  title: string;
  description: string;
  href: string;
  buttonText: string;
};

function ActionCard({
  title,
  description,
  href,
  buttonText,
}: ActionCardProps) {
  return (
    <div className="flex min-h-56 flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-blue-500/60">
      <h3 className="text-xl font-bold">
        {title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-6 text-zinc-400">
        {description}
      </p>

      <a
        href={href}
        className="mt-6 inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
      >
        {buttonText}
      </a>
    </div>
  );
}