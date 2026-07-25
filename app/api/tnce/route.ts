import { NextRequest, NextResponse } from "next/server";
import type { TNCESubmission } from "@/lib/tnce/types";
import { submitRPAContribution } from "@/lib/tnce/server/submitRPA";
import { submitCardsAlertContribution } from "@/lib/tnce/server/submitCardsAlert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const submission = (await req.json()) as TNCESubmission;

    if (!submission.project) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing TNCE project.",
        },
        { status: 400 },
      );
    }

    if (submission.project === "rpa-tracker") {
      const result = await submitRPAContribution(submission);

      return NextResponse.json({
        ok: true,
        submissionId: result.submissionId,
        message: "RPA contribution submitted for review.",
      });
    }

    if (submission.project === "cards-alert") {
      const result = await submitCardsAlertContribution(submission);

      return NextResponse.json({
        ok: true,
        submissionId: result.submissionId,
        message: "Cards Alert contribution submitted for review.",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: `TNCE project not implemented yet: ${submission.project}`,
      },
      { status: 400 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "TNCE submission failed.",
      },
      { status: 500 },
    );
  }
}