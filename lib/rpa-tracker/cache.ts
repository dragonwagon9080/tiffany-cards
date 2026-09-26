import "server-only";

import {
  storage,
  cardsAlertPrivateBucket,
} from "@/lib/tnce/storage";

/*
 * =========================================================
 * EXISTING FULL DATABASE CACHE
 * =========================================================
 *
 * Keep this behavior intact for now.
 * The current live RPA Tracker still uses database.json.
 */

let cachedData: any = null;
let cachedGeneration: string | null = null;
let lastMetadataCheckAt = 0;
let pendingRequest: Promise<any> | null = null;

/*
 * We only check the small GCS object metadata every 15 seconds.
 * The full snapshot is downloaded only when the object
 * generation changes (or when this server instance has no cache).
 */
const METADATA_CHECK_TIME =
  15_000;

const SNAPSHOT_OBJECT =
  "rpa-tracker-data/database.json";

const DOWNLOAD_TIMEOUT_MS =
  20_000;

/*
 * =========================================================
 * NEW LIGHTWEIGHT SNAPSHOTS
 * =========================================================
 */

const INDEX_OBJECT =
  "rpa-tracker-data/index.json";

const GROUP_PREFIX =
  "rpa-tracker-data/groups";

const CARD_DETAIL_PREFIX =
  "rpa-tracker-data/card-details";

/*
 * Lightweight objects can remain in process memory for
 * five minutes before being refreshed.
 */
const LIGHTWEIGHT_CACHE_TIME =
  5 * 60 * 1000;

let cachedIndex: any = null;
let cachedIndexAt = 0;
let pendingIndexRequest:
  Promise<any> | null = null;

const groupCache =
  new Map<
    string,
    {
      data: any;
      loadedAt: number;
    }
  >();

const pendingGroupRequests =
  new Map<
    string,
    Promise<any>
  >();

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

/*
 * =========================================================
 * SHARED HELPERS
 * =========================================================
 */

function cleanString(
  value: any
) {
  return String(
    value ?? ""
  ).trim();
}

function normalizeCardId(
  value: any
) {
  return cleanString(
    value
  ).toUpperCase();
}

function getCardDetailPrefix(
  cardId: any
) {
  return normalizeCardId(
    cardId
  ).slice(
    0,
    2
  );
}

function normalizeSlug(
  value: any
) {
  return cleanString(
    value
  );
}

function objectFile(
  objectPath: string
) {
  return storage
    .bucket(
      cardsAlertPrivateBucket
    )
    .file(
      objectPath
    );
}

/*
 * Generic JSON reader used by the new lightweight
 * index, group and card-detail snapshots.
 *
 * Diagnostic logging is intentional for now.
 */
async function readJsonObject(
  objectPath: string,
  label: string
) {
  const file =
    objectFile(
      objectPath
    );

  const startedAt =
    Date.now();

  console.log(
    `[RPA Tracker GCS] START ${label} | object=${objectPath} | ${new Date().toISOString()}`
  );

  let timeoutHandle:
    ReturnType<typeof setTimeout>
    | null = null;

  try {
    const timeoutPromise =
      new Promise<never>(
        (_, reject) => {
          timeoutHandle =
            setTimeout(() => {
              reject(
                new Error(
                  `RPA Tracker ${label} download timed out.`
                )
              );
            }, DOWNLOAD_TIMEOUT_MS);
        }
      );

    const downloadPromise =
      file.download();

    const [buffer] =
      await Promise.race([
        downloadPromise,
        timeoutPromise,
      ]);

    const elapsedMs =
      Date.now() -
      startedAt;

    console.log(
      `[RPA Tracker GCS] COMPLETE ${label} | object=${objectPath} | bytes=${buffer.length} | MB=${(
        buffer.length /
        1024 /
        1024
      ).toFixed(2)} | ${elapsedMs}ms`
    );

    return JSON.parse(
      buffer.toString(
        "utf8"
      )
    );
  } catch (error) {
    const elapsedMs =
      Date.now() -
      startedAt;

    console.error(
      `[RPA Tracker GCS] FAILED ${label} | object=${objectPath} | ${elapsedMs}ms`,
      error
    );

    throw error;
  } finally {
    if (
      timeoutHandle
    ) {
      clearTimeout(
        timeoutHandle
      );
    }
  }
}

/*
 * =========================================================
 * EXISTING FULL DATABASE
 * =========================================================
 */

function snapshotFile() {
  return objectFile(
    SNAPSHOT_OBJECT
  );
}

