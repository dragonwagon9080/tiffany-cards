import "server-only";

import {
  storage,
  cardsAlertPrivateBucket,
} from "@/lib/tnce/storage";

let cachedData: any = null;
let cachedGeneration: string | null = null;
let lastMetadataCheckAt = 0;
let pendingRequest: Promise<any> | null = null;

/*
 * We only check the small GCS object metadata every 15 seconds.
 * The full ~14.5 MB snapshot is downloaded only when the object
 * generation changes (or when this server instance has no cache).
 */
const METADATA_CHECK_TIME =
  15_000;

const SNAPSHOT_OBJECT =
  "rpa-tracker-data/database.json";

const DOWNLOAD_TIMEOUT_MS =
  20_000;

function snapshotFile() {
  return storage
    .bucket(
      cardsAlertPrivateBucket
    )
    .file(
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

    const raw =
      buffer.toString("utf8");

    const parsed =
      JSON.parse(raw);

    if (
      !parsed ||
      !Array.isArray(parsed.cards) ||
      !Array.isArray(parsed.groups) ||
      !parsed.cardsById ||
      !parsed.groupsBySlug ||
      !parsed.meta
    ) {
      throw new Error(
        "RPA Tracker snapshot has an invalid structure."
      );
    }

    return {
      data: parsed,
      generation,
    };
  } finally {
    if (timeoutHandle) {
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
    if (pendingRequest) {
      return pendingRequest;
    }

    pendingRequest =
      refreshRPATrackerData()
        .finally(() => {
          pendingRequest = null;
        });

    return pendingRequest;
  }

  /*
   * Avoid a metadata request on every API hit.
   */
  if (
    now - lastMetadataCheckAt <
      METADATA_CHECK_TIME
  ) {
    return cachedData;
  }

  if (pendingRequest) {
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
        pendingRequest = null;
      });

  return pendingRequest;
}
