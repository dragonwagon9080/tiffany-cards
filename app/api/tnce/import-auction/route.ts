import { NextRequest, NextResponse } from "next/server";

import { importAuction } from "@/lib/tnce/server/auctionImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing auction URL.",
        },
        {
          status: 400,
        }
      );
    }

    const result = await importAuction(url);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Auction import failed.",
      },
      {
        status: 500,
      }
    );
  }
}