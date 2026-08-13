import { unstable_cache } from "next/cache";

let lastGoodData: any = null;
let pendingRefresh: Promise<any> | null = null;

const API_URL =
  process.env.CARDS_ALERT_API_URL || "";

const FETCH_TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 3;
const REVALIDATE_SECONDS = 300;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function retryDelay(attempt: number) {
  return attempt === 1 ? 500 : 1500;
}

function isRealCard(card: any) {
  const first = String(card?.First || "").trim();
  const last = String(card?.Last || "").trim();
  const brand = String(card?.Brand || "").trim();
  const cert = String(card?.Cert_Number || "").trim();
  const front = String(card?.front_image || "").trim();
  const back = String(card?.back_image || "").trim();

  const hasName =
    first !== "" ||
    last !== "";

  return (
    hasName &&
    brand !== "" &&
    (
      cert !== "" ||
      front.startsWith("http") ||
      back.startsWith("http")
    )
  );
}

function cleanData(data: any) {
  const source =
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
      ? data
      : {};

  return {
    ...source,
    cards: Array.isArray(source.cards)
      ? source.cards.filter(isRealCard)
      : [],
  };
}

function validateCardsAlertPayload(rawData: any) {
  if (
    !rawData ||
    typeof rawData !== "object" ||
    Array.isArray(rawData)
  ) {
    throw new Error(
      "Cards Alert API returned an invalid response."
    );
  }

  if (!Array.isArray(rawData.cards)) {
    throw new Error(
      "Cards Alert API response did not include a cards array."
    );
  }

  const cleaned = cleanData(rawData);

  if (
    cleaned.cards.length === 0 &&
    lastGoodData?.cards?.length
  ) {
    throw new Error(
      "Cards Alert API returned an empty card database."
    );
  }

  return cleaned;
}

async function fetchCardsAlertOnce() {
  if (!API_URL) {
    throw new Error(
      "Missing CARDS_ALERT_API_URL environment variable."
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      API_URL,
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
        `Cards Alert API failed: ${response.status}.`
      );
    }

    let rawData: any;

    try {
      rawData = JSON.parse(text);
    } catch {
      throw new Error(
        `Cards Alert API returned non-JSON. First response text: ${text.slice(
          0,
          200
        )}`
      );
    }

    return validateCardsAlertPayload(rawData);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCardsAlertWithRetry() {
  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const data = await fetchCardsAlertOnce();

      lastGoodData = data;

      return data;
    } catch (error) {
      lastError = error;

      console.error(
        `Cards Alert refresh attempt ${attempt} failed:`,
        error
      );

      if (attempt < MAX_ATTEMPTS) {
        await wait(retryDelay(attempt));
      }
    }
  }

  if (lastGoodData) {
    console.warn(
      "Cards Alert refresh failed; serving last known-good in-memory data."
    );

    return lastGoodData;
  }

  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          "Unable to refresh Cards Alert data."
        )
  );
}

const getSharedCardsAlertData =
  unstable_cache(
    async () => {
      return fetchCardsAlertWithRetry();
    },
    [
      "cards-alert-public-database-v3",
    ],
    {
      revalidate: REVALIDATE_SECONDS,
      tags: [
        "cards-alert-public-database",
      ],
    }
  );

export async function refreshCardsAlertData() {
  if (pendingRefresh) {
    return pendingRefresh;
  }

  pendingRefresh =
    fetchCardsAlertWithRetry()
      .finally(() => {
        pendingRefresh = null;
      });

  return pendingRefresh;
}

export async function getCachedCardsAlertData() {
  if (lastGoodData) {
    return lastGoodData;
  }

  try {
    const data =
      await getSharedCardsAlertData();

    lastGoodData = data;

    return data;
  } catch (error) {
    console.error(
      "Shared Cards Alert cache load failed:",
      error
    );

    if (lastGoodData) {
      return lastGoodData;
    }

    throw error;
  }
}