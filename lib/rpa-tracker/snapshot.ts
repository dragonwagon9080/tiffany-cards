import "server-only";

import {
  storage,
  cardsAlertPrivateBucket,
} from "@/lib/tnce/storage";

const API_URL =
  process.env.RPA_TRACKER_API_URL!;

const SNAPSHOT_OBJECT =
  "rpa-tracker-data/database.json";

function cleanString(value: any) {
  return String(value || "").trim();
}

function slugify(value: string) {
  return cleanString(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/#/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOtherImages(value: any) {
  if (Array.isArray(value)) {
    return value
      .map(cleanString)
      .filter(Boolean);
  }

  return cleanString(value)
    .split(/\r?\n|,/)
    .map(cleanString)
    .filter(Boolean);
}

function getFirstName(row: any) {
  return cleanString(
    row.First || row.First_Name || ""
  );
}

function getLastName(row: any) {
  return cleanString(
    row.Last || row.Last_Name || ""
  );
}

function getPlayer(row: any) {
  return cleanString(
    row.Player ||
      `${getFirstName(row)} ${getLastName(row)}`.trim()
  );
}

function isRealDbCard(card: any) {
  return (
    cleanString(card.Card_Title) !== "" &&
    cleanString(card.Card_id) !== ""
  );
}

function cleanDbCard(card: any) {
  const slug =
    card.Slug ||
    slugify(card.Card_Title);

  return {
    ...card,
    Slug: slug,
    Other_Images:
      normalizeOtherImages(
        card.Other_Images
      ),
  };
}

function buildGroups(
  homepageRows: any[],
  dbCards: any[]
) {
  const countByTitle =
    new Map<string, number>();

  for (const card of dbCards) {
    const title =
      cleanString(card.Card_Title);

    if (!title) continue;

    countByTitle.set(
      title,
      (countByTitle.get(title) || 0) + 1
    );
  }

  return homepageRows
    .filter(
      (row) =>
        cleanString(row.Card_Title) !== ""
    )
    .map((row) => {
      const title =
        cleanString(row.Card_Title);

      return {
        Slug:
          row.Slug ||
          slugify(title),

        Card_Title: title,

        Card_Title_Display:
          row.Card_Title_Display ||
          title,

        First: getFirstName(row),
        Last: getLastName(row),
        Player: getPlayer(row),

        Year: row.Year || "",
        Brand: row.Brand || "",
        Set: row.Set || "",
        Variation:
          row.Variation || "",
        Sport: row.Sport || "",

        Material:
          row.Type ||
          row.Material ||
          "",

        Type:
          row.Type ||
          row.Material ||
          "",

        Description:
          row.Description || "",

        Main_Page_Image:
          row.Main_Page_Image || "",

        Count:
          countByTitle.get(title) || 0,

        HighestGrade: "",
        LastUpdated: "",
      };
    })
    .sort((a, b) => {
      const last =
        String(a.Last || "")
          .localeCompare(
            String(b.Last || "")
          );

      if (last !== 0) return last;

      const first =
        String(a.First || "")
          .localeCompare(
            String(b.First || "")
          );

      if (first !== 0) return first;

      const year =
        Number(a.Year || 0) -
        Number(b.Year || 0);

      if (year !== 0) return year;

      return String(
        a.Brand || ""
      ).localeCompare(
        String(b.Brand || "")
      );
    });
}

function buildIndexes(
  cards: any[],
  groups: any[]
) {
  const cardsById:
    Record<string, any> = {};

  const groupsBySlug:
    Record<string, any> = {};

  for (const card of cards) {
    const id =
      cleanString(card.Card_id);

    if (id) {
      cardsById[id] = card;
    }
  }

  for (const group of groups) {
    const slug =
      cleanString(group.Slug);

    if (slug) {
      groupsBySlug[slug] = group;
    }
  }

  return {
    cardsById,
    groupsBySlug,
  };
}

async function fetchAction(
  action: string
) {
  if (!API_URL) {
    throw new Error(
      "Missing RPA_TRACKER_API_URL environment variable."
    );
  }

  const separator =
    API_URL.includes("?")
      ? "&"
      : "?";

  const sourceSecret =
  process.env.RPA_TRACKER_SOURCE_SECRET;

const params =
  new URLSearchParams({
    action,
  });

if (action === "all") {
  if (!sourceSecret) {
    throw new Error(
      "Missing RPA_TRACKER_SOURCE_SECRET environment variable."
    );
  }

  params.set(
    "snapshotSecret",
    sourceSecret
  );
}

const res = await fetch(
  `${API_URL}${separator}${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `RPA Tracker API action "${action}" failed: ${res.status}`
    );
  }

  return res.json();
}

export async function buildRPATrackerSnapshot() {
  console.log(
    "RPA Tracker snapshot: starting."
  );

  const [
    homepageRaw,
    dbRaw,
  ] = await Promise.all([
    fetchAction("homepage"),
    fetchAction("all"),
  ]);

  const homepageRows =
    Array.isArray(homepageRaw)
      ? homepageRaw
      : homepageRaw?.cards ||
        homepageRaw?.groups ||
        [];

  if (
  dbRaw?.ok === false ||
  dbRaw?.error
) {
  throw new Error(
    "RPA Tracker source API rejected the database request."
  );
}

const rawDbCards =
  Array.isArray(dbRaw)
    ? dbRaw
    : Array.isArray(dbRaw?.cards)
      ? dbRaw.cards
      : null;

if (!rawDbCards) {
  throw new Error(
    "RPA Tracker source API returned an invalid database response."
  );
}

const cards =
  rawDbCards
    .filter(isRealDbCard)
    .map(cleanDbCard);

if (cards.length === 0) {
  throw new Error(
    "RPA Tracker snapshot contains zero valid cards. Existing snapshot will not be overwritten."
  );
}

  const groups =
    buildGroups(
      homepageRows,
      cards
    );

  const indexes =
    buildIndexes(
      cards,
      groups
    );

  const data = {
    cards,
    groups,

    cardsById:
      indexes.cardsById,

    groupsBySlug:
      indexes.groupsBySlug,

    meta: {
      cardCount:
        cards.length,

      groupCount:
        groups.length,

      refreshedAt:
        new Date().toISOString(),
    },
  };

  const body =
    JSON.stringify(data);

  const bucket =
    storage.bucket(
      cardsAlertPrivateBucket
    );

  const file =
    bucket.file(
      SNAPSHOT_OBJECT
    );

  await file.save(body, {
    resumable: false,

    contentType:
      "application/json",

    metadata: {
      cacheControl:
        "private, max-age=300",
    },
  });

  const bytes =
    Buffer.byteLength(
      body,
      "utf8"
    );

  console.log(
    "RPA Tracker snapshot: complete.",
    {
      bucket:
        cardsAlertPrivateBucket,

      object:
        SNAPSHOT_OBJECT,

      cards:
        cards.length,

      groups:
        groups.length,

      bytes,
    }
  );

  return {
    ok: true,

    bucket:
      cardsAlertPrivateBucket,

    object:
      SNAPSHOT_OBJECT,

    cardCount:
      cards.length,

    groupCount:
      groups.length,

    bytes,

    refreshedAt:
      data.meta.refreshedAt,
  };
}