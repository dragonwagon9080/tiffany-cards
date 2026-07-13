import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const url = process.env.TNCE_APPS_SCRIPT_URL;

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing TNCE_APPS_SCRIPT_URL environment variable.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    const submissionId = String(body?.submissionId || "").trim();
    const reviewNotes = String(body?.reviewNotes || "").trim();

    if (!submissionId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing submissionId.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "publish",
        submissionId,
        reviewNotes,
      }),
      cache: "no-store",
      redirect: "follow",
    });

    const text = await response.text();

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: `TNCE Apps Script returned non-JSON. Status: ${
            response.status
          }. First response text: ${text.slice(0, 300)}`,
        },
        { status: 502 }
      );
    }

    if (!response.ok || !data.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data.error || "Publish failed.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Publish failed.",
      },
      { status: 500 }
    );
  }
}