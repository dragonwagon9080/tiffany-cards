import "server-only";

import {
  storage,
  cardsAlertPrivateBucket,
} from "@/lib/tnce/storage";

import {
  getRpaRecentActivity,
} from "@/lib/rpa-tracker/recent-activity";

const API_URL =
  process.env.RPA_TRACKER_API_URL!;

/*
 * Existing production snapshot.
 *
 * IMPORTANT:
 * This remains unchanged for now so the
 * current live RPA Tracker continues to
 * operate exactly as it does today.
 */
const SNAPSHOT_OBJECT =
  "rpa-tracker-data/database.json";

/*
 * New lightweight registry/search index.
 */
const INDEX_OBJECT =
  "rpa-tracker-data/index.json";

/*
 * New detailed snapshot locations.
 */
const GROUP_PREFIX =
  "rpa-tracker-data/groups";

const CARD_DETAIL_PREFIX =
  "rpa-tracker-data/card-details";

const MAX_PUBLIC_RECENT_CARDS = 50;

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
    row.First ||
      row.First_Name ||
      ""
  );
}

function getLastName(row: any) {
  return cleanString(
    row.Last ||
      row.Last_Name ||
      ""
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
    cleanString(
      card.Card_Title
    ) !== "" &&
    cleanString(
      card.Card_id
    ) !== ""
  );
}

