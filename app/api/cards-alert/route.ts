import { NextResponse } from "next/server";
import { getCachedCardsAlertData } from "@/lib/cards-alert/cache";

function normalize(v: any) {
  return String(v ?? "").trim().toLowerCase();
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

  return terms.every((term) => searchable.includes(term));
}

function matchesFilters(card: any, filters: any) {
  if (filters.sport && normalize(card.Sport) !== normalize(filters.sport)) {
    return false;
  }

  if (
    filters.player &&
    normalize(`${card.First || ""} ${card.Last || ""}`) !==
      normalize(filters.player)
  ) {
    return false;
  }

  if (filters.year && String(card.Year) !== String(filters.year)) {
    return false;
  }

  if (filters.set && normalize(card.Set || card.Brand) !== normalize(filters.set)) {
    return false;
  }

  if (filters.cardNumber && String(card.Num) !== String(filters.cardNumber)) {
    return false;
  }

  if (filters.status && normalize(card.Status) !== normalize(filters.status)) {
    return false;
  }

  return true;
}

function uniqueSorted(values: any[]) {
  return [...new Set(values.filter(Boolean).map(String))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function parseSerial(value: any) {
  const match = String(value || "").match(/(\d+)\s*\/\s*(\d+)/);

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

function buildFilterOptions(allCards: any[], filters: any = {}) {
  const optionCards = {
    sports: allCards.filter((card) =>
      matchesFilters(card, { ...filters, sport: "" })
    ),
    players: allCards.filter((card) =>
      matchesFilters(card, { ...filters, player: "" })
    ),
    years: allCards.filter((card) =>
      matchesFilters(card, { ...filters, year: "" })
    ),
    sets: allCards.filter((card) =>
      matchesFilters(card, { ...filters, set: "" })
    ),
    cardNumbers: allCards.filter((card) =>
      matchesFilters(card, { ...filters, cardNumber: "" })
    ),
    statuses: allCards.filter((card) =>
      matchesFilters(card, { ...filters, status: "" })
    ),
  };

  return {
    sports: uniqueSorted(optionCards.sports.map((c) => c.Sport)),

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
    ).sort((a: any, b: any) => parseInt(String(b), 10) - parseInt(String(a), 10)),

    sets: uniqueSorted(optionCards.sets.map((c) => c.Set || c.Brand)),

    cardNumbers: uniqueSorted(optionCards.cardNumbers.map((c) => c.Num)).sort(
      (a: any, b: any) => Number(a) - Number(b)
    ),

    statuses: uniqueSorted(optionCards.statuses.map((c) => c.Status)),
  };
}

function sortCards(cards: any[], sort: string) {
  const sorted = [...cards];

  if (sort === "cardNumberAsc") {
    sorted.sort((a, b) => Number(a.Num) - Number(b.Num));
  }

  if (sort === "cardNumberDesc") {
    sorted.sort((a, b) => Number(b.Num) - Number(a.Num));
  }

  if (sort === "serialRarest") {
    sorted.sort((a, b) => {
      const serialA = parseSerial(a.Card_Serial);
      const serialB = parseSerial(b.Card_Serial);

      return (
        serialA.denominator - serialB.denominator ||
        serialA.numerator - serialB.numerator
      );
    });
  }

  if (sort === "serialLeastRare") {
    sorted.sort((a, b) => {
      const serialA = parseSerial(a.Card_Serial);
      const serialB = parseSerial(b.Card_Serial);

      return (
        serialB.denominator - serialA.denominator ||
        serialB.numerator - serialA.numerator
      );
    });
  }

  if (sort === "parallelAZ") {
    sorted.sort((a, b) =>
      String(a.Parallel || "").localeCompare(String(b.Parallel || ""))
    );
  }

  if (sort === "parallelZA") {
    sorted.sort((a, b) =>
      String(b.Parallel || "").localeCompare(String(a.Parallel || ""))
    );
  }

  if (sort === "yearNewest") {
    sorted.sort((a, b) => Number(b.Year) - Number(a.Year));
  }

  if (sort === "yearOldest") {
    sorted.sort((a, b) => Number(a.Year) - Number(b.Year));
  }

  if (sort === "playerAZ") {
    sorted.sort((a, b) =>
      `${a.First || ""} ${a.Last || ""}`
        .trim()
        .localeCompare(`${b.First || ""} ${b.Last || ""}`.trim())
    );
  }

  if (sort === "playerZA") {
    sorted.sort((a, b) =>
      `${b.First || ""} ${b.Last || ""}`
        .trim()
        .localeCompare(`${a.First || ""} ${a.Last || ""}`.trim())
    );
  }

  return sorted;
}

export async function GET(req: Request) {
  const data = await getCachedCardsAlertData();
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("mode") || "recent";
  const q = searchParams.get("q") || "";
  const limit = Number(searchParams.get("limit") || 50);
  const offset = Number(searchParams.get("offset") || 0);
  const sort = searchParams.get("sort") || "";

  const filters = {
    sport: searchParams.get("sport") || "",
    player: searchParams.get("player") || "",
    year: searchParams.get("year") || "",
    set: searchParams.get("set") || "",
    cardNumber: searchParams.get("cardNumber") || "",
    status: searchParams.get("status") || "",
  };

  const allCards = data.cards || [];

  if (mode === "startup") {
    const recentCards = allCards.slice(offset, offset + limit);

    return NextResponse.json({
      cards: recentCards,
      options: buildFilterOptions(allCards, {}),
      meta: {
        mode,
        q,
        limit,
        offset,
        count: recentCards.length,
        total: allCards.length,
        hasMore: offset + limit < allCards.length,
      },
    });
  }

  if (mode === "filter-options") {
    return NextResponse.json({
      cards: [],
      options: buildFilterOptions(allCards, filters),
      meta: {
        mode,
        count: 0,
        total: allCards.length,
        hasMore: false,
      },
    });
  }

  let cards = allCards.filter((card: any) => {
    return matchesSearch(card, q) && matchesFilters(card, filters);
  });

  cards = sortCards(cards, sort);

  const total = cards.length;
  const pagedCards = cards.slice(offset, offset + limit);

  return NextResponse.json({
    cards: pagedCards,
    meta: {
      mode,
      q,
      limit,
      offset,
      count: pagedCards.length,
      total,
      hasMore: offset + limit < total,
    },
  });
}