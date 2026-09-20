import {
  after,
  NextRequest,
  NextResponse,
} from "next/server";

import { Jimp } from "jimp";

import type {
  TNCEProject,
} from "@/lib/tnce/types";

import {
  buildCardsAlertSnapshots,
} from "@/lib/cards-alert/snapshot";

import {
  buildRPATrackerSnapshot,
} from "@/lib/rpa-tracker/snapshot";

import {
  recordRpaRecentActivity,
} from "@/lib/rpa-tracker/recent-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPA_FIELDS = [
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

const CARDS_ALERT_FIELDS = [
  "Year",
  "First",
  "Last",
  "Num",
  "Brand",
  "Parallel",
  "Serial_Number",
  "Grade",
  "Cert_Number",
  "Status",
  "Description",
  "Sport",
  "Year_Added",
  "Site_Link",
  "Front_Image",
  "Back_Image",
  "Additional_Images",
  "Found_By",
] as const;

type ImageRole =
  | "front"
  | "back"
  | "additional";

type CleanImage = {
  id: string;
  url: string;
  role: ImageRole;
  rotation: number;
};

function endpointForProject(
  project: TNCEProject
) {
  return project ===
    "cards-alert"
    ? process.env
        .CARDS_ALERT_TNCE_APPS_SCRIPT_URL
    : project ===
        "rpa-tracker"
      ? process.env
          .TNCE_APPS_SCRIPT_URL
      : "";
}

function secretForProject(
  project: TNCEProject
) {
  return project ===
    "cards-alert"
    ? process.env
        .CARDS_ALERT_TNCE_ADMIN_SECRET ||
        process.env
          .TNCE_ADMIN_SECRET
    : process.env
        .TNCE_ADMIN_SECRET;
}

function cleanRecord(
  project: TNCEProject,
  value: unknown
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  const fields =
    project ===
    "cards-alert"
      ? CARDS_ALERT_FIELDS
      : RPA_FIELDS;

  const result:
    Record<string, string> =
      {};

  fields.forEach(
    (field) => {
      if (
        !Object.prototype
          .hasOwnProperty.call(
            source,
            field
          )
      ) {
        return;
      }

      const value =
        source[field];

      result[field] =
        Array.isArray(value)
          ? value
              .map((item) =>
                String(
                  item ?? ""
                ).trim()
              )
              .filter(Boolean)
              .join("\n")
          : String(
              value ?? ""
            ).trim();
    }
  );

  return result;
}

function cleanImages(
  value: unknown
): CleanImage[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .map((item: any) => {
      const role =
        String(
          item?.role || ""
        ).toLowerCase();

      const rotationValue =
        Number(
          item?.rotation || 0
        );

      const rotation =
        [
          0,
          90,
          180,
          270,
        ].includes(
          rotationValue
        )
          ? rotationValue
          : 0;

      return {
        id:
          String(
            item?.id || ""
          ).trim(),

        url:
          String(
            item?.url || ""
          ).trim(),

        role:
          role === "front"
            ? "front"
            : role === "back"
              ? "back"
              : "additional",

        rotation,
      } as CleanImage;
    })
    .filter(
      (image) =>
        image.url
    );
}

async function prepareRotatedImages(
  images: CleanImage[]
) {
  const prepared = [];

  for (
    let index = 0;
    index < images.length;
    index++
  ) {
    const image =
      images[index];

    if (!image.rotation) {
      continue;
    }

    const response =
      await fetch(
        image.url,
        {
          cache:
            "no-store",
        }
      );

    if (!response.ok) {
      throw new Error(
        `Unable to download image for rotation (${response.status}).`
      );
    }

    const source =
      Buffer.from(
        await response.arrayBuffer()
      );

    const editedImage =
      await Jimp.read(
        source
      );

    editedImage.rotate(
      image.rotation
    );

    const rotated =
      await editedImage.getBuffer(
        "image/jpeg",
        {
          quality: 90,
        }
      );

    prepared.push({
      originalUrl:
        image.url,

      role:
        image.role,

      rotation:
        image.rotation,

      fileName:
        `${image.role}-rotated-${index + 1}.jpg`,

      contentType:
        "image/jpeg",

      base64:
        `data:image/jpeg;base64,${Buffer.from(
          rotated
        ).toString(
          "base64"
        )}`,
    });
  }

  return prepared;
}

