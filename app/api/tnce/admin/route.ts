import { NextResponse } from "next/server";

import { getAdminQueue } from "@/lib/tnce/server/getAdminQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getAdminQueue();

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("TNCE admin queue error:", error);

    return NextResponse.json(
      {
        ok: false,
        submissions: [],
        stats: {
          total: 0,
          pending: 0,
          needsInfo: 0,
          rejected: 0,
          published: 0,
        },
        error: error?.message || "Unable to load TNCE admin queue.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}