function cleanDbCard(card: any) {
  const slug =
    card.Slug ||
    slugify(
      card.Card_Title
    );

  return {
    ...card,

    Slug:
      slug,

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
    new Map<
      string,
      number
    >();

  for (
    const card of dbCards
  ) {
    const title =
      cleanString(
        card.Card_Title
      );

    if (!title) {
      continue;
    }

    countByTitle.set(
      title,
      (
        countByTitle.get(
          title
        ) || 0
      ) + 1
    );
  }

  return homepageRows
    .filter(
      (row) =>
        cleanString(
          row.Card_Title
        ) !== ""
    )
    .map((row) => {
      const title =
        cleanString(
          row.Card_Title
        );

      return {
        Slug:
          row.Slug ||
          slugify(
            title
          ),

        Card_Title:
          title,

        Card_Title_Display:
          row.Card_Title_Display ||
          title,

        First:
          getFirstName(
            row
          ),

        Last:
          getLastName(
            row
          ),

        Player:
          getPlayer(
            row
          ),

        Year:
          row.Year ||
          "",

        Brand:
          row.Brand ||
          "",

        Set:
          row.Set ||
          "",

        Variation:
          row.Variation ||
          "",

        Sport:
          row.Sport ||
          "",

        Material:
          row.Type ||
          row.Material ||
          "",

        Type:
          row.Type ||
          row.Material ||
          "",

        Description:
          row.Description ||
          "",

        Main_Page_Image:
          row.Main_Page_Image ||
          "",

        Count:
          countByTitle.get(
            title
          ) || 0,

        HighestGrade:
          "",

        LastUpdated:
          "",
      };
    })
    .sort(
      (a, b) => {
        const last =
          String(
            a.Last || ""
          ).localeCompare(
            String(
              b.Last || ""
            )
          );

        if (
          last !== 0
        ) {
          return last;
        }

        const first =
          String(
            a.First || ""
          ).localeCompare(
            String(
              b.First || ""
            )
          );

        if (
          first !== 0
        ) {
          return first;
        }

        const year =
          Number(
            a.Year || 0
          ) -
          Number(
            b.Year || 0
          );

        if (
          year !== 0
        ) {
          return year;
        }

        return String(
          a.Brand || ""
        ).localeCompare(
          String(
            b.Brand || ""
          )
        );
      }
    );
}

function buildIndexes(
  cards: any[],
  groups: any[]
) {
  const cardsById:
    Record<
      string,
      any
    > = {};

  const groupsBySlug:
    Record<
      string,
      any
    > = {};

  for (
    const card of cards
  ) {
    const id =
      cleanString(
        card.Card_id
      );

    if (id) {
      cardsById[id] =
        card;
    }
  }

  for (
    const group of groups
  ) {
    const slug =
      cleanString(
        group.Slug
      );

    if (slug) {
      groupsBySlug[
        slug
      ] = group;
    }
  }

  return {
    cardsById,
    groupsBySlug,
  };
}

/*
 * Converts the private TNCE activity list
 * into safe public display data.
 *
 * TNCE tells us WHICH cards were recently
 * published. The production RPA database
 * remains the source of truth for the
 * current image, title, serial, etc.
 */
function buildRecentCards(
  activity: any[],
  cardsById:
    Record<
      string,
      any
    >
) {
  return activity
    .map(
      (item) => {
        const cardId =
          cleanString(
            item?.cardId
          );

        if (!cardId) {
          return null;
        }

        const card =
          cardsById[
            cardId
          ];

        /*
         * If the activity points to a card
         * that no longer exists in production,
         * do not expose it in the slider.
         */
        if (!card) {
          return null;
        }

        const image =
          cleanString(
            card.Display_Image
          ) ||
          cleanString(
            card.Front_Image
          );

        /*
         * The slider is image-based, so cards
         * without an image are skipped.
         */
        if (!image) {
          return null;
        }

        const title =
          cleanString(
            card.Card_Title_Display
          ) ||
          cleanString(
            card.Card_Title
          );

        const activityType =
          cleanString(
            item?.activity
          ).toLowerCase() ===
          "updated"
            ? "updated"
            : "new";

        return {
          cardId,

          activity:
            activityType,

          publishedAt:
            cleanString(
              item?.publishedAt
            ),

          title,

          cardTitle:
            cleanString(
              card.Card_Title
            ),

          serialNumber:
            cleanString(
              card.Serial_Number
            ),

          variation:
            cleanString(
              card.Variation_Input ||
                card.Variation
            ),

          grade:
            cleanString(
              card.Grade
            ),

          player:
            cleanString(
              card.Player
            ),

          year:
            cleanString(
              card.Year
            ),

          sport:
            cleanString(
              card.Sport
            ),

          image,

          href:
            `/rpa-tracker/card/${encodeURIComponent(
              cardId
            )}`,
        };
      }
    )
    .filter(Boolean)
    .slice(
      0,
      MAX_PUBLIC_RECENT_CARDS
    );
}

/*
 * Build compact searchable text for one card.
 *
 * This intentionally includes Card_History.
 * That means historical certification numbers,
 * old grades, auction names, and other text
 * contained in the history remain searchable
 * without putting the complete card object into
 * the lightweight startup index.
 */
function extractHistoricalCertNumbers(
  value: any
) {
  const history =
    cleanString(
      value
    );

  if (!history) {
    return [];
  }

  const certs =
    new Set<string>();

  /*
   * Match numbers explicitly identified as
   * certification numbers.
   *
   * Examples:
   *
   * cert# 0011695136
   * cert # 0011695136
   * cert 0011695136
   * certification # 0011695136
   * certification number 0011695136
   */
  const patterns = [
    /\bcert(?:ification)?\s*(?:number|no\.?)?\s*#?\s*:?\s*(\d{6,12})\b/gi,
  ];

  for (
    const pattern of patterns
  ) {
    let match:
      RegExpExecArray | null;

    while (
      (
        match =
          pattern.exec(
            history
          )
      ) !== null
    ) {
      const cert =
        cleanString(
          match[1]
        );

      if (cert) {
        certs.add(
          cert
        );
      }
    }
  }

  return Array.from(
    certs
  );
}

function buildCardSearchText(
  card: any
) {
  /*
   * Preserve the normal searchable card fields.
   *
   * For Card_History, only certification numbers
   * explicitly identified as certs are added.
   *
   * This prevents unrelated numeric values such as
   * auction item IDs from entering the search index.
   */
  const historicalCertNumbers =
    extractHistoricalCertNumbers(
      card.Card_History
    );

  const values = [
    card.Card_id,
    card.Card_Title,
    card.Card_Title_Display,
    card.Serial_Number,
    card.Variation_Input,
    card.Variation,
    card.Grade,
    card.Cert_Number,
    card.Brand,
    card.Numerator,
    card.Denominator,
    card.First,
    card.Last,
    card.Player,
    card.Year,
    card.Set,
    card.Sport,
    card.Material,
    card.Card_Description,

    ...historicalCertNumbers,
  ];

  return Array.from(
    new Set(
      values
        .map(cleanString)
        .filter(Boolean)
    )
  ).join(" ");
}

/*
 * Build searchable text by registry/group.
 *
 * The homepage searches registries rather than
 * needing every full individual card object.
 *
 * Each group's Search_Text contains searchable
 * values from every card in that registry,
 * including historical Card_History text.
 */
function buildGroupSearchTextMap(
  cards: any[]
) {
  const map =
    new Map<
      string,
      string[]
    >();

  for (
    const card of cards
  ) {
    const slug =
      cleanString(
        card.Slug
      );

    if (!slug) {
      continue;
    }

    const searchText =
      buildCardSearchText(
        card
      );

    if (!searchText) {
      continue;
    }

    if (
      !map.has(
        slug
      )
    ) {
      map.set(
        slug,
        []
      );
    }

    map.get(
      slug
    )!.push(
      searchText
    );
  }

  const result:
    Record<
      string,
      string
    > = {};

  for (
    const [
      slug,
      values,
    ] of map.entries()
  ) {
    result[
      slug
    ] =
      values.join(" ");
  }

  return result;
}

/*
 * Lightweight group/index representation.
 *
 * Main_Page_Image stays because the registry
 * homepage needs its group image.
 *
 * Individual card image URLs, histories and
 * other large detailed fields are not stored
 * as separate card objects in index.json.
 */
function buildLightweightGroups(
  groups: any[],
  cards: any[]
) {
  const searchBySlug =
    buildGroupSearchTextMap(
      cards
    );

  return groups.map(
    (group) => {
      const slug =
        cleanString(
          group.Slug
        );

      const groupSearchText = [
        group.Slug,
        group.Card_Title,
        group.Card_Title_Display,
        group.Player,
        group.First,
        group.Last,
        group.Year,
        group.Brand,
        group.Set,
        group.Variation,
        group.Material,
        group.Type,
        group.Sport,
        group.Description,
        searchBySlug[
          slug
        ] || "",
      ]
        .map(cleanString)
        .filter(Boolean)
        .join(" ");

      return {
        Slug:
          group.Slug ||
          "",

        Card_Title:
          group.Card_Title ||
          "",

        Card_Title_Display:
          group.Card_Title_Display ||
          "",

        Player:
          group.Player ||
          "",

        First:
          group.First ||
          "",

        Last:
          group.Last ||
          "",

        Year:
          group.Year ||
          "",

        Brand:
          group.Brand ||
          "",

        Set:
          group.Set ||
          "",

        Variation:
          group.Variation ||
          "",

        Material:
          group.Material ||
          "",

        Type:
          group.Type ||
          "",

        Sport:
          group.Sport ||
          "",

        Description:
          group.Description ||
          "",

        Main_Page_Image:
          group.Main_Page_Image ||
          "",

        Count:
          group.Count ||
          0,

        HighestGrade:
          group.HighestGrade ||
          "",

        LastUpdated:
          group.LastUpdated ||
          "",

        Search_Text:
          groupSearchText,
      };
    }
  );
}

/*
 * Group complete cards by registry slug.
 */
function buildGroupDetailMap(
  cards: any[]
) {
  const map =
    new Map<
      string,
      any[]
    >();

  for (
    const card of cards
  ) {
    const slug =
      cleanString(
        card.Slug
      );

    if (!slug) {
      continue;
    }

    if (
      !map.has(
        slug
      )
    ) {
      map.set(
        slug,
        []
      );
    }

    map.get(
      slug
    )!.push(
      card
    );
  }

  return map;
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

/*
 * Build two-character Card_id shards.
 *
 * Example:
 * CA61B054B3 -> CA.json
 * KG0F3AC9E2 -> KG.json
 */
function buildCardDetailGroups(
  cards: any[]
) {
  const groups =
    new Map<
      string,
      any[]
    >();

  for (
    const card of cards
  ) {
    const prefix =
      getCardDetailPrefix(
        card.Card_id
      );

    if (!prefix) {
      continue;
    }

    if (
      !groups.has(
        prefix
      )
    ) {
      groups.set(
        prefix,
        []
      );
    }

    groups.get(
      prefix
    )!.push(
      card
    );
  }

  return groups;
}

function buildExactLookup(
  cards: any[]
) {
  const cardIds:
    Record<
      string,
      string
    > = {};

  const certNumbers:
    Record<
      string,
      string[]
    > = {};

  function addCert(
    certValue: any,
    slugValue: any
  ) {
    const cert =
      cleanString(
        certValue
      );

    const slug =
      cleanString(
        slugValue
      );

    if (
      !cert ||
      !slug
    ) {
      return;
    }

    if (
      !certNumbers[
        cert
      ]
    ) {
      certNumbers[
        cert
      ] = [];
    }

    if (
      !certNumbers[
        cert
      ].includes(
        slug
      )
    ) {
      certNumbers[
        cert
      ].push(
        slug
      );
    }
  }

  for (
    const card of cards
  ) {
    const cardId =
      normalizeCardId(
        card.Card_id
      );

    const prefix =
      getCardDetailPrefix(
        cardId
      );

    const slug =
      cleanString(
        card.Slug
      );

    /*
     * Card_id -> two-character detail shard.
     */
    if (
      cardId &&
      prefix
    ) {
      cardIds[
        cardId
      ] = prefix;
    }

    /*
     * Current certification number.
     */
    addCert(
      card.Cert_Number,
      slug
    );

    /*
     * Historical certification numbers.
     *
     * Only numbers explicitly associated with
     * cert/certification wording are included.
     */
    const historicalCerts =
      extractHistoricalCertNumbers(
        card.Card_History
      );

    for (
      const cert
      of historicalCerts
    ) {
      addCert(
        cert,
        slug
      );
    }
  }

  return {
    cardIds,
    certNumbers,
  };
}

async function writeJsonObject(
  objectPath: string,
  data: any
) {
  const body =
    JSON.stringify(
      data
    );

  const bucket =
    storage.bucket(
      cardsAlertPrivateBucket
    );

  const file =
    bucket.file(
      objectPath
    );

  await file.save(
    body,
    {
      resumable:
        false,

      contentType:
        "application/json",

      metadata: {
        cacheControl:
          "private, max-age=300",
      },
    }
  );

  return Buffer.byteLength(
    body,
    "utf8"
  );
}

async function writeGroupDetails(
  groups: any[],
  cards: any[],
  refreshedAt: string
) {
  const cardsBySlug =
    buildGroupDetailMap(
      cards
    );

  let totalBytes = 0;
  let written = 0;

  /*
   * Sequential writes are intentional.
   * This avoids firing hundreds of GCS writes
   * simultaneously during a snapshot rebuild.
   */
  for (
    const group of groups
  ) {
    const slug =
      cleanString(
        group.Slug
      );

    if (!slug) {
      continue;
    }

    const groupCards =
      cardsBySlug.get(
        slug
      ) || [];

    const objectPath =
      `${GROUP_PREFIX}/${slug}.json`;

    const bytes =
      await writeJsonObject(
        objectPath,
        {
          group,
          cards:
            groupCards,

          meta: {
            refreshedAt,
            slug,
            count:
              groupCards.length,
          },
        }
      );

    totalBytes +=
      bytes;

    written++;
  }

  return {
    count:
      written,

    bytes:
      totalBytes,
  };
}

async function writeCardDetailGroups(
  cards: any[],
  refreshedAt: string
) {
  const groups =
    buildCardDetailGroups(
      cards
    );

  let totalBytes = 0;
  let written = 0;

  /*
   * Sequential writes are intentional.
   */
  for (
    const [
      prefix,
      groupCards,
    ] of groups.entries()
  ) {
    const objectPath =
      `${CARD_DETAIL_PREFIX}/${prefix}.json`;

    const bytes =
      await writeJsonObject(
        objectPath,
        {
          cards:
            groupCards,

          meta: {
            refreshedAt,
            prefix,
            count:
              groupCards.length,
          },
        }
      );

    totalBytes +=
      bytes;

    written++;
  }

  return {
    count:
      written,

    bytes:
      totalBytes,
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
    process.env
      .RPA_TRACKER_SOURCE_SECRET;

  const params =
    new URLSearchParams({
      action,
    });

  if (
    action === "all"
  ) {
    if (
      !sourceSecret
    ) {
      throw new Error(
        "Missing RPA_TRACKER_SOURCE_SECRET environment variable."
      );
    }

    params.set(
      "snapshotSecret",
      sourceSecret
    );
  }

  const res =
    await fetch(
      `${API_URL}${separator}${params.toString()}`,
      {
        cache:
          "no-store",
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

  /*
   * Recent activity can be loaded in parallel
   * with the two production data sources.
   */
  const [
    homepageRaw,
    dbRaw,
    recentActivity,
  ] =
    await Promise.all([
      fetchAction(
        "homepage"
      ),

      fetchAction(
        "all"
      ),

      getRpaRecentActivity(),
    ]);

  const homepageRows =
    Array.isArray(
      homepageRaw
    )
      ? homepageRaw
      : homepageRaw
          ?.cards ||
        homepageRaw
          ?.groups ||
        [];

  if (
    dbRaw?.ok ===
      false ||
    dbRaw?.error
  ) {
    throw new Error(
      "RPA Tracker source API rejected the database request."
    );
  }

  const rawDbCards =
    Array.isArray(
      dbRaw
    )
      ? dbRaw
      : Array.isArray(
            dbRaw
              ?.cards
          )
        ? dbRaw.cards
        : null;

  if (!rawDbCards) {
    throw new Error(
      "RPA Tracker source API returned an invalid database response."
    );
  }

  const cards =
    rawDbCards
      .filter(
        isRealDbCard
      )
      .map(
        cleanDbCard
      );

  if (
    cards.length === 0
  ) {
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

  const recentCards =
    buildRecentCards(
      recentActivity,
      indexes.cardsById
    );

  const refreshedAt =
    new Date()
      .toISOString();

  /*
   * -------------------------------------------------
   * EXISTING PRODUCTION DATABASE
   * -------------------------------------------------
   *
   * Keep this structure unchanged during Step 1.
   * The current live RPA Tracker continues using it.
   */
  const data = {
    cards,

    groups,

    cardsById:
      indexes.cardsById,

    groupsBySlug:
      indexes.groupsBySlug,

    recentCards,

    meta: {
      cardCount:
        cards.length,

      groupCount:
        groups.length,

      recentCardCount:
        recentCards.length,

      refreshedAt,
    },
  };

  const body =
    JSON.stringify(
      data
    );

  const bucket =
    storage.bucket(
      cardsAlertPrivateBucket
    );

  const file =
    bucket.file(
      SNAPSHOT_OBJECT
    );

  /*
   * Write existing database.json first.
   */
  await file.save(
    body,
    {
      resumable:
        false,

      contentType:
        "application/json",

      metadata: {
        cacheControl:
          "private, max-age=300",
      },
    }
  );

  const bytes =
    Buffer.byteLength(
      body,
      "utf8"
    );

  /*
   * -------------------------------------------------
   * NEW LIGHTWEIGHT INDEX
   * -------------------------------------------------
   */
  const lightweightGroups =
  buildLightweightGroups(
    groups,
    cards
  );

const exactLookup =
  buildExactLookup(
    cards
  );

const indexData = {
  groups:
    lightweightGroups,

  recentCards,

  exactLookup,

  meta: {
      cardCount:
        cards.length,

      groupCount:
        groups.length,

      recentCardCount:
        recentCards.length,

      refreshedAt,
    },
  };

  const indexBytes =
    await writeJsonObject(
      INDEX_OBJECT,
      indexData
    );

  /*
   * -------------------------------------------------
   * NEW GROUP DETAIL FILES
   * -------------------------------------------------
   */
  const groupDetails =
    await writeGroupDetails(
      groups,
      cards,
      refreshedAt
    );

  /*
   * -------------------------------------------------
   * NEW CARD DETAIL SHARDS
   * -------------------------------------------------
   */
  const cardDetails =
    await writeCardDetailGroups(
      cards,
      refreshedAt
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

      recentCards:
        recentCards.length,

      bytes,

      indexObject:
        INDEX_OBJECT,

      indexBytes,

      groupDetailFiles:
        groupDetails.count,

      groupDetailBytes:
        groupDetails.bytes,

      cardDetailFiles:
        cardDetails.count,

      cardDetailBytes:
        cardDetails.bytes,
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

    recentCardCount:
      recentCards.length,

    bytes,

    index: {
      object:
        INDEX_OBJECT,

      bytes:
        indexBytes,
    },

    groupDetails: {
      count:
        groupDetails.count,

      bytes:
        groupDetails.bytes,
    },

    cardDetails: {
      count:
        cardDetails.count,

      bytes:
        cardDetails.bytes,
    },

    refreshedAt,
  };
}