async function getSnapshotGeneration() {
  const file =
    snapshotFile();

  const [metadata] =
    await file.getMetadata();

  return String(
    metadata.generation ||
      metadata.updated ||
      ""
  );
}

async function readSnapshot() {
  const file =
    snapshotFile();

  const generation =
    await getSnapshotGeneration();

  const startedAt =
    Date.now();

  console.log(
    `[RPA Tracker GCS] START database | object=${SNAPSHOT_OBJECT} | ${new Date().toISOString()}`
  );

  let timeoutHandle:
    ReturnType<typeof setTimeout>
    | null = null;

  try {
    const timeoutPromise =
      new Promise<never>(
        (_, reject) => {
          timeoutHandle =
            setTimeout(() => {
              reject(
                new Error(
                  "RPA Tracker snapshot download timed out."
                )
              );
            }, DOWNLOAD_TIMEOUT_MS);
        }
      );

    const downloadPromise =
      file.download();

    const [buffer] =
      await Promise.race([
        downloadPromise,
        timeoutPromise,
      ]);

    const elapsedMs =
      Date.now() -
      startedAt;

    console.log(
      `[RPA Tracker GCS] COMPLETE database | object=${SNAPSHOT_OBJECT} | bytes=${buffer.length} | MB=${(
        buffer.length /
        1024 /
        1024
      ).toFixed(2)} | ${elapsedMs}ms`
    );

    const raw =
      buffer.toString(
        "utf8"
      );

    const parsed =
      JSON.parse(
        raw
      );

    if (
      !parsed ||
      !Array.isArray(
        parsed.cards
      ) ||
      !Array.isArray(
        parsed.groups
      ) ||
      !parsed.cardsById ||
      !parsed.groupsBySlug ||
      !parsed.meta
    ) {
      throw new Error(
        "RPA Tracker snapshot has an invalid structure."
      );
    }

    return {
      data:
        parsed,

      generation,
    };
  } finally {
    if (
      timeoutHandle
    ) {
      clearTimeout(
        timeoutHandle
      );
    }
  }
}

export async function refreshRPATrackerData() {
  const result =
    await readSnapshot();

  cachedData =
    result.data;

  cachedGeneration =
    result.generation;

  lastMetadataCheckAt =
    Date.now();

  return cachedData;
}

export async function getCachedRPATrackerData() {
  const now =
    Date.now();

  /*
   * No cache on this server instance yet.
   */
  if (!cachedData) {
    if (
      pendingRequest
    ) {
      return pendingRequest;
    }

    pendingRequest =
      refreshRPATrackerData()
        .finally(() => {
          pendingRequest =
            null;
        });

    return pendingRequest;
  }

  /*
   * Avoid a metadata request on every API hit.
   */
  if (
    now -
      lastMetadataCheckAt <
    METADATA_CHECK_TIME
  ) {
    return cachedData;
  }

  if (
    pendingRequest
  ) {
    return pendingRequest;
  }

  pendingRequest =
    (async () => {
      try {
        const generation =
          await getSnapshotGeneration();

        lastMetadataCheckAt =
          Date.now();

        /*
         * Same GCS object generation = same snapshot.
         * Keep the large snapshot in memory.
         */
        if (
          generation &&
          cachedGeneration &&
          generation ===
            cachedGeneration
        ) {
          return cachedData;
        }

        /*
         * Snapshot changed. Download the new version.
         */
        return await refreshRPATrackerData();
      } catch (error) {
        console.error(
          "RPA Tracker private snapshot version check failed:",
          error
        );

        /*
         * Preserve availability if GCS has a temporary issue.
         */
        return cachedData;
      }
    })()
      .finally(() => {
        pendingRequest =
          null;
      });

  return pendingRequest;
}

/*
 * =========================================================
 * NEW LIGHTWEIGHT INDEX
 * =========================================================
 */

function validateIndex(
  data: any
) {
  if (
    !data ||
    !Array.isArray(
      data.groups
    ) ||
    !Array.isArray(
      data.recentCards
    ) ||
    !data.meta
  ) {
    throw new Error(
      "RPA Tracker index snapshot has an invalid structure."
    );
  }

  return data;
}

async function loadIndex() {
  const data =
    await readJsonObject(
      INDEX_OBJECT,
      "index"
    );

  return validateIndex(
    data
  );
}