/*******************************************************
 * AUTOMATIC SNAPSHOT REFRESH
 *
 * Runs AFTER a successful publish response is returned.
 *
 * Snapshot failures are logged but never turn an already
 * successful TNCE publish into a failed publish.
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
      setTimeout(resolve, milliseconds);
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
      () => controller.abort(),
      CARDS_ALERT_VERIFY_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(url, {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept:
            "application/json,text/plain;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });

    const responseText =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `Cards Alert verify request failed: ${response.status}`
      );
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error(
        `Cards Alert verify returned invalid JSON. First response text: ${responseText.slice(
          0,
          200
        )}`
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyCardsAlertPublishedCard(
  submissionId: string,
  activity: CardsAlertPublishActivity
) {
  const apiUrl =
    String(
      process.env.CARDS_ALERT_API_URL || ""
    ).trim();

  const cardId =
    String(activity.cardId || "").trim();

  const productionRow =
    Math.floor(
      Number(activity.productionRow || 0)
    );

  if (!apiUrl) {
    throw new Error(
      "Missing CARDS_ALERT_API_URL environment variable."
    );
  }

  if (
    !cardId ||
    !Number.isFinite(productionRow) ||
    productionRow < 2
  ) {
    throw new Error(
      `Cards Alert publish ${submissionId} did not return a valid cardId and productionRow.`
    );
  }

  const verifyUrl = new URL(apiUrl);

  verifyUrl.searchParams.set(
    "action",
    "verify-card"
  );
  verifyUrl.searchParams.set(
    "row",
    String(productionRow)
  );
  verifyUrl.searchParams.set(
    "cardId",
    cardId
  );

  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= CARDS_ALERT_VERIFY_ATTEMPTS;
    attempt++
  ) {
    try {
      const result =
        await fetchCardsAlertVerification(
          verifyUrl.toString()
        );

      if (result?.success === false) {
        throw new Error(
          String(
            result?.error ||
              "Cards Alert verification failed."
          )
        );
      }

      const actualCardId =
        String(
          result?.actualCardId || ""
        ).trim();

      if (
        result?.visible === true &&
        actualCardId === cardId
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
    } catch (error) {
      lastError = error;

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
        cardsAlertVerifyDelay(attempt)
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
    project !== "cards-alert" &&
    project !== "rpa-tracker"
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
          if (
            cardsAlertActivity?.cardId &&
            cardsAlertActivity?.productionRow
          ) {
            console.log(
              `Cards Alert snapshot refresh scheduled after publish ${submissionId}.`
            );

            await verifyCardsAlertPublishedCard(
              submissionId,
              cardsAlertActivity
            );

            console.log(
              `Cards Alert snapshot refresh starting after verified publish ${submissionId}.`
            );
          } else {
            /*
             * Recovery path:
             * adminQueue confirmed Published after an interrupted
             * Apps Script response, but the final row/Card_id may
             * not be available. Preserve the existing fallback.
             */
            console.warn(
              `Cards Alert snapshot refresh starting after recovered publish ${submissionId} without exact row/Card_id verification.`
            );
          }

          const result =
            await buildCardsAlertSnapshots();

          console.log(
            `Cards Alert snapshot refresh completed after publish ${submissionId}.`,
            {
              cardCount:
                result.cardCount,
              generatedAt:
                result.generatedAt,
            }
          );

          return;
        }

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
          } catch (error) {
            /*
             * Recent activity is helpful, but it
             * should never prevent the production
             * RPA snapshot from refreshing.
             */
            console.error(
              `Unable to record RPA recent activity for ${rpaActivity.cardId}:`,
              error
            );
          }
        }

        console.log(
          `RPA Tracker snapshot refresh starting after publish ${submissionId}.`
        );

        const result =
          await buildRPATrackerSnapshot();

        console.log(
          `RPA Tracker snapshot refresh completed after publish ${submissionId}.`,
          {
            cardCount:
              result.cardCount,

            groupCount:
              result.groupCount,

            refreshedAt:
              result.refreshedAt,
          }
        );
      } catch (error) {
        console.error(
          `${project} snapshot refresh failed after publish ${submissionId}:`,
          error
        );
      }
    }
  );
}

