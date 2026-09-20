import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set([
  "health",
  "dashboard",
  "sellers",
  "seller",
  "purchases",
  "matches",
]);

const ALLOWED_POST_ACTIONS = new Set([
  "saveMarkupAuthTest",
  "saveMarkup",
  "reviewMatch",
  "importConfirmedPurchase",
  "previewConfirmedPurchase",
]);

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const apiUrl =
      process.env.SELLER_TRACKER_API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Seller Tracker API is not configured.",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        }
      );
    }

    const searchParams =
      request.nextUrl.searchParams;

    const action =
      String(
        searchParams.get("action") ||
          "dashboard"
      )
        .trim()
        .toLowerCase();

    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unsupported Seller Tracker action.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const upstreamUrl =
      new URL(apiUrl);

    upstreamUrl.searchParams.set(
      "action",
      action
    );

    /*
     * Only pass parameters we explicitly support.
     *
     * seller and purchases require sellerId.
     * matches optionally accepts reviewStatus.
     */
    if (
      action === "seller" ||
      action === "purchases"
    ) {
      const sellerId =
        String(
          searchParams.get(
            "sellerId"
          ) || ""
        ).trim();

      if (!sellerId) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "sellerId is required.",
          },
          {
            status: 400,
            headers: noStoreHeaders(),
          }
        );
      }

      upstreamUrl.searchParams.set(
        "sellerId",
        sellerId
      );
    }

    if (action === "matches") {
      const reviewStatus =
        String(
          searchParams.get(
            "reviewStatus"
          ) || ""
        ).trim();

      if (reviewStatus) {
        upstreamUrl.searchParams.set(
          "reviewStatus",
          reviewStatus
        );
      }
    }

    const response = await fetch(
      upstreamUrl.toString(),
      {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const responseText =
      await response.text();

    let data: unknown;

    try {
      data =
        JSON.parse(responseText);
    } catch {
      console.error(
        "Seller Tracker returned non-JSON:",
        responseText.slice(0, 500)
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Seller Tracker backend returned an invalid response.",
        },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Seller Tracker backend request failed.",
          upstreamStatus:
            response.status,
          data,
        },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    return NextResponse.json(
      data,
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (error: any) {
    console.error(
      "Seller Tracker API error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to reach Seller Tracker backend.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const apiUrl =
      process.env.SELLER_TRACKER_API_URL;

    const writeSecret =
      process.env
        .SELLER_TRACKER_WRITE_SECRET;

    if (!apiUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Seller Tracker API is not configured.",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        }
      );
    }

    if (!writeSecret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Seller Tracker write secret is not configured.",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        }
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid JSON body.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const requestedAction =
      String(
        body.action || ""
      ).trim();

    if (
      !ALLOWED_POST_ACTIONS.has(
        requestedAction
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unsupported Seller Tracker write action.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    /*
     * The browser never receives the private
     * write secret. It is added here on the
     * Next.js server immediately before the
     * request is forwarded to Apps Script.
     */
    const upstreamBody = {
      ...body,
      action: requestedAction,
      writeSecret,
    };

    const response = await fetch(
      apiUrl,
      {
        method: "POST",
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          upstreamBody
        ),
      }
    );

    const responseText =
      await response.text();

    let data: unknown;

    try {
      data =
        JSON.parse(responseText);
    } catch {
      console.error(
        "Seller Tracker POST returned non-JSON:",
        responseText.slice(0, 500)
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Seller Tracker backend returned an invalid write response.",
        },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Seller Tracker backend write request failed.",
          upstreamStatus:
            response.status,
          data,
        },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    return NextResponse.json(
      data,
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (error: any) {
    console.error(
      "Seller Tracker POST error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to reach Seller Tracker backend.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}