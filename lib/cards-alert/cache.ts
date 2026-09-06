import "server-only";

import {
  storage,
  tnceUploadBucket,
} from "@/lib/tnce/storage";

let lastGoodData: any = null;
let lastGoodDataAt = 0;

let lastGoodRecent: any = null;

let lastGoodOptions: any = null;
let lastGoodOptionsAt = 0;

let pendingDatabaseRequest: Promise<any> | null = null;
let pendingRecentRequest: Promise<any> | null = null;
let pendingOptionsRequest: Promise<any> | null = null;

const SNAPSHOT_PREFIX =
  "cardsalert-data";

const DATABASE_OBJECT =
  `${SNAPSHOT_PREFIX}/database.json`;

const RECENT_OBJECT =
  `${SNAPSHOT_PREFIX}/recent.json`;

const OPTIONS_OBJECT =
  `${SNAPSHOT_PREFIX}/options.json`;

const DATABASE_MEMORY_TTL_MS =
  5 * 60 * 1000;

const OPTIONS_MEMORY_TTL_MS =
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
  const first =
    String(card?.First || "").trim();

  const last =
    String(card?.Last || "").trim();

  const brand =
    String(card?.Brand || "").trim();

  const cert =
    String(card?.Cert_Number || "").trim();

  const front =
    String(card?.front_image || "").trim();

  const back =
    String(card?.back_image || "").trim();

  return (
    (first !== "" || last !== "") &&
    brand !== "" &&
    (
      cert !== "" ||
      front.startsWith("http") ||
      back.startsWith("http")
    )
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


async function readJsonObjectOnce(
  objectPath: string,
  label: string
) {
  const bucket =
    storage.bucket(
      tnceUploadBucket
    );

  const file =
    bucket.file(
      objectPath
    );

  const downloadPromise =
    file.download();

  const timeoutPromise =
    new Promise<never>(
      (_, reject) => {
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
  /*
   * recent.json is read directly from GCS using the
   * authenticated Storage client, so there is no
   * public/CDN cache to bust.
   */
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


/*******************************************************
 * FULL DATABASE
 *
 * database.json is large, so retain the existing
 * five-minute in-memory caching behavior.
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

  /*
   * Warm server:
   *
   * Serve the large database immediately and update
   * it in the background.
   */
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

  /*
   * Cold server:
   *
   * Retrieve the already-built database snapshot
   * directly from GCS.
   */
  return refreshCardsAlertData();
}


/*******************************************************
 * RECENT CARDS
 *
 * recent.json is only the newest Cards Alert cards.
 *
 * Unlike database.json, we intentionally DO NOT keep
 * recent.json behind a time-based memory cache.
 *
 * Every startup request retrieves the current GCS
 * snapshot.
 *
 * This prevents a warm Vercel instance from continuing
 * to serve an older Cards Alert homepage after new
 * cards have been published.
 *******************************************************/

export async function getCardsAlertRecentSnapshot() {
  /*
   * If simultaneous requests arrive, they can share
   * the same in-progress GCS request.
   */
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

        /*
         * Only use the old in-memory copy as an
         * emergency fallback if GCS is unavailable.
         */
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
 *
 * These do not need immediate freshness, so retain
 * the existing five-minute memory cache.
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