import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  buildRPATrackerSnapshot,
} from "@/lib/rpa-tracker/snapshot";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function authorized(
  req: NextRequest
) {
  const expected =
    process.env
      .RPA_TRACKER_SNAPSHOT_SECRET;

  const supplied =
    req.headers.get(
      "x-snapshot-secret"
    ) || "";

  if (!expected) {
    return false;
  }

  return supplied === expected;
}

export async function POST(
  req: NextRequest
) {
  if (!authorized(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const result =
      await buildRPATrackerSnapshot();

    return NextResponse.json(
      result
    );
  } catch (error) {
    console.error(
      "RPA Tracker snapshot refresh failed:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Snapshot refresh failed.",
      },
      {
        status: 500,
      }
    );
  }
}