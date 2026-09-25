import "server-only";

import {
  storage,
  cardsAlertPrivateBucket,
} from "@/lib/tnce/storage";

let lastGoodData: any = null;
let lastGoodDataAt = 0;

let lastGoodRecent: any = null;

let lastGoodOptions: any = null;
let lastGoodOptionsAt = 0;

let pendingDatabaseRequest: Promise<any> | null = null;
let pendingRecentRequest: Promise<any> | null = null;
let pendingOptionsRequest: Promise<any> | null = null;

/*
 * Card-detail groups are intentionally cached separately
 * from the full Cards Alert database.
 *
 * Example:
 *
 * RB8521B7B1
 *   -> RB
 *   -> cardsalert-data/card-details/RB.json
 */
const cardDetailCache =
  new Map<
    string,
    {
      data: any;
      loadedAt: number;
    }
  >();

const pendingCardDetailRequests =
  new Map<
    string,
    Promise<any>
  >();

const SNAPSHOT_PREFIX =
  "cardsalert-data";

const DATABASE_OBJECT =
  `${SNAPSHOT_PREFIX}/database.json`;

const RECENT_OBJECT =
  `${SNAPSHOT_PREFIX}/recent.json`;

const OPTIONS_OBJECT =
  `${SNAPSHOT_PREFIX}/options.json`;

const CARD_DETAIL_PREFIX =
  `${SNAPSHOT_PREFIX}/card-details`;

const DATABASE_MEMORY_TTL_MS =
  5 * 60 * 1000;

const OPTIONS_MEMORY_TTL_MS =
  5 * 60 * 1000;

const CARD_DETAIL_MEMORY_TTL_MS =
  5 * 60 * 1000;

const FETCH_TIMEOUT_MS =
  20000;

const MAX_ATTEMPTS =
  3;


function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}


function retryDelay(attempt: number) {
  return attempt === 1
    ? 400
    : 1200;
}


function isRealCard(card: any) {
  if (!card) {
    return false;
  }

  const year =
    String(
      card?.Year || ""
    ).trim();

  const first =
    String(
      card?.First || ""
    ).trim();

  const last =
    String(
      card?.Last || ""
    ).trim();

  const hasName =
    first !== "" ||
    last !== "";

  return Boolean(
    year &&
    hasName
  );
}


function normalizeCardId(
  value: unknown
) {
  return decodeURIComponent(
    String(value ?? "")
  )
    .trim()
    .toUpperCase();
}


function getCardDetailPrefix(
  cardId: string
) {
  const normalized =
    normalizeCardId(
      cardId
    );

  if (normalized.length < 2) {
    return "";
  }

  return normalized.slice(
    0,
    2
  );
}


function validateDatabase(rawData: any) {
  if (
    !rawData ||
    typeof rawData !== "object" ||
    Array.isArray(rawData) ||
    !Array.isArray(rawData.cards)
  ) {
    throw new Error(
      "Cards Alert database snapshot is invalid."
    );
  }

  const cards =
    rawData.cards.filter(isRealCard);

  if (cards.length === 0) {
    throw new Error(
      "Cards Alert database snapshot contains no cards."
    );
  }

  return {
    ...rawData,
    cards,
  };
}


function validateRecent(rawData: any) {
  if (
    !rawData ||
    typeof rawData !== "object" ||
    Array.isArray(rawData) ||
    !Array.isArray(rawData.cards)
  ) {
    throw new Error(
      "Cards Alert recent snapshot is invalid."
    );
  }

  return {
    ...rawData,
    cards:
      rawData.cards.filter(isRealCard),
  };
}


function validateOptions(rawData: any) {
  if (
    !rawData ||
    typeof rawData !== "object" ||
    Array.isArray(rawData)
  ) {
    throw new Error(
      "Cards Alert options snapshot is invalid."
    );
  }

  return rawData;
}


