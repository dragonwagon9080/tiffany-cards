import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  TNCEProject,
  TNCESubmission,
} from "@/lib/tnce/types";

import {
  isValidTNCEAdminSession,
} from "@/lib/tnce/server/adminSession";

import {
  submitRPAContribution,
} from "@/lib/tnce/server/submitRPA";

import {
  submitCardsAlertContribution,
} from "@/lib/tnce/server/submitCardsAlert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function endpointForProject(
  project: TNCEProject
) {
  if (project === "cards-alert") {
    return process.env
      .CARDS_ALERT_TNCE_APPS_SCRIPT_URL;
  }

  if (project === "rpa-tracker") {
    return process.env
      .TNCE_APPS_SCRIPT_URL;
  }

  return "";
}

function adminSecretForProject(
  project: TNCEProject
) {
  if (project === "cards-alert") {
    return (
      process.env
        .CARDS_ALERT_TNCE_ADMIN_SECRET ||
      process.env.TNCE_ADMIN_SECRET
    );
  }

  if (project === "rpa-tracker") {
    return process.env
      .TNCE_ADMIN_SECRET;
  }

  return "";
}

async function quickPublishSubmission(
  submission: TNCESubmission,
  submissionId: string
) {
  const url =
    endpointForProject(
      submission.project
    );

  const adminSecret =
    adminSecretForProject(
      submission.project
    );

  if (!url) {
    throw new Error(
      `Missing TNCE Apps Script URL for ${submission.project}.`
    );
  }

  if (!adminSecret) {
    throw new Error(
      `Missing TNCE admin secret for ${submission.project}.`
    );
  }

  const response = await fetch(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "publish",
        adminSecret,
        submissionId,
        reviewNotes:
          "Published automatically through TNCE Owner Mode.",
        contributorNotes:
          String(
            submission.notes || ""
          ).trim(),
      }),
      cache: "no-store",
      redirect: "follow",
    }
  );

  const text =
    await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `TNCE quick publish returned invalid JSON. First response text: ${text.slice(
        0,
        500
      )}`
    );
  }

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error ||
        "TNCE quick publish failed."
    );
  }

  return data;
}

export async function POST(
  req: NextRequest
) {
  try {
    const submission =
      (await req.json()) as
        TNCESubmission;

    if (!submission.project) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing TNCE project.",
        },
        {
          status: 400,
        }
      );
    }

    let result: any;
    let submittedMessage = "";

    if (
      submission.project ===
      "rpa-tracker"
    ) {
      result =
        await submitRPAContribution(
          submission
        );

      submittedMessage =
        "RPA contribution submitted for review.";
    } else if (
      submission.project ===
      "cards-alert"
    ) {
      result =
        await submitCardsAlertContribution(
          submission
        );

      submittedMessage =
        "Cards Alert contribution submitted for review.";
    } else {
      return NextResponse.json(
        {
          ok: false,
          error:
            `TNCE project not implemented yet: ${submission.project}`,
        },
        {
          status: 400,
        }
      );
    }

    const submissionId =
      String(
        result.submissionId || ""
      ).trim();

    const ownerMode =
      await isValidTNCEAdminSession(
        req
      );

    const isRemoval =
      submission.submissionAction ===
      "removal";

    if (
      ownerMode &&
      !isRemoval &&
      submissionId
    ) {
      try {
        const publishResult =
          await quickPublishSubmission(
            submission,
            submissionId
          );

        return NextResponse.json({
          ok: true,
          submissionId,
          published: true,
          ownerMode: true,
          message:
            submission.project ===
            "cards-alert"
              ? "Cards Alert card published successfully."
              : "RPA Tracker card published successfully.",
          publishResult,
        });
      } catch (publishError: any) {
        console.error(
          "TNCE Owner Quick Publish failed:",
          publishError
        );

        return NextResponse.json({
          ok: true,
          submissionId,
          published: false,
          ownerMode: true,
          message:
            "Submission was saved but Quick Publish failed. It remains in Pending Review.",
          quickPublishError:
            publishError?.message ||
            "Quick Publish failed.",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      submissionId,
      published: false,
      ownerMode,
      message: isRemoval
        ? "Removal request submitted for review."
        : submittedMessage,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "TNCE submission failed.",
      },
      {
        status: 500,
      }
    );
  }
}