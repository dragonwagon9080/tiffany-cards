import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITABLE_PRODUCTION_FIELDS = [
  "Card_Title",
  "Serial_Number",
  "Variation_Input",
  "Card_History",
  "Grade",
  "Cert_Number",
  "Front_Image",
  "Back_Image",
  "Other_Images",
] as const;

type EditableProductionField =
  (typeof EDITABLE_PRODUCTION_FIELDS)[number];

function cleanProductionRecord(
  value: unknown
): Partial<Record<EditableProductionField, string>> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const cleaned: Partial<
    Record<EditableProductionField, string>
  > = {};

  for (const field of EDITABLE_PRODUCTION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) {
      continue;
    }

    const rawValue = source[field];

    if (Array.isArray(rawValue)) {
      cleaned[field] = rawValue
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .join("\n");

      continue;
    }

    cleaned[field] = String(rawValue ?? "").trim();
  }

  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.TNCE_APPS_SCRIPT_URL;
    const adminSecret = process.env.TNCE_ADMIN_SECRET;

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing TNCE_APPS_SCRIPT_URL environment variable.",
        },
        { status: 500 }
      );
    }

    if (!adminSecret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing TNCE_ADMIN_SECRET environment variable.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    const submissionId = String(
      body?.submissionId || ""
    ).trim();

    const reviewNotes = String(
      body?.reviewNotes || ""
    ).trim();

    const productionRecord = cleanProductionRecord(
      body?.productionRecord
    );

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
        adminSecret,
        submissionId,
        reviewNotes,
        productionRecord,
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
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
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