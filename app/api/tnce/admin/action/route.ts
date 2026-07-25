import { NextRequest, NextResponse } from "next/server";

import type { TNCEProject } from "@/lib/tnce/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTION_MAP = {
  "needs-info": "needsInfo",
  reject: "reject",
  "reset-pending": "resetPending",
} as const;

function endpointForProject(project: TNCEProject) {
  return project === "cards-alert"
    ? process.env.CARDS_ALERT_TNCE_APPS_SCRIPT_URL
    : project === "rpa-tracker"
      ? process.env.TNCE_APPS_SCRIPT_URL
      : "";
}

function secretForProject(project: TNCEProject) {
  return project === "cards-alert"
    ? process.env.CARDS_ALERT_TNCE_ADMIN_SECRET || process.env.TNCE_ADMIN_SECRET
    : process.env.TNCE_ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const project = String(body?.project || "") as TNCEProject;

    const action = String(body?.action || "") as keyof typeof ACTION_MAP;

    const submissionId = String(body?.submissionId || "").trim();

    const reviewNotes = String(body?.reviewNotes || "").trim();

    const url = endpointForProject(project);
    const adminSecret = secretForProject(project);
    const scriptAction = ACTION_MAP[action];

    if (!url || !adminSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing TNCE admin configuration for this project.",
        },
        { status: 500 },
      );
    }

    if (!scriptAction || !submissionId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid TNCE status action.",
        },
        { status: 400 },
      );
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: scriptAction,
        adminSecret,
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
      throw new Error(
        `TNCE status action returned invalid JSON: ${text.slice(0, 300)}`,
      );
    }

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "TNCE status action failed.");
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "TNCE status action failed.",
      },
      { status: 500 },
    );
  }
}