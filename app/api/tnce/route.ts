import {
  after,
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

import {
  buildCardsAlertSnapshots,
} from "@/lib/cards-alert/snapshot";

import {
  buildRPATrackerSnapshot,
} from "@/lib/rpa-tracker/snapshot";

import {
  recordRpaRecentActivity,
} from "@/lib/rpa-tracker/recent-activity";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


function endpointForProject(
  project: TNCEProject
) {
  if (
    project ===
    "cards-alert"
  ) {
    return process.env
      .CARDS_ALERT_TNCE_APPS_SCRIPT_URL;
  }

  if (
    project ===
    "rpa-tracker"
  ) {
    return process.env
      .TNCE_APPS_SCRIPT_URL;
  }

  return "";
}


function adminSecretForProject(
  project: TNCEProject
) {
  if (
    project ===
    "cards-alert"
  ) {
    return (
      process.env
        .CARDS_ALERT_TNCE_ADMIN_SECRET ||
      process.env
        .TNCE_ADMIN_SECRET
    );
  }

  if (
    project ===
    "rpa-tracker"
  ) {
    return process.env
      .TNCE_ADMIN_SECRET;
  }

  return "";
}


/*******************************************************
 * AUTOMATIC SNAPSHOT REFRESH
 *
 * Runs after a successful owner-mode publish.
 *
 * The publish response is returned first so owner-mode
 * publishing does not wait for the snapshot rebuild.
 *
 * For RPA Tracker, recent activity is recorded BEFORE
 * the snapshot rebuild so the new/updated card can be
 * included in recentCards immediately.
 *******************************************************/

function scheduleProjectSnapshotRefresh(
  project: TNCEProject,
  submissionId: string,
  rpaActivity?: {
    cardId?: string;
    activity?: string;
    publishedAt?: string;
  }
) {
  if (
    project !==
      "cards-alert" &&
    project !==
      "rpa-tracker"
  ) {
    return;
  }

  after(
    async () => {
      try {
        if (
  project ===
  "cards-alert"
) {
  console.log(
    `Cards Alert snapshot refresh scheduled after auto-publish ${submissionId}.`
  );

  /*
   * Give the production sheet / Apps Script API
   * a moment to reflect the newly published row
   * before rebuilding the public snapshot.
   */
  await new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        3000
      )
  );

  console.log(
    `Cards Alert snapshot refresh starting after auto-publish ${submissionId}.`
  );

  const result =
    await buildCardsAlertSnapshots();

  console.log(
    `Cards Alert snapshot refresh completed after auto-publish ${submissionId}.`,
    {
      cardCount:
        result.cardCount,

      generatedAt:
        result.generatedAt,
    }
  );

  return;
}

        /*
         * Record the RPA activity BEFORE rebuilding
         * the public snapshot.
         *
         * The production database remains the source
         * of truth for the actual card image/details.
         */
        if (
          rpaActivity?.cardId
        ) {
          try {
            await recordRpaRecentActivity(
              {
                cardId:
                  rpaActivity.cardId,

                activity:
                  rpaActivity.activity ||
                  "new",

                publishedAt:
                  rpaActivity.publishedAt,
              }
            );

            console.log(
              `RPA recent activity recorded for ${rpaActivity.cardId}.`
            );
          } catch (
            error
          ) {
            /*
             * Recent activity is supplemental.
             * Never allow it to make a successful
             * card publish fail.
             */
            console.error(
              `Unable to record RPA recent activity for ${rpaActivity.cardId}:`,
              error
            );
          }
        } else {
          console.warn(
            `RPA recent activity was not recorded after auto-publish ${submissionId} because no cardId was returned.`
          );
        }

        console.log(
          `RPA Tracker snapshot refresh starting after auto-publish ${submissionId}.`
        );

        const result =
          await buildRPATrackerSnapshot();

        console.log(
          `RPA Tracker snapshot refresh completed after auto-publish ${submissionId}.`,
          {
            cardCount:
              result.cardCount,

            groupCount:
              result.groupCount,

            recentCardCount:
              result.recentCardCount,

            refreshedAt:
              result.refreshedAt,
          }
        );
      } catch (
        error
      ) {
        /*
         * The card is already published.
         * Snapshot failure must never turn a successful
         * card publish into a failed submission.
         */
        console.error(
          `${project} snapshot refresh failed after auto-publish ${submissionId}:`,
          error
        );
      }
    }
  );
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

  const response =
    await fetch(
      url,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8",
        },

        body:
          JSON.stringify(
            {
              action:
                "publish",

              adminSecret,

              submissionId,

              reviewNotes:
                "Published automatically through TNCE Owner Mode.",

              contributorNotes:
                String(
                  submission.notes ||
                    ""
                ).trim(),
            }
          ),

        cache:
          "no-store",

        redirect:
          "follow",
      }
    );

  const text =
    await response.text();

  let data: any;

  try {
    data =
      JSON.parse(
        text
      );
  } catch {
    throw new Error(
      `TNCE quick publish returned invalid JSON. First response text: ${text.slice(
        0,
        500
      )}`
    );
  }

  if (
    !response.ok ||
    !data.ok
  ) {
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

    if (
      !submission.project
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Missing TNCE project.",
        },
        {
          status:
            400,
        }
      );
    }

    let result: any;

    let submittedMessage =
      "";

    /*
     * Save the contribution first.
     */
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
          status:
            400,
        }
      );
    }

    const submissionId =
      String(
        result.submissionId ||
          ""
      ).trim();

    const ownerMode =
      await isValidTNCEAdminSession(
        req
      );

    const isRemoval =
      submission
        .submissionAction ===
      "removal";

    /*
     * OWNER MODE
     *
     * Automatically publish normal additions/updates
     * when the authenticated owner submits them.
     *
     * Removal requests still go through review.
     */
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

        scheduleProjectSnapshotRefresh(
          submission.project,
          submissionId,
          submission.project ===
          "rpa-tracker"
            ? {
                cardId:
                  String(
                    publishResult
                      ?.cardId ||
                      ""
                  ).trim(),

                activity:
                  String(
                    publishResult
                      ?.action ||
                      ""
                  ).trim(),

                publishedAt:
                  String(
                    publishResult
                      ?.publishedAt ||
                      ""
                  ).trim(),
              }
            : undefined
        );

        return NextResponse.json(
          {
            ok: true,

            submissionId,

            published:
              true,

            ownerMode:
              true,

            message:
              submission.project ===
              "cards-alert"
                ? "Cards Alert card published successfully."
                : "RPA Tracker card published successfully.",

            publishResult,
          },
          {
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      } catch (
        publishError: any
      ) {
        console.error(
          "TNCE Owner Quick Publish failed:",
          publishError
        );

        return NextResponse.json(
          {
            ok: true,

            submissionId,

            published:
              false,

            ownerMode:
              true,

            message:
              "Submission was saved but Quick Publish failed. It remains in Pending Review.",

            quickPublishError:
              publishError
                ?.message ||
              "Quick Publish failed.",
          },
          {
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      }
    }

    /*
     * Normal public submission.
     */
    return NextResponse.json(
      {
        ok: true,

        submissionId,

        published:
          false,

        ownerMode,

        message:
          isRemoval
            ? "Removal request submitted for review."
            : submittedMessage,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "TNCE submission route error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error?.message ||
          "TNCE submission failed.",
      },
      {
        status:
          500,
      }
    );
  }
}