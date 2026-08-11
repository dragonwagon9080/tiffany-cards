import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  importAuction,
} from "@/lib/tnce/server/auctionImport";

import {
  importPageText,
} from "@/lib/tnce/page-text-importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest
) {
  try {
    const body =
      await req.json();

    const url =
      String(
        body?.url || ""
      ).trim();

    const pageText =
      String(
        body?.pageText || ""
      ).trim();

    const pageHtml =
      String(
        body?.pageHtml || ""
      ).trim();

    if (
      !url &&
      !pageText &&
      !pageHtml
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Enter an auction URL or paste copied page text.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      pageText ||
      pageHtml
        ? await importPageText(
            pageText,
            url,
            pageHtml
          )
        : await importAuction(
            url
          );

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error: any) {
    console.error(
      "TNCE import error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Import failed.",
      },
      {
        status: 500,
      }
    );
  }
}