export async function POST(
  req: NextRequest
) {
  try {
    const body =
      await req.json();

    const project =
      String(
        body?.project || ""
      ) as TNCEProject;

    const submissionId =
      String(
        body?.submissionId ||
          ""
      ).trim();

    const url =
      endpointForProject(
        project
      );

    const adminSecret =
      secretForProject(
        project
      );

    if (
      !url ||
      !adminSecret ||
      !submissionId
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Missing TNCE publish configuration or submission ID.",
        },
        {
          status: 400,
        }
      );
    }

    const organizedImages =
      cleanImages(
        body?.organizedImages
      );

    const rotatedImages =
      await prepareRotatedImages(
        organizedImages
      );

    const publishPayload = {
      action:
        "publish",

      adminSecret,

      submissionId,

      reviewNotes:
        String(
          body?.reviewNotes ||
            ""
        ).trim(),

      contributorNotes:
        String(
          body?.contributorNotes ||
            ""
        ).trim(),

      productionRecord:
        cleanRecord(
          project,
          body?.productionRecord
        ),

      organizedImages,

      rotatedImages,
    };

    let publishError = "";

    try {
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
                publishPayload
              ),

            cache:
              "no-store",

            redirect:
              "follow",
          }
        );

      const text =
        await response.text();

      let data: any =
        null;

      try {
        data =
          JSON.parse(
            text
          );
      } catch {
        publishError =
          `TNCE publish returned invalid JSON: ${text.slice(
            0,
            500
          )}`;
      }

      /*
       * NORMAL SUCCESSFUL PUBLISH
       */
      if (
        data &&
        response.ok &&
        data.ok
      ) {
        scheduleProjectSnapshotRefresh(
          project,
          submissionId,
          project ===
          "cards-alert"
            ? {
                cardId:
                  String(
                    data.cardId || ""
                  ).trim(),

                productionRow:
                  Number(
                    data.productionRow || 0
                  ),
              }
            : undefined,
          project ===
          "rpa-tracker"
            ? {
                cardId:
                  String(
                    data.cardId ||
                      ""
                  ).trim(),

                activity:
                  String(
                    data.action ||
                      ""
                  ).trim(),

                publishedAt:
                  String(
                    data.publishedAt ||
                      ""
                  ).trim(),
              }
            : undefined
        );

        return NextResponse.json(
          data,
          {
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      }

      if (data) {
        publishError =
          String(
            data.error ||
              data.message ||
              "Publishing failed."
          );
      } else if (
        !publishError
      ) {
        publishError =
          `Publishing failed with status ${response.status}.`;
      }
    } catch (
      error: any
    ) {
      publishError =
        error?.message ||
        "The publish request did not return a result.";
    }

    /*
     * The Apps Script operation may have completed even
     * when its HTTP response failed or timed out.
     *
     * Check the queue before reporting a failure.
     */
    const verifyResponse =
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
            JSON.stringify({
              action:
                "adminQueue",

              adminSecret,

              project,
            }),

          cache:
            "no-store",

          redirect:
            "follow",
        }
      );

    const verifyText =
      await verifyResponse
        .text();

    let verifyData: any =
      null;

    try {
      verifyData =
        JSON.parse(
          verifyText
        );
    } catch {
      verifyData =
        null;
    }

    const queueItems =
      Array.isArray(
        verifyData
          ?.submissions
      )
        ? verifyData
            .submissions
        : Array.isArray(
              verifyData?.items
            )
          ? verifyData.items
          : Array.isArray(
                verifyData
                  ?.queue
              )
            ? verifyData.queue
            : [];

    const matchingSubmission =
      queueItems.find(
        (item: any) =>
          String(
            item
              ?.Submission_ID ||
              item
                ?.submissionId ||
              item?.id ||
              ""
          ).trim() ===
          submissionId
      );

    const verifiedStatus =
      String(
        matchingSubmission
          ?.TNCE_Status ||
          matchingSubmission
            ?.status ||
          ""
      )
        .trim()
        .toLowerCase();

    /*
     * RECOVERED SUCCESSFUL PUBLISH
     *
     * Apps Script completed the publish even though
     * the original HTTP response was interrupted.
     *
     * We still refresh the production snapshot, but
     * we do not write Recent Activity here because
     * the interrupted response did not reliably give
     * us the final cardId/action.
     */
    if (
      verifiedStatus ===
      "published"
    ) {
      scheduleProjectSnapshotRefresh(
        project,
        submissionId,
        undefined,
        undefined
      );

      return NextResponse.json(
        {
          ok: true,

          submissionId,

          status:
            "Published",

          recovered:
            true,

          message:
            "The card was published successfully, but the original publish response was interrupted.",
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    throw new Error(
      publishError ||
        "Publishing failed."
    );
  } catch (
    error: any
  ) {
    console.error(
      "TNCE publish route error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error?.message ||
          "Publishing failed.",
      },
      {
        status: 500,
      }
    );
  }
}