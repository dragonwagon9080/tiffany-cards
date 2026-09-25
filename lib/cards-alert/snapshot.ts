import "server-only";

import {
  storage,
  cardsAlertPrivateBucket,
} from "@/lib/tnce/storage";

const CARDS_ALERT_API_URL =
  process.env.CARDS_ALERT_API_URL || "";

const SNAPSHOT_PREFIX =
  "cardsalert-data";

const CARD_DETAIL_PREFIX =
  `${SNAPSHOT_PREFIX}/card-details`;

const CHUNK_SIZE = 500;
const RECENT_LIMIT = 100;

const FETCH_TIMEOUT_MS =
  45 * 1000;

const MAX_ATTEMPTS = 6;


function wait(milliseconds: number) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(resolve, milliseconds);
    }
  );
}


function retryDelay(attempt: number) {
  const delays = [
    2000,
    5000,
    10000,
    15000,
    20000,
  ];

  return delays[
    Math.min(
      attempt - 1,
      delays.length - 1
    )
  ];
}


function uniqueSorted(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map((value) =>
          String(value ?? "").trim()
        )
        .filter(Boolean)
    )
  ).sort((a, b) =>
    a.localeCompare(b)
  );
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


function buildOptions(cards: any[]) {
  const players =
    uniqueSorted(
      cards.map(
        (card) =>
          `${card?.First || ""} ${card?.Last || ""}`.trim()
      )
    );

  const years =
    uniqueSorted(
      cards.map(
        (card) =>
          card?.Year || ""
      )
    ).sort(
      (a, b) =>
        Number(b) -
        Number(a)
    );

  const sports =
    uniqueSorted(
      cards.map(
        (card) =>
          card?.Sport || ""
      )
    );

  const sets =
    uniqueSorted(
      cards.map(
        (card) =>
          card?.Set ||
          card?.Brand ||
          ""
      )
    );

  const statuses =
    uniqueSorted(
      cards.map(
        (card) =>
          card?.Status || ""
      )
    );

  const cardNumbers =
    uniqueSorted(
      cards.map(
        (card) =>
          card?.Num || ""
      )
    );

  return {
    players,
    years,
    sports,
    sets,
    statuses,
    cardNumbers,
  };
}


