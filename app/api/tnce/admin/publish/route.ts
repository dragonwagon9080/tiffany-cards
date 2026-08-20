import {
  after,
  NextRequest,
  NextResponse,
} from "next/server";

import sharp from "sharp";

import type {
  TNCEProject,
} from "@/lib/tnce/types";

import {
  buildCardsAlertSnapshots,
} from "@/lib/cards-alert/snapshot";

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

    const rotated =
      await sharp(source)
        .rotate(
          image.rotation
        )
        .jpeg({
          quality: 90,
          mozjpeg: true,
        })
        .toBuffer();

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
        `data:image/jpeg;base64,${rotated.toString(
          "base64"
        )}`,
    });
  }

  return prepared;
}


/*******************************************************
 * CARDS ALERT AUTOMATIC SNAPSHOT REFRESH
 *
 * Runs AFTER the publish response has been returned.
 *
 * The user does not need to wait for the full Cards
 * Alert snapshot rebuild before TNCE reports that the
 * card was successfully published.
 *******************************************************/

function scheduleCardsAlertSnapshotRefresh(
  project: TNCEProject,
  submissionId: string
) {
  if (
    project !==
    "cards-alert"
  ) {
    return;
  }

  after(
    async () => {
      try {
        console.log(
          `Cards Alert snapshot refresh starting after publish ${submissionId}.`
        );

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
      } catch (error) {
        /*
         * IMPORTANT:
         *
         * The card has already been successfully
         * published at this point.
         *
         * A snapshot failure should therefore be
         * logged, but it must NOT change the publish
         * result into a failure.
         */
        console.error(
          `Cards Alert snapshot refresh failed after publish ${submissionId}:`,
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
        scheduleCardsAlertSnapshotRefresh(
          project,
          submissionId
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
     */
    if (
      verifiedStatus ===
      "published"
    ) {
      scheduleCardsAlertSnapshotRefresh(
        project,
        submissionId
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