import "server-only";

import {
  storage,
  cardsAlertPrivateBucket,
} from "@/lib/tnce/storage";

let cachedData: any = null;
let cachedAt = 0;
let pendingRequest: Promise<any> | null = null;

const CACHE_TIME = 1000 * 60 * 60;

const SNAPSHOT_OBJECT =
  "rpa-tracker-data/database.json";

const DOWNLOAD_TIMEOUT_MS =
  20_000;

async function readSnapshot() {
  const bucket =
    storage.bucket(
      cardsAlertPrivateBucket
    );

  const file =
    bucket.file(
      SNAPSHOT_OBJECT
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

    return parsed;
  } finally {
    if (timeoutHandle) {
      clearTimeout(
        timeoutHandle
      );
    }
  }
}

export async function refreshRPATrackerData() {
  const data =
    await readSnapshot();

  cachedData = data;
  cachedAt = Date.now();

  return data;
}

export async function getCachedRPATrackerData() {
  const now =
    Date.now();

  if (
    cachedData &&
    now - cachedAt <
      CACHE_TIME
  ) {
    return cachedData;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest =
    refreshRPATrackerData()
      .catch((error) => {
        console.error(
          "RPA Tracker private snapshot load failed:",
          error
        );

        if (cachedData) {
          return cachedData;
        }

        throw error;
      })
      .finally(() => {
        pendingRequest = null;
      });

  return pendingRequest;
}