export async function getRPATrackerIndex() {
  const now =
    Date.now();

  if (
    cachedIndex &&
    now -
      cachedIndexAt <
      LIGHTWEIGHT_CACHE_TIME
  ) {
    return cachedIndex;
  }

  if (
    pendingIndexRequest
  ) {
    return pendingIndexRequest;
  }

  pendingIndexRequest =
    loadIndex()
      .then(
        (data) => {
          cachedIndex =
            data;

          cachedIndexAt =
            Date.now();

          return data;
        }
      )
      .finally(() => {
        pendingIndexRequest =
          null;
      });

  return pendingIndexRequest;
}

/*
 * =========================================================
 * NEW GROUP DETAIL LOADER
 * =========================================================
 */

function validateGroupSnapshot(
  data: any,
  expectedSlug: string
) {
  if (
    !data ||
    !data.group ||
    !Array.isArray(
      data.cards
    ) ||
    !data.meta
  ) {
    throw new Error(
      "RPA Tracker group snapshot has an invalid structure."
    );
  }

  const actualSlug =
    normalizeSlug(
      data.group?.Slug ||
        data.meta?.slug
    );

  if (
    actualSlug !==
    expectedSlug
  ) {
    throw new Error(
      `RPA Tracker group snapshot slug mismatch. Expected "${expectedSlug}", received "${actualSlug}".`
    );
  }

  return data;
}

async function loadGroupSnapshot(
  slug: string
) {
  const objectPath =
    `${GROUP_PREFIX}/${slug}.json`;

  const data =
    await readJsonObject(
      objectPath,
      `group-${slug}`
    );

  return validateGroupSnapshot(
    data,
    slug
  );
}

export async function getRPATrackerGroup(
  slugValue: any
) {
  const slug =
    normalizeSlug(
      slugValue
    );

  if (!slug) {
    return null;
  }

  const now =
    Date.now();

  const cached =
    groupCache.get(
      slug
    );

  if (
    cached &&
    now -
      cached.loadedAt <
      LIGHTWEIGHT_CACHE_TIME
  ) {
    return cached.data;
  }

  const pending =
    pendingGroupRequests.get(
      slug
    );

  if (
    pending
  ) {
    return pending;
  }

  const request =
    loadGroupSnapshot(
      slug
    )
      .then(
        (data) => {
          groupCache.set(
            slug,
            {
              data,
              loadedAt:
                Date.now(),
            }
          );

          return data;
        }
      )
      .finally(() => {
        pendingGroupRequests.delete(
          slug
        );
      });

  pendingGroupRequests.set(
    slug,
    request
  );

  return request;
}

/*
 * =========================================================
 * NEW CARD DETAIL LOADER
 * =========================================================
 */

function validateCardDetailSnapshot(
  data: any,
  expectedPrefix: string
) {
  if (
    !data ||
    !Array.isArray(
      data.cards
    ) ||
    !data.meta
  ) {
    throw new Error(
      "RPA Tracker card-detail snapshot has an invalid structure."
    );
  }

  const actualPrefix =
    cleanString(
      data.meta?.prefix
    ).toUpperCase();

  if (
    actualPrefix &&
    actualPrefix !==
      expectedPrefix
  ) {
    throw new Error(
      `RPA Tracker card-detail prefix mismatch. Expected "${expectedPrefix}", received "${actualPrefix}".`
    );
  }

  return data;
}

async function loadCardDetailSnapshot(
  prefix: string
) {
  const objectPath =
    `${CARD_DETAIL_PREFIX}/${prefix}.json`;

  const data =
    await readJsonObject(
      objectPath,
      `card-detail-${prefix}`
    );

  return validateCardDetailSnapshot(
    data,
    prefix
  );
}

export async function getRPATrackerCardById(
  cardIdValue: any
) {
  const cardId =
    normalizeCardId(
      cardIdValue
    );

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

  let shard =
    cardDetailCache.get(
      prefix
    );

  if (
    !shard ||
    now -
      shard.loadedAt >=
      LIGHTWEIGHT_CACHE_TIME
  ) {
    let pending =
      pendingCardDetailRequests.get(
        prefix
      );

    if (
      !pending
    ) {
      pending =
        loadCardDetailSnapshot(
          prefix
        )
          .then(
            (data) => {
              cardDetailCache.set(
                prefix,
                {
                  data,
                  loadedAt:
                    Date.now(),
                }
              );

              return data;
            }
          )
          .finally(() => {
            pendingCardDetailRequests.delete(
              prefix
            );
          });

      pendingCardDetailRequests.set(
        prefix,
        pending
      );
    }

    const data =
      await pending;

    shard = {
      data,
      loadedAt:
        Date.now(),
    };
  }

  return (
    shard.data.cards.find(
      (card: any) =>
        normalizeCardId(
          card.Card_id
        ) ===
        cardId
    ) ||
    null
  );
}