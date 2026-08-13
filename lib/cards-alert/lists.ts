import { unstable_cache } from "next/cache";

export type CardsAlertLists = {
  sports: string[];
  reasons: string[];
};

const API_URL =
  process.env.CARDS_ALERT_API_URL || "";

const FETCH_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;
const REVALIDATE_SECONDS =
  60 * 60 * 6;

let lastGoodLists:
  | CardsAlertLists
  | null = null;

function wait(milliseconds: number) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function uniqueValues(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .map((item) =>
      String(item || "").trim()
    )
    .filter(Boolean)
    .filter((item) => {
      const key =
        item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function validateLists(result: any): CardsAlertLists {
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    throw new Error(
      "Cards Alert lists returned an invalid response."
    );
  }

  if (result?.success === false) {
    throw new Error(
      String(
        result?.error ||
          "Cards Alert lists request failed."
      )
    );
  }

  const lists = {
    sports:
      uniqueValues(
        result?.sports
      ),
    reasons:
      uniqueValues(
        result?.reasons
      ),
  };

  if (
    lastGoodLists &&
    lists.sports.length === 0 &&
    lists.reasons.length === 0
  ) {
    throw new Error(
      "Cards Alert lists returned empty data."
    );
  }

  return lists;
}

async function fetchListsOnce() {
  if (!API_URL) {
    throw new Error(
      "Missing CARDS_ALERT_API_URL environment variable."
    );
  }

  const url = new URL(API_URL);

  url.searchParams.set(
    "action",
    "lists"
  );

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept:
            "application/json,text/plain;q=0.9,*/*;q=0.8",
        },
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal,
      }
    );

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Cards Alert lists fetch failed: ${response.status}.`
      );
    }

    let result: any;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        `Cards Alert lists returned non-JSON. First response text: ${text.slice(
          0,
          200
        )}`
      );
    }

    return validateLists(result);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchListsWithRetry() {
  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const lists =
        await fetchListsOnce();

      lastGoodLists = lists;

      return lists;
    } catch (error) {
      lastError = error;

      console.error(
        `Cards Alert lists attempt ${attempt} failed:`,
        error
      );

      if (
        attempt <
        MAX_ATTEMPTS
      ) {
        await wait(600);
      }
    }
  }

  if (lastGoodLists) {
    console.warn(
      "Cards Alert lists refresh failed; serving last known-good lists."
    );

    return lastGoodLists;
  }

  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          "Unable to load Cards Alert lists."
        )
  );
}

const getSharedCardsAlertLists =
  unstable_cache(
    async () => {
      return fetchListsWithRetry();
    },
    [
      "cards-alert-lists-v2",
    ],
    {
      revalidate:
        REVALIDATE_SECONDS,
      tags: [
        "cards-alert-lists",
      ],
    }
  );

export async function getCardsAlertLists(): Promise<CardsAlertLists> {
  if (lastGoodLists) {
    return lastGoodLists;
  }

  try {
    const lists =
      await getSharedCardsAlertLists();

    lastGoodLists = lists;

    return lists;
  } catch (error) {
    console.error(
      "Cards Alert lists load failed:",
      error
    );

    return (
      lastGoodLists || {
        sports: [],
        reasons: [],
      }
    );
  }
}