import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  buildCardsAlertSnapshots,
} from "@/lib/cards-alert/snapshot";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function authorized(
  req: NextRequest
) {
  const expected =
    process.env
      .CARDS_ALERT_SNAPSHOT_SECRET;

  const supplied =
    req.headers.get(
      "x-snapshot-secret"
    ) || "";

  console.log(
    "snapshot secret comparison:",
    {
      expectedLength:
        expected?.length || 0,
      suppliedLength:
        supplied.length,
      matches:
        supplied === expected,
    }
  );

  if (!expected) {
    return false;
  }

  return supplied === expected;
}

export async function POST(
  req: NextRequest
) {
  console.log(
    "snapshot secret loaded:",
    Boolean(
      process.env
        .CARDS_ALERT_SNAPSHOT_SECRET
    )
  );

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
      await buildCardsAlertSnapshots();

    return NextResponse.json(
      result
    );
  } catch (error: any) {
    console.error(
      "Cards Alert snapshot refresh failed:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Snapshot refresh failed.",
      },
      {
        status: 500,
      }
    );
  }
}