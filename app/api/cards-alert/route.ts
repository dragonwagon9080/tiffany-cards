import { NextResponse } from "next/server";

import {
  getCachedCardsAlertData,
  getCardsAlertOptionsSnapshot,
  getCardsAlertRecentSnapshot,
} from "@/lib/cards-alert/cache";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;
const MAX_OFFSET = 50000;
const MAX_QUERY_LENGTH = 120;

function normalize(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function safeLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function safeOffset(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.min(Math.floor(parsed), MAX_OFFSET);
}

function safeQuery(value: string | null) {
  return String(value || "")
    .slice(0, MAX_QUERY_LENGTH)
    .trim();
}

function publicCard(card: any) {
  if (!card) return null;

  return {
    Year: card.Year ?? "",
    First: card.First ?? "",
    Last: card.Last ?? "",
    Num: card.Num ?? "",
    Brand: card.Brand ?? "",
    Manufacturer: card.Manufacturer ?? "",
    Set: card.Set ?? "",
    Subset: card.Subset ?? "",
    Parallel: card.Parallel ?? "",
    Card_Serial: card.Card_Serial ?? "",
    Grade: card.Grade ?? "",
    Cert_Number: card.Cert_Number ?? "",
    Card_id: card.Card_id ?? "",
    Status: card.Status ?? "",
    Description: card.Description ?? "",
    Sport: card.Sport ?? "",
    Year_Added: card.Year_Added ?? "",
    Site_Link: card.Site_Link ?? "",
    front_image: card.front_image ?? "",
    back_image: card.back_image ?? "",
    additional_images: card.additional_images ?? "",
    Found_By: card.Found_By ?? "",
    Suspect: card.Suspect ?? "",
    Cost: card.Cost ?? "",
  };
}

function json(data: any) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control":
        "public, s-maxage=60, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

function matchesSearch(card: any, q: string) {
  if (!q.trim()) return true;

  const searchable = [
    card.Year,
    card.First,
    card.Last,
    `${card.First || ""} ${card.Last || ""}`,
    card.Num,
    card.Brand,
    card.Manufacturer,
    card.Set,
    card.Subset,
    card.Parallel,
    card.Card_Serial,
    card.Grade,
    card.Cert_Number,
    card.Card_id,
    card.Status,
    card.Description,
    card.Sport,
  ]
    .join(" ")
    .toLowerCase();

  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return terms.every((term) =>
    searchable.includes(term)
  );
}

function matchesFilters(card: any, filters: any) {
  if (
    filters.sport &&
    normalize(card.Sport) !== normalize(filters.sport)
  ) {
    return false;
  }

  if (
    filters.player &&
    normalize(
      `${card.First || ""} ${card.Last || ""}`
    ) !== normalize(filters.player)
  ) {
    return false;
  }

  if (
    filters.year &&
    String(card.Year) !== String(filters.year)
  ) {
    return false;
  }

  if (
    filters.set &&
    normalize(card.Set || card.Brand) !==
      normalize(filters.set)
  ) {
    return false;
  }

  if (
    filters.cardNumber &&
    String(card.Num) !== String(filters.cardNumber)
  ) {
    return false;
  }

  if (
    filters.status &&
    normalize(card.Status) !== normalize(filters.status)
  ) {
    return false;
  }

  return true;
}

function uniqueSorted(values: any[]) {
  return [
    ...new Set(values.filter(Boolean).map(String)),
  ].sort((a, b) => a.localeCompare(b));
}

function parseSerial(value: any) {
  const match = String(value || "").match(
    /(\d+)\s*\/\s*(\d+)/
  );

  if (!match) {
    return {
      numerator: 999999,
      denominator: 999999,
    };
  }

  return {
    numerator: parseInt(match[1], 10),
    denominator: parseInt(match[2], 10),
  };
}

function buildFilterOptions(
  allCards: any[],
  filters: any = {}
) {
  const optionCards = {
    sports: allCards.filter((card) =>
      matchesFilters(card, {
        ...filters,
        sport: "",
      })
    ),

    players: allCards.filter((card) =>
      matchesFilters(card, {
        ...filters,
        player: "",
      })
    ),

    years: allCards.filter((card) =>
      matchesFilters(card, {
        ...filters,
        year: "",
      })
    ),

    sets: allCards.filter((card) =>
      matchesFilters(card, {
        ...filters,
        set: "",
      })
    ),

    cardNumbers: allCards.filter((card) =>
      matchesFilters(card, {
        ...filters,
        cardNumber: "",
      })
    ),

    statuses: allCards.filter((card) =>
      matchesFilters(card, {
        ...filters,
        status: "",
      })
    ),
  };

  return {
    sports: uniqueSorted(
      optionCards.sports.map((c) => c.Sport)
    ),

    players: uniqueSorted(
      optionCards.players.map((c) =>
        `${c.First || ""} ${c.Last || ""}`.trim()
      )
    ),

    years: Array.from(
      new Set(
        optionCards.years
          .map((c) => String(c.Year || "").trim())
          .filter(Boolean)
      )
    ).sort(
      (a: any, b: any) =>
        parseInt(String(b), 10) -
        parseInt(String(a), 10)
    ),

    sets: uniqueSorted(
      optionCards.sets.map((c) => c.Set || c.Brand)
    ),

    cardNumbers: uniqueSorted(
      optionCards.cardNumbers.map((c) => c.Num)
    ).sort(
      (a: any, b: any) => Number(a) - Number(b)
    ),

    statuses: uniqueSorted(
      optionCards.statuses.map((c) => c.Status)
    ),
  };
}

function sortCards(cards: any[], sort: string) {
  const sorted = [...cards];

  if (sort === "cardNumberAsc") {
    sorted.sort(
      (a, b) => Number(a.Num) - Number(b.Num)
    );
  }

  if (sort === "cardNumberDesc") {
    sorted.sort(
      (a, b) => Number(b.Num) - Number(a.Num)
    );
  }

  if (sort === "serialRarest") {
    sorted.sort((a, b) => {
      const serialA = parseSerial(a.Card_Serial);
      const serialB = parseSerial(b.Card_Serial);

      return (
        serialA.denominator -
          serialB.denominator ||
        serialA.numerator -
          serialB.numerator
      );
    });
  }

  if (sort === "serialLeastRare") {
    sorted.sort((a, b) => {
      const serialA = parseSerial(a.Card_Serial);
      const serialB = parseSerial(b.Card_Serial);

      return (
        serialB.denominator -
          serialA.denominator ||
        serialB.numerator -
          serialA.numerator
      );
    });
  }

  if (sort === "parallelAZ") {
    sorted.sort((a, b) =>
      String(a.Parallel || "").localeCompare(
        String(b.Parallel || "")
      )
    );
  }

  if (sort === "parallelZA") {
    sorted.sort((a, b) =>
      String(b.Parallel || "").localeCompare(
        String(a.Parallel || "")
      )
    );
  }

  if (sort === "yearNewest") {
    sorted.sort(
      (a, b) => Number(b.Year) - Number(a.Year)
    );
  }

  if (sort === "yearOldest") {
    sorted.sort(
      (a, b) => Number(a.Year) - Number(b.Year)
    );
  }

  if (sort === "playerAZ") {
    sorted.sort((a, b) =>
      `${a.First || ""} ${a.Last || ""}`
        .trim()
        .localeCompare(
          `${b.First || ""} ${b.Last || ""}`.trim()
        )
    );
  }

  if (sort === "playerZA") {
    sorted.sort((a, b) =>
      `${b.First || ""} ${b.Last || ""}`
        .trim()
        .localeCompare(
          `${a.First || ""} ${a.Last || ""}`.trim()
        )
    );
  }

  return sorted;
}

export async function GET(req: Request) {
  const { searchParams } =
    new URL(req.url);

  const mode = String(
    searchParams.get("mode") || "recent"
  ).slice(0, 40);

  const q =
    safeQuery(
      searchParams.get("q")
    );

  const limit =
    safeLimit(
      searchParams.get("limit")
    );

  const offset =
    safeOffset(
      searchParams.get("offset")
    );

  const sort = String(
    searchParams.get("sort") || ""
  ).slice(0, 40);

  const filters = {
    sport: String(
      searchParams.get("sport") || ""
    ).slice(0, 80),

    player: String(
      searchParams.get("player") || ""
    ).slice(0, 120),

    year: String(
      searchParams.get("year") || ""
    ).slice(0, 10),

    set: String(
      searchParams.get("set") || ""
    ).slice(0, 140),

    cardNumber: String(
      searchParams.get("cardNumber") || ""
    ).slice(0, 80),

    status: String(
      searchParams.get("status") || ""
    ).slice(0, 80),
  };

  /*
   * STARTUP:
   * Do NOT load the 13+ MB database.
   * Read only the tiny recent/options snapshots from GCS.
   */
  if (mode === "startup") {
    const [
      recentSnapshot,
      optionsSnapshot,
    ] =
      await Promise.all([
        getCardsAlertRecentSnapshot(),
        getCardsAlertOptionsSnapshot(),
      ]);

    const recentCards =
      Array.isArray(
        recentSnapshot?.cards
      )
        ? recentSnapshot.cards
        : [];

    const paged =
      recentCards.slice(
        offset,
        offset + limit
      );

    return json({
      cards:
        paged.map(publicCard),

      options: {
        sports:
          optionsSnapshot?.sports || [],

        players:
          optionsSnapshot?.players || [],

        years:
          optionsSnapshot?.years || [],

        sets:
          optionsSnapshot?.sets || [],

        cardNumbers:
          optionsSnapshot?.cardNumbers || [],

        statuses:
          optionsSnapshot?.statuses || [],
      },

      meta: {
        mode,
        q,
        limit,
        offset,
        count:
          paged.length,
        total:
          Number(
            recentSnapshot?.meta?.total ||
            recentCards.length
          ),
        hasMore:
          offset + limit <
          Number(
            recentSnapshot?.meta?.total ||
            recentCards.length
          ),
      },
    });
  }

  /*
   * Searches, advanced filter options, sorting, and
   * pagination use the full GCS database snapshot.
   */
  const data =
    await getCachedCardsAlertData();

  const allCards =
    (data.cards || []).map(
      (card: any) => ({
        ...card,

        Card_id:
          String(
            card.Card_id || ""
          ).trim(),
      })
    );

  if (
    mode ===
    "filter-options"
  ) {
    return json({
      cards: [],

      options:
        buildFilterOptions(
          allCards,
          filters
        ),

      meta: {
        mode,
        count: 0,
        total:
          allCards.length,
        hasMore: false,
      },
    });
  }

  let cards =
    allCards.filter(
      (card: any) => {
        return (
          matchesSearch(
            card,
            q
          ) &&
          matchesFilters(
            card,
            filters
          )
        );
      }
    );

  cards =
    sortCards(
      cards,
      sort
    );

  const total =
    cards.length;

  const pagedCards =
    cards.slice(
      offset,
      offset + limit
    );

  return json({
    cards:
      pagedCards.map(
        publicCard
      ),

    meta: {
      mode,
      q,
      limit,
      offset,
      count:
        pagedCards.length,
      total,
      hasMore:
        offset + limit <
        total,
    },
  });
}