import "server-only";

import {
  storage,
  cardsAlertPrivateBucket,
} from "@/lib/tnce/storage";

const RECENT_ACTIVITY_OBJECT =
  "rpa-tracker-data/recent-activity.json";

const MAX_RECENT_ACTIVITY = 50;

export type RpaRecentActivityType =
  | "new"
  | "updated";

export type RpaRecentActivity = {
  cardId: string;
  activity: RpaRecentActivityType;
  publishedAt: string;
};

function cleanString(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}

function normalizeActivity(
  value: unknown
): RpaRecentActivityType {
  const text =
    cleanString(value)
      .toLowerCase();

  return text.includes(
    "update"
  )
    ? "updated"
    : "new";
}

export async function getRpaRecentActivity(): Promise<
  RpaRecentActivity[]
> {
  const bucket =
    storage.bucket(
      cardsAlertPrivateBucket
    );

  const file =
    bucket.file(
      RECENT_ACTIVITY_OBJECT
    );

  try {
    const [exists] =
      await file.exists();

    if (!exists) {
      return [];
    }

    const [buffer] =
      await file.download();

    const parsed =
      JSON.parse(
        buffer.toString(
          "utf8"
        )
      );

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed
      .map(
        (
          item: any
        ): RpaRecentActivity => ({
          cardId:
            cleanString(
              item?.cardId
            ),

          activity:
            normalizeActivity(
              item?.activity
            ),

          publishedAt:
            cleanString(
              item?.publishedAt
            ),
        })
      )
      .filter(
        (item) =>
          item.cardId &&
          item.publishedAt
      );
  } catch (error) {
    console.error(
      "Unable to read RPA recent activity:",
      error
    );

    return [];
  }
}

export async function recordRpaRecentActivity({
  cardId,
  activity,
  publishedAt,
}: {
  cardId: string;
  activity:
    | RpaRecentActivityType
    | string;
  publishedAt?: string;
}) {
  const cleanCardId =
    cleanString(cardId);

  if (!cleanCardId) {
    return;
  }

  const item: RpaRecentActivity =
    {
      cardId:
        cleanCardId,

      activity:
        normalizeActivity(
          activity
        ),

      publishedAt:
        cleanString(
          publishedAt
        ) ||
        new Date().toISOString(),
    };

  const current =
    await getRpaRecentActivity();

  /*
   * Remove any previous appearance of
   * this Card ID so the newest activity
   * moves back to the front.
   */
  const next = [
    item,

    ...current.filter(
      (existing) =>
        existing.cardId !==
        item.cardId
    ),
  ].slice(
    0,
    MAX_RECENT_ACTIVITY
  );

  const body =
    JSON.stringify(
      next
    );

  const bucket =
    storage.bucket(
      cardsAlertPrivateBucket
    );

  const file =
    bucket.file(
      RECENT_ACTIVITY_OBJECT
    );

  await file.save(
    body,
    {
      resumable: false,

      contentType:
        "application/json",

      metadata: {
        cacheControl:
          "private, max-age=60",
      },
    }
  );
}