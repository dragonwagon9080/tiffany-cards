import "server-only";

let lastGoodData: any = null;
let lastGoodDataAt = 0;

let lastGoodRecent: any = null;
let lastGoodRecentAt = 0;

let lastGoodOptions: any = null;
let lastGoodOptionsAt = 0;

let pendingDatabaseRequest: Promise<any> | null = null;
let pendingRecentRequest: Promise<any> | null = null;
let pendingOptionsRequest: Promise<any> | null = null;

const BUCKET =
  process.env.TNCE_UPLOAD_BUCKET || "tiffanycards";

const SNAPSHOT_BASE_URL =
  `https://storage.googleapis.com/${BUCKET}/cardsalert-data`;

const DATABASE_URL =
  `${SNAPSHOT_BASE_URL}/database.json`;

const RECENT_URL =
  `${SNAPSHOT_BASE_URL}/recent.json`;

const OPTIONS_URL =
  `${SNAPSHOT_BASE_URL}/options.json`;

const DATABASE_MEMORY_TTL_MS =
  5 * 60 * 1000;

const RECENT_MEMORY_TTL_MS =
  60 * 1000;

const OPTIONS_MEMORY_TTL_MS =
  5 * 60 * 1000;

const FETCH_TIMEOUT_MS =
  20000;

const MAX_ATTEMPTS = 3;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function retryDelay(attempt: number) {
  return attempt === 1 ? 400 : 1200;
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

async function fetchJsonOnce(
  url: string,
  label: string
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

  try {
    const response =
      await fetch(
        url,
        {
          method: "GET",

          /*
           * IMPORTANT:
           * Do not put the 13+ MB database into Next.js'
           * Data Cache. GCS is the persistent web cache.
           */
          cache: "no-store",

          redirect: "follow",

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
        `${label} snapshot failed: ${response.status}`
      );
    }

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
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithRetry(
  url: string,
  label: string
) {
  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {
    try {
      return await fetchJsonOnce(
        url,
        label
      );
    } catch (error) {
      lastError = error;

      console.error(
        `Cards Alert ${label} snapshot attempt ${attempt} failed:`,
        error
      );

      if (attempt < MAX_ATTEMPTS) {
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
    await fetchJsonWithRetry(
      DATABASE_URL,
      "database"
    );

  return validateDatabase(raw);
}

async function loadRecentSnapshot() {
  const raw =
    await fetchJsonWithRetry(
      RECENT_URL,
      "recent"
    );

  return validateRecent(raw);
}

async function loadOptionsSnapshot() {
  const raw =
    await fetchJsonWithRetry(
      OPTIONS_URL,
      "options"
    );

  return validateOptions(raw);
}

export async function refreshCardsAlertData() {
  if (pendingDatabaseRequest) {
    return pendingDatabaseRequest;
  }

  pendingDatabaseRequest =
    loadDatabaseSnapshot()
      .then((data) => {
        lastGoodData = data;
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
   * If this warm server already has a good snapshot,
   * serve it immediately and refresh from GCS in the
   * background. Visitors never wait for the refresh.
   */
  if (lastGoodData) {
    if (!pendingDatabaseRequest) {
      pendingDatabaseRequest =
        loadDatabaseSnapshot()
          .then((data) => {
            lastGoodData = data;
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
   * Cold server instance: retrieve the already-built
   * database snapshot from GCS instead of Apps Script.
   */
  return refreshCardsAlertData();
}

export async function getCardsAlertRecentSnapshot() {
  const now =
    Date.now();

  if (
    lastGoodRecent &&
    now - lastGoodRecentAt <
      RECENT_MEMORY_TTL_MS
  ) {
    return lastGoodRecent;
  }

  if (lastGoodRecent) {
    if (!pendingRecentRequest) {
      pendingRecentRequest =
        loadRecentSnapshot()
          .then((data) => {
            lastGoodRecent =
              data;

            lastGoodRecentAt =
              Date.now();

            return data;
          })
          .catch((error) => {
            console.error(
              "Background Cards Alert recent refresh failed:",
              error
            );

            return lastGoodRecent;
          })
          .finally(() => {
            pendingRecentRequest =
              null;
          });
    }

    return lastGoodRecent;
  }

  if (pendingRecentRequest) {
    return pendingRecentRequest;
  }

  pendingRecentRequest =
    loadRecentSnapshot()
      .then((data) => {
        lastGoodRecent = data;
        lastGoodRecentAt =
          Date.now();

        return data;
      })
      .finally(() => {
        pendingRecentRequest =
          null;
      });

  return pendingRecentRequest;
}

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
        lastGoodOptions = data;
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