function validateCardDetailGroup(
  rawData: any,
  expectedPrefix: string
) {
  if (
    !rawData ||
    typeof rawData !== "object" ||
    Array.isArray(rawData) ||
    !Array.isArray(rawData.cards)
  ) {
    throw new Error(
      `Cards Alert ${expectedPrefix} card-detail snapshot is invalid.`
    );
  }

  const cards =
    rawData.cards.filter(
      (card: any) => {
        if (!isRealCard(card)) {
          return false;
        }

        const cardId =
          normalizeCardId(
            card?.Card_id
          );

        return (
          getCardDetailPrefix(
            cardId
          ) === expectedPrefix
        );
      }
    );

  return {
    ...rawData,
    cards,
  };
}


async function readJsonObjectOnce(
  objectPath: string,
  label: string
) {
  const bucket =
    storage.bucket(
      cardsAlertPrivateBucket
    );

  const file =
    bucket.file(
      objectPath
    );

  let timeout:
    ReturnType<typeof setTimeout> |
    null = null;

  const startedAt =
    Date.now();

  /*
   * TEMPORARY GCS DIAGNOSTIC
   *
   * Keep this in place while we verify that individual
   * card pages no longer download database.json.
   */
  console.log(
    `[Cards Alert GCS] START ${label} | object=${objectPath} | ${new Date().toISOString()}`
  );

  try {
    const downloadPromise =
      file.download();

    const timeoutPromise =
      new Promise<never>(
        (_, reject) => {
          timeout =
            setTimeout(
              () => {
                reject(
                  new Error(
                    `${label} snapshot timed out.`
                  )
                );
              },
              FETCH_TIMEOUT_MS
            );
        }
      );

    const [buffer] =
      await Promise.race([
        downloadPromise,
        timeoutPromise,
      ]);

    const elapsedMs =
      Date.now() -
      startedAt;

    console.log(
      `[Cards Alert GCS] COMPLETE ${label} | object=${objectPath} | bytes=${buffer.length} | MB=${(
        buffer.length /
        1024 /
        1024
      ).toFixed(2)} | ${elapsedMs}ms`
    );

    const text =
      buffer.toString("utf8");

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `${label} snapshot returned non-JSON. First response text: ${text.slice(
          0,
          200
        )}`
      );
    }
  } catch (error) {
    const elapsedMs =
      Date.now() -
      startedAt;

    console.error(
      `[Cards Alert GCS] FAILED ${label} | object=${objectPath} | ${elapsedMs}ms`,
      error
    );

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}


async function readJsonObjectWithRetry(
  objectPath: string,
  label: string
) {
  let lastError: unknown =
    null;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {
    try {
      return await readJsonObjectOnce(
        objectPath,
        label
      );
    } catch (error) {
      lastError =
        error;

      console.error(
        `Cards Alert ${label} snapshot attempt ${attempt} failed:`,
        error
      );

      if (
        attempt < MAX_ATTEMPTS
      ) {
        await wait(
          retryDelay(attempt)
        );
      }
    }
  }

  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          `Unable to load Cards Alert ${label} snapshot.`
        )
  );
}


async function loadDatabaseSnapshot() {
  const raw =
    await readJsonObjectWithRetry(
      DATABASE_OBJECT,
      "database"
    );

  return validateDatabase(raw);
}


async function loadRecentSnapshot() {
  const raw =
    await readJsonObjectWithRetry(
      RECENT_OBJECT,
      "recent"
    );

  return validateRecent(raw);
}


async function loadOptionsSnapshot() {
  const raw =
    await readJsonObjectWithRetry(
      OPTIONS_OBJECT,
      "options"
    );

  return validateOptions(raw);
}


async function loadCardDetailSnapshot(
  prefix: string
) {
  const objectPath =
    `${CARD_DETAIL_PREFIX}/${prefix}.json`;

  const raw =
    await readJsonObjectWithRetry(
      objectPath,
      `card-detail-${prefix}`
    );

  return validateCardDetailGroup(
    raw,
    prefix
  );
}


/*******************************************************
 * FULL DATABASE
 *******************************************************/

export async function refreshCardsAlertData() {
  if (pendingDatabaseRequest) {
    return pendingDatabaseRequest;
  }

  pendingDatabaseRequest =
    loadDatabaseSnapshot()
      .then((data) => {
        lastGoodData =
          data;

        lastGoodDataAt =
          Date.now();

        return data;
      })
      .finally(() => {
        pendingDatabaseRequest =
          null;
      });

  return pendingDatabaseRequest;
}