async function fetchJsonOnce(
  url: string
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      FETCH_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        url,
        {
          method: "GET",
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
        `Cards Alert source request failed: ${response.status}`
      );
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `Cards Alert source returned non-JSON. First response text: ${text.slice(
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
      return await fetchJsonOnce(url);
    } catch (error) {
      lastError = error;

      console.error(
        `Cards Alert snapshot ${label} attempt ${attempt} failed:`,
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
          `Cards Alert snapshot ${label} failed.`
        )
  );
}


async function fetchSnapshotChunk(
  offset: number
) {
  const url =
    new URL(
      CARDS_ALERT_API_URL
    );

  url.searchParams.set(
    "mode",
    "snapshot"
  );

  url.searchParams.set(
    "limit",
    String(CHUNK_SIZE)
  );

  url.searchParams.set(
    "offset",
    String(offset)
  );

  const result =
    await fetchJsonWithRetry(
      url.toString(),
      `chunk offset ${offset}`
    );

  if (
    result?.success === false
  ) {
    throw new Error(
      String(
        result?.error ||
          `Snapshot chunk ${offset} failed.`
      )
    );
  }

  if (
    !Array.isArray(
      result?.cards
    )
  ) {
    throw new Error(
      `Snapshot chunk ${offset} did not include a cards array.`
    );
  }

  const meta =
    result?.meta || {};

  const rowsRead =
    Number(
      meta.rowsRead || 0
    );

  const nextOffset =
    Number(
      meta.nextOffset
    );

  const totalRows =
    Number(
      meta.totalRows || 0
    );

  const hasMore =
    Boolean(
      meta.hasMore
    );

  if (
    rowsRead < 0 ||
    !Number.isFinite(
      nextOffset
    ) ||
    nextOffset < offset
  ) {
    throw new Error(
      `Snapshot chunk ${offset} returned invalid pagination metadata.`
    );
  }

  return {
    cards:
      result.cards,

    rowsRead,

    nextOffset,

    totalRows,

    hasMore,
  };
}


async function fetchAllCards() {
  const collected: any[] = [];

  let offset = 0;
  let chunkNumber = 0;
  let expectedTotalRows = 0;

  while (true) {
    chunkNumber++;

    console.log(
      `Cards Alert snapshot: requesting chunk ${chunkNumber} at offset ${offset}.`
    );

    const chunk =
      await fetchSnapshotChunk(
        offset
      );

    if (chunkNumber === 1) {
      expectedTotalRows =
        chunk.totalRows;
    }

    for (
      const card
      of chunk.cards
    ) {
      if (isRealCard(card)) {
        collected.push(card);
      }
    }

    console.log(
      `Cards Alert snapshot: chunk ${chunkNumber} read ${chunk.rowsRead} sheet rows and returned ${chunk.cards.length} active cards.`
    );

    if (!chunk.hasMore) {
      break;
    }

    if (
      chunk.nextOffset <=
      offset
    ) {
      throw new Error(
        "Cards Alert snapshot pagination did not advance."
      );
    }

    offset =
      chunk.nextOffset;

    if (chunkNumber > 1000) {
      throw new Error(
        "Cards Alert snapshot exceeded the safety chunk limit."
      );
    }
  }

  /*
   * The normal Cards Alert API reverses the Cards sheet
   * so newest rows appear first. Snapshot chunks are read
   * top-to-bottom, so reverse once after collecting them.
   */
  collected.reverse();

  if (collected.length === 0) {
    throw new Error(
      "Cards Alert snapshot contained no active cards."
    );
  }

  console.log(
    `Cards Alert snapshot: collected ${collected.length} active cards from ${expectedTotalRows} sheet rows.`
  );

  return collected;
}


async function fetchSmallMetadata() {
  /*
   * Recent mode with limit=1 returns the small site metadata
   * without serializing the entire Cards database.
   */
  const url =
    new URL(
      CARDS_ALERT_API_URL
    );

  url.searchParams.set(
    "mode",
    "recent"
  );

  url.searchParams.set(
    "limit",
    "1"
  );

  return fetchJsonWithRetry(
    url.toString(),
    "metadata"
  );
}


async function fetchLists() {
  const url =
    new URL(
      CARDS_ALERT_API_URL
    );

  url.searchParams.set(
    "action",
    "lists"
  );

  const result =
    await fetchJsonWithRetry(
      url.toString(),
      "lists"
    );

  if (
    result?.success === false
  ) {
    throw new Error(
      String(
        result?.error ||
          "Cards Alert lists request failed."
      )
    );
  }

  return result;
}

function getCardId(
  card: any
) {
  return String(
    card?.Card_id || ""
  )
    .trim()
    .toUpperCase();
}


function getCardDetailPrefix(
  cardId: string
) {
  const normalized =
    String(cardId || "")
      .trim()
      .toUpperCase();

  if (normalized.length < 2) {
    return "";
  }

  return normalized.slice(
    0,
    2
  );
}


function buildCardDetailGroups(
  cards: any[]
) {
  const groups =
    new Map<string, any[]>();

  let missingCardId = 0;

  for (const card of cards) {
    const cardId =
      getCardId(card);

    const prefix =
      getCardDetailPrefix(
        cardId
      );

    if (!cardId || !prefix) {
      missingCardId++;
      continue;
    }

    const existing =
      groups.get(prefix);

    if (existing) {
      existing.push(card);
    } else {
      groups.set(
        prefix,
        [card]
      );
    }
  }

  return {
    groups,
    missingCardId,
  };
}


async function writeCardDetailGroups(
  cards: any[],
  generatedAt: string
) {
  const {
    groups,
    missingCardId,
  } =
    buildCardDetailGroups(
      cards
    );

  console.log(
    `Cards Alert snapshot: preparing ${groups.size} Card_id detail groups.`
  );

  if (missingCardId > 0) {
    console.warn(
      `Cards Alert snapshot: ${missingCardId} active cards were skipped from detail groups because Card_id was missing or invalid.`
    );
  }

  const results = [];

  for (
    const [prefix, groupCards]
    of groups.entries()
  ) {
    const result =
      await writeJsonObject(
        `${CARD_DETAIL_PREFIX}/${prefix}.json`,
        {
          cards: groupCards,

          meta: {
            generatedAt,
            prefix,
            count:
              groupCards.length,
          },
        },
        "private, max-age=300"
      );

    results.push({
      ...result,
      prefix,
      cardCount:
        groupCards.length,
    });
  }

  return {
    groupCount:
      groups.size,

    missingCardId,

    files:
      results,
  };
}

async function writeJsonObject(
  objectPath: string,
  value: unknown,
  cacheControl: string
) {
  const bucket =
    storage.bucket(
      cardsAlertPrivateBucket
    );

  const file =
    bucket.file(
      objectPath
    );

  const body =
    JSON.stringify(value);

  await file.save(
    body,
    {
      resumable: false,

      contentType:
        "application/json; charset=utf-8",

      metadata: {
        cacheControl,
      },
    }
  );

  return {
    bucket:
      cardsAlertPrivateBucket,

    objectPath,

    bytes:
      Buffer.byteLength(
        body,
        "utf8"
      ),
  };
}


export async function buildCardsAlertSnapshots() {
  if (!CARDS_ALERT_API_URL) {
    throw new Error(
      "Missing CARDS_ALERT_API_URL environment variable."
    );
  }

  console.log(
    "Cards Alert snapshot: starting chunked refresh."
  );

  const cards =
    await fetchAllCards();

  const [
    metadata,
    listsResult,
  ] =
    await Promise.all([
      fetchSmallMetadata(),
      fetchLists(),
    ]);

  const generatedAt =
    new Date().toISOString();

  const options = {
    ...buildOptions(cards),

    reasons:
      uniqueSorted(
        Array.isArray(
          listsResult?.reasons
        )
          ? listsResult.reasons
          : []
      ),

    generatedAt,
  };

  const recent = {
    cards:
      cards.slice(
        0,
        RECENT_LIMIT
      ),

    meta: {
      generatedAt,

      count:
        Math.min(
          RECENT_LIMIT,
          cards.length
        ),

      total:
        cards.length,
    },
  };

  const database = {
    cards,

    header:
      metadata?.header ||
      {},

    settings:
      metadata?.settings ||
      {},

    disclaimer:
      metadata?.disclaimer ||
      {},

    privacy:
      metadata?.privacy ||
      {},

    about:
      metadata?.about ||
      {},

    contact:
      metadata?.contact ||
      [],

    footer:
      metadata?.footer ||
      [],

    meta: {
      generatedAt,

      count:
        cards.length,
    },
  };

  console.log(
    "Cards Alert snapshot: writing private GCS files."
  );

    const files =
    await Promise.all([
      writeJsonObject(
        `${SNAPSHOT_PREFIX}/recent.json`,
        recent,
        "private, max-age=60"
      ),

      writeJsonObject(
        `${SNAPSHOT_PREFIX}/options.json`,
        options,
        "private, max-age=300"
      ),

      writeJsonObject(
        `${SNAPSHOT_PREFIX}/database.json`,
        database,
        "private, max-age=300"
      ),
    ]);

  const cardDetails =
    await writeCardDetailGroups(
      cards,
      generatedAt
    );

  console.log(
    "Cards Alert snapshot: completed successfully."
  );

    return {
    ok: true,

    generatedAt,

    cardCount:
      cards.length,

    files,

    cardDetails,
  };
}