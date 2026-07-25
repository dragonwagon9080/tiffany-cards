import { NextRequest, NextResponse } from "next/server";

import { getAdminQueue } from "@/lib/tnce/server/getAdminQueue";
import type {
  TNCEAdminQueueResponse,
  TNCEAdminSubmission,
  TNCEProject,
} from "@/lib/tnce/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_PROJECTS: TNCEProject[] = ["rpa-tracker", "cards-alert"];

function buildStats(submissions: TNCEAdminSubmission[]) {
  return {
    total: submissions.length,
    pending: submissions.filter((item) => item.TNCE_Status === "Pending Review")
      .length,
    needsInfo: submissions.filter((item) => item.TNCE_Status === "Needs Info")
      .length,
    rejected: submissions.filter((item) => item.TNCE_Status === "Rejected")
      .length,
    published: submissions.filter((item) => item.TNCE_Status === "Published")
      .length,
  };
}

export async function GET(req: NextRequest) {
  try {
    const requestedProject = new URL(req.url).searchParams.get("project");

    const projects =
      requestedProject && requestedProject !== "all"
        ? SUPPORTED_PROJECTS.filter((project) => project === requestedProject)
        : SUPPORTED_PROJECTS;

    if (projects.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          submissions: [],
          stats: buildStats([]),
          error: "Unsupported TNCE project.",
        },
        { status: 400 },
      );
    }

    const queues = await Promise.all(
      projects.map((project) => getAdminQueue(project)),
    );

    const submissions = queues
      .flatMap((queue) => queue.submissions || [])
      .sort(
        (a, b) =>
          new Date(b.Submitted_At).getTime() -
          new Date(a.Submitted_At).getTime(),
      );

    const result: TNCEAdminQueueResponse = {
      ok: true,
      submissions,
      stats: buildStats(submissions),
      refreshedAt: new Date().toISOString(),
    };

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
        stats: buildStats([]),
        error: error?.message || "Unable to load TNCE admin queue.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}