export async function getCachedCardsAlertData() {
  const now =
    Date.now();

  if (
    lastGoodData &&
    now - lastGoodDataAt <
      DATABASE_MEMORY_TTL_MS
  ) {
    return lastGoodData;
  }

  if (lastGoodData) {
    if (!pendingDatabaseRequest) {
      pendingDatabaseRequest =
        loadDatabaseSnapshot()
          .then((data) => {
            lastGoodData =
              data;

            lastGoodDataAt =
              Date.now();

            return data;
          })
          .catch((error) => {
            console.error(
              "Background Cards Alert database refresh failed:",
              error
            );

            return lastGoodData;
          })
          .finally(() => {
            pendingDatabaseRequest =
              null;
          });
    }

    return lastGoodData;
  }

  return refreshCardsAlertData();
}


/*******************************************************
 * SINGLE CARD BY PERMANENT Card_id
 *
 * This does NOT load database.json.
 *******************************************************/

export async function getCardsAlertCardById(
  id: string
) {
  const cardId =
    normalizeCardId(id);

  if (!cardId) {
    return null;
  }

  const prefix =
    getCardDetailPrefix(
      cardId
    );

  if (!prefix) {
    return null;
  }

  const now =
    Date.now();

  const cached =
    cardDetailCache.get(
      prefix
    );

  let group: any;

  if (
    cached &&
    now - cached.loadedAt <
      CARD_DETAIL_MEMORY_TTL_MS
  ) {
    group =
      cached.data;
  } else {
    const existingRequest =
      pendingCardDetailRequests.get(
        prefix
      );

    if (existingRequest) {
      group =
        await existingRequest;
    } else {
      const request =
        loadCardDetailSnapshot(
          prefix
        )
          .then((data) => {
            cardDetailCache.set(
              prefix,
              {
                data,
                loadedAt:
                  Date.now(),
              }
            );

            return data;
          })
          .finally(() => {
            pendingCardDetailRequests.delete(
              prefix
            );
          });

      pendingCardDetailRequests.set(
        prefix,
        request
      );

      group =
        await request;
    }
  }

  const card =
    group.cards.find(
      (candidate: any) =>
        normalizeCardId(
          candidate?.Card_id
        ) === cardId
    );

  return card || null;
}


/*******************************************************
 * RECENT CARDS
 *******************************************************/

export async function getCardsAlertRecentSnapshot() {
  if (pendingRecentRequest) {
    return pendingRecentRequest;
  }

  pendingRecentRequest =
    loadRecentSnapshot()
      .then((data) => {
        lastGoodRecent =
          data;

        return data;
      })
      .catch((error) => {
        console.error(
          "Cards Alert recent snapshot refresh failed:",
          error
        );

        if (lastGoodRecent) {
          return lastGoodRecent;
        }

        throw error;
      })
      .finally(() => {
        pendingRecentRequest =
          null;
      });

  return pendingRecentRequest;
}


/*******************************************************
 * FILTER OPTIONS
 *******************************************************/

export async function getCardsAlertOptionsSnapshot() {
  const now =
    Date.now();

  if (
    lastGoodOptions &&
    now - lastGoodOptionsAt <
      OPTIONS_MEMORY_TTL_MS
  ) {
    return lastGoodOptions;
  }

  if (lastGoodOptions) {
    if (!pendingOptionsRequest) {
      pendingOptionsRequest =
        loadOptionsSnapshot()
          .then((data) => {
            lastGoodOptions =
              data;

            lastGoodOptionsAt =
              Date.now();

            return data;
          })
          .catch((error) => {
            console.error(
              "Background Cards Alert options refresh failed:",
              error
            );

            return lastGoodOptions;
          })
          .finally(() => {
            pendingOptionsRequest =
              null;
          });
    }

    return lastGoodOptions;
  }

  if (pendingOptionsRequest) {
    return pendingOptionsRequest;
  }

  pendingOptionsRequest =
    loadOptionsSnapshot()
      .then((data) => {
        lastGoodOptions =
          data;

        lastGoodOptionsAt =
          Date.now();

        return data;
      })
      .finally(() => {
        pendingOptionsRequest =
          null;
      });

  return pendingOptionsRequest;
}