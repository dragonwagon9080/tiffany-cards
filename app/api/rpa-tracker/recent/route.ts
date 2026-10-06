import {
  NextResponse,
} from "next/server";

import {
  getRPATrackerIndex,
} from "@/lib/rpa-tracker/cache";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function json(data: any) {
  return NextResponse.json(
    data,
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",

        "X-Content-Type-Options":
          "nosniff",

        "X-Robots-Tag":
          "noindex, nofollow, noarchive",

        "Cross-Origin-Resource-Policy":
          "same-origin",
      },
    }
  );
}

export async function GET() {
  try {
    /*
     * Recent cards are already included in the
     * lightweight RPA Tracker index snapshot.
     *
     * Do NOT use getCachedRPATrackerData() here.
     * That loads the full RPA database.json file.
     */
    const index =
      await getRPATrackerIndex();

    const recentCards =
      Array.isArray(
        index?.recentCards
      )
        ? index.recentCards
        : [];

    return json({
      ok: true,

      cards:
        recentCards,

      count:
        recentCards.length,

      refreshedAt:
        index?.meta
          ?.refreshedAt ||
        null,
    });
  } catch (error) {
    console.error(
      "RPA recent cards API error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        cards: [],
        count: 0,
        error:
          "Unable to load recent RPA cards.",
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