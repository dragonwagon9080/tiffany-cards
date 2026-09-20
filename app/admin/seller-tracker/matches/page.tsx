import type { Metadata } from "next";
import { headers } from "next/headers";
import MatchComparisonImages from "./MatchComparisonImages";
import MatchReviewControls from "./MatchReviewControls";

export const metadata: Metadata = {
  title: "Match Review | Seller Tracker | Tiffany Cards",
  description:
    "Private Tiffany Cards administration page for reviewing Seller Tracker candidate matches.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type SellerMatch = {
  Match_ID?: string;
  Seller_ID?: string;
  Purchase_ID?: string;
  Listing_ID?: string;
  Detected_Date?: string;
  Match_Score?: number | string;
  Match_Level?: string;
  Match_Reasons?: string;
  Purchase_Title?: string;
  Listing_Title?: string;
  Purchase_Grade?: string;
  Listing_Grade?: string;
  Purchase_Cert?: string;
  Listing_Cert?: string;
  Purchase_Serial?: string;
  Listing_Serial?: string;
  Purchase_URL?: string;
  Listing_URL?: string;
  Purchase_Image?: string;
  Listing_Image?: string;
  Purchase_Images?: string[];
  Listing_Images?: string[];
  Review_Status?: string;
  Notes?: string;
};

type MatchesResponse = {
  ok: boolean;
  matches?: SellerMatch[];
  count?: number;
  error?: string;
};

async function getMatches(): Promise<{
  matches: SellerMatch[];
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
      "/api/seller-tracker?action=matches&reviewStatus=active";

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
      (await response.json()) as MatchesResponse;

    if (!data.ok) {
      throw new Error(
        data.error ||
          "Unable to load match candidates."
      );
    }

    return {
      matches: Array.isArray(
        data.matches
      )
        ? data.matches
        : [],
      error: null,
    };
  } catch (error: any) {
    console.error(
      "Seller Tracker matches error:",
      error
    );

    return {
      matches: [],
      error:
        error?.message ||
        "Unable to load match candidates.",
    };
  }
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function displayValue(
  value?: string
) {
  const cleaned =
    String(value || "").trim();

  return cleaned || "—";
}

function reviewStatus(
  value?: string
) {
  const cleaned =
    String(value || "").trim();

  return cleaned || "Pending Review";
}

export default async function MatchReviewPage() {
  const {
    matches,
    error,
  } = await getMatches();

  const pendingCount =
    matches.filter((match) => {
      const status =
        reviewStatus(
          match.Review_Status
        ).toLowerCase();

      return (
        status === "pending" ||
        status === "pending review" ||
        status === "needs review"
      );
    }).length;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
                Tiffany Cards Admin
              </p>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Match Review
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Review candidate matches generated from confirmed
                purchases and captured seller listings. Final card
                identification is always determined through manual
                review.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/admin/seller-tracker/matches/reviewed"
                className="inline-flex w-fit items-center justify-center rounded-lg border border-blue-800 bg-blue-950/50 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:border-blue-600 hover:bg-blue-950"
              >
                Reviewed Matches
              </a>

              <a
                href="/admin/seller-tracker"
                className="inline-flex w-fit items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                Seller Tracker
              </a>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900/70 bg-red-950/40 p-4">
            <p className="font-semibold text-red-300">
              Unable to load match candidates.
            </p>

            <p className="mt-1 text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm font-medium text-zinc-400">
              Awaiting Review
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight">
              {matches.length.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Active candidate matches
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm font-medium text-zinc-400">
              Needs Review
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight">
              {pendingCount.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Awaiting manual review
            </p>
          </div>
        </section>

        {!error &&
          matches.length === 0 && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
              <div className="mx-auto max-w-xl">
                <h2 className="text-xl font-bold">
                  No Matches Need Review
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  There are currently no candidate matches awaiting
                  review. New candidates will appear here after the
                  matching engine identifies a listing that passes
                  chronology and metadata checks.
                </p>

                <a
                  href="/admin/seller-tracker"
                  className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
                >
                  Back to Seller Tracker
                </a>
              </div>
            </section>
          )}

        {matches.length > 0 && (
          <section className="space-y-6">
            {matches.map(
              (match, index) => (
                <article
                  key={
                    match.Match_ID ||
                    `${match.Purchase_ID}-${match.Listing_ID}-${index}`
                  }
                  className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
                >
                  <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-blue-900 bg-blue-950/60 px-2.5 py-1 text-xs font-bold text-blue-300">
                          {displayValue(
                            match.Match_Level
                          )}
                        </span>

                        <span className="rounded-full border border-amber-900 bg-amber-950/60 px-2.5 py-1 text-xs font-bold text-amber-300">
                          {reviewStatus(
                            match.Review_Status
                          )}
                        </span>

                        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-bold text-zinc-300">
                          Score{" "}
                          {String(
                            match.Match_Score ??
                              "—"
                          )}
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-zinc-500">
                        Detected{" "}
                        {formatDate(
                          match.Detected_Date
                        )}
                      </p>
                    </div>

                    <div className="text-xs text-zinc-500">
                      {displayValue(
                        match.Match_ID
                      )}
                    </div>
                  </div>

                  <MatchComparisonImages
                    sellerId={match.Seller_ID}
                    purchaseId={match.Purchase_ID}
                    listingId={match.Listing_ID}
                    purchaseTitle={match.Purchase_Title}
                    listingTitle={match.Listing_Title}
                    purchaseImages={
                      Array.isArray(match.Purchase_Images) &&
                      match.Purchase_Images.length > 0
                        ? match.Purchase_Images
                        : match.Purchase_Image
                          ? [match.Purchase_Image]
                          : []
                    }
                    listingImages={
                      Array.isArray(match.Listing_Images) &&
                      match.Listing_Images.length > 0
                        ? match.Listing_Images
                        : match.Listing_Image
                          ? [match.Listing_Image]
                          : []
                    }
                  />

                  <MatchReviewControls
                    matchId={match.Match_ID}
                    initialStatus={reviewStatus(
                      match.Review_Status
                    )}
                  />

                  <div className="grid border-t border-zinc-800 lg:grid-cols-2">
                    <div className="p-5">
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <Detail label="Grade" value={match.Purchase_Grade} />
                        <Detail label="Cert #" value={match.Purchase_Cert} />
                        <Detail label="Serial" value={match.Purchase_Serial} />
                        <Detail label="Record ID" value={match.Purchase_ID} />
                      </dl>

                      {match.Purchase_URL && (
                        <a
                          href={match.Purchase_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-blue-500 hover:text-white"
                        >
                          View Original Listing
                        </a>
                      )}
                    </div>

                    <div className="border-t border-zinc-800 p-5 lg:border-l lg:border-t-0">
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <Detail label="Grade" value={match.Listing_Grade} />
                        <Detail label="Cert #" value={match.Listing_Cert} />
                        <Detail label="Serial" value={match.Listing_Serial} />
                        <Detail label="Record ID" value={match.Listing_ID} />
                      </dl>

                      {match.Listing_URL && (
                        <a
                          href={match.Listing_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-blue-500 hover:text-white"
                        >
                          View Original Listing
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                      Match Reasons
                    </p>

                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {displayValue(
                        match.Match_Reasons
                      )}
                    </p>

                    {match.Notes && (
                      <>
                        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Notes
                        </p>

                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                          {match.Notes}
                        </p>
                      </>
                    )}
                  </div>
                </article>
              )
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
      <dt className="text-xs font-medium text-zinc-500">
        {label}
      </dt>

      <dd className="mt-1 break-words font-semibold text-zinc-200">
        {displayValue(value)}
      </dd>
    </div>
  );
}
