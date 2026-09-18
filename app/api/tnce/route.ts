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
 * Cards Alert verifies the exact published production
 * row/cardId before rebuilding the snapshot.
 *
 * RPA Tracker records recent activity BEFORE rebuilding
 * the public snapshot.
 *******************************************************/

type CardsAlertPublishActivity = {
  cardId?: string;
  productionRow?: number;
};

type RpaPublishActivity = {
  cardId?: string;
  activity?: string;
  publishedAt?: string;
};

const CARDS_ALERT_VERIFY_TIMEOUT_MS =
  15 * 1000;

const CARDS_ALERT_VERIFY_ATTEMPTS =
  6;

function waitForCardsAlertVerification(
  milliseconds: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function cardsAlertVerifyDelay(
  attempt: number
) {
  const delays = [
    1000,
    2000,
    3000,
    5000,
    8000,
  ];

  return delays[
    Math.min(
      attempt - 1,
      delays.length - 1
    )
  ];
}

async function fetchCardsAlertVerification(
  url: string
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      CARDS_ALERT_VERIFY_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          cache:
            "no-store",

          redirect:
            "follow",

          headers: {
            Accept:
              "application/json,text/plain;q=0.9,*/*;q=0.8",
          },

          signal:
            controller.signal,
        }
      );

    const text =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `Cards Alert verify request failed: ${response.status}`
      );
    }

    try {
      return JSON.parse(
        text
      );
    } catch {
      throw new Error(
        `Cards Alert verify returned invalid JSON. First response text: ${text.slice(
          0,
          200
        )}`
      );
    }
  } finally {
    clearTimeout(
      timeout
    );
  }
}

async function verifyCardsAlertPublishedCard(
  submissionId: string,
  activity: CardsAlertPublishActivity
) {
  const apiUrl =
    String(
      process.env
        .CARDS_ALERT_API_URL ||
      ""
    ).trim();

  const cardId =
    String(
      activity.cardId ||
      ""
    ).trim();

  const productionRow =
    Math.floor(
      Number(
        activity.productionRow ||
        0
      )
    );

  if (!apiUrl) {
    throw new Error(
      "Missing CARDS_ALERT_API_URL environment variable."
    );
  }

  if (
    !cardId ||
    !Number.isFinite(
      productionRow
    ) ||
    productionRow < 2
  ) {
    throw new Error(
      `Cards Alert publish ${submissionId} did not return a valid cardId and productionRow.`
    );
  }

  const url =
    new URL(
      apiUrl
    );

  url.searchParams.set(
    "action",
    "verify-card"
  );

  url.searchParams.set(
    "row",
    String(
      productionRow
    )
  );

  url.searchParams.set(
    "cardId",
    cardId
  );

  let lastError: unknown =
    null;

  for (
    let attempt = 1;
    attempt <=
      CARDS_ALERT_VERIFY_ATTEMPTS;
    attempt++
  ) {
    try {
      const result =
        await fetchCardsAlertVerification(
          url.toString()
        );

      if (
        result?.success ===
        false
      ) {
        throw new Error(
          String(
            result?.error ||
            "Cards Alert verification failed."
          )
        );
      }

      const actualCardId =
        String(
          result?.actualCardId ||
          ""
        ).trim();

      if (
        result?.visible ===
          true &&
        actualCardId ===
          cardId
      ) {
        console.log(
          `Cards Alert published card verified for ${submissionId}.`,
          {
            cardId,
            productionRow,
            attempt,
          }
        );

        return;
      }

      lastError =
        new Error(
          `Cards Alert published card ${cardId} is not visible at production row ${productionRow} yet.`
        );

      console.warn(
        `Cards Alert verification attempt ${attempt} did not see published card ${cardId} at row ${productionRow}.`
      );
    } catch (
      error
    ) {
      lastError =
        error;

      console.error(
        `Cards Alert verification attempt ${attempt} failed for ${submissionId}:`,
        error
      );
    }

    if (
      attempt <
      CARDS_ALERT_VERIFY_ATTEMPTS
    ) {
      await waitForCardsAlertVerification(
        cardsAlertVerifyDelay(
          attempt
        )
      );
    }
  }

  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          `Cards Alert published card verification failed for ${submissionId}.`
        )
  );
}

function scheduleProjectSnapshotRefresh(
  project: TNCEProject,
  submissionId: string,
  cardsAlertActivity?: CardsAlertPublishActivity,
  rpaActivity?: RpaPublishActivity
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

          if (
            !cardsAlertActivity
              ?.cardId ||
            !cardsAlertActivity
              ?.productionRow
          ) {
            throw new Error(
              `Cards Alert snapshot refresh cannot verify auto-publish ${submissionId} because cardId or productionRow was not returned.`
            );
          }

          await verifyCardsAlertPublishedCard(
            submissionId,
            cardsAlertActivity
          );

          console.log(
            `Cards Alert snapshot refresh starting after verified auto-publish ${submissionId}.`
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

console.log(
  `TNCE publish result for ${submission.project} ${submissionId}:`,
  publishResult
);

scheduleProjectSnapshotRefresh(
          submission.project,
          submissionId,
          submission.project ===
            "cards-alert"
            ? {
                cardId:
                  String(
                    publishResult
                      ?.cardId ||
                    ""
                  ).trim(),

                productionRow:
                  Number(
                    publishResult
                      ?.productionRow ||
                    0
                  ),
              }
            : undefined,
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