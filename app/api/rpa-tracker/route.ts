import { NextResponse } from "next/server";
import { getCachedRPATrackerData } from "@/lib/rpa-tracker/cache";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;
const MAX_OFFSET = 50000;
const MAX_QUERY_LENGTH = 120;

function normalize(value: any) {
  return String(value ?? "").trim().toLowerCase();
}

function splitList(value: any) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasListValue(source: any, selected: any) {
  if (!selected) return true;

  return splitList(source).some(
    (item) => normalize(item) === normalize(selected)
  );
}

function parseSerial(value: any) {
  const text = String(value || "").trim();
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);

  if (!match) {
    return {
      numerator: 999999,
      denominator: 999999,
    };
  }

  return {
    numerator: Number(match[1]),
    denominator: Number(match[2]),
  };
}

function variationName(card: any) {
  return String(
    card.Variation_Input ||
      card.Variation ||
      "Base"
  ).trim();
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
    Card_Title: card.Card_Title ?? "",
    Serial_Number: card.Serial_Number ?? "",
    Variation_Input: card.Variation_Input ?? "",
    Card_History: card.Card_History ?? "",
    Grade: card.Grade ?? "",
    Cert_Number: card.Cert_Number ?? "",
    Front_Image: card.Front_Image ?? "",
    Back_Image: card.Back_Image ?? "",
    Other_Images: card.Other_Images ?? "",
    Card_id: card.Card_id ?? "",
    Display_Image: card.Display_Image ?? "",
    Card_Title_Display: card.Card_Title_Display ?? "",
    Brand: card.Brand ?? "",
    Numerator: card.Numerator ?? "",
    Denominator: card.Denominator ?? "",
    First: card.First ?? "",
    Last: card.Last ?? "",
    Player: card.Player ?? "",
    Year: card.Year ?? "",
    Set: card.Set ?? "",
    Variation: card.Variation ?? "",
    Sport: card.Sport ?? "",
    Material: card.Material ?? "",
    Card_Description: card.Card_Description ?? "",
    Slug: card.Slug ?? "",
    Cards_Alert_Status: card.Cards_Alert_Status ?? "",
  };
}

function publicGroup(group: any) {
  if (!group) return null;

  return {
    Slug: group.Slug ?? "",
    Card_Title: group.Card_Title ?? "",
    Card_Title_Display: group.Card_Title_Display ?? "",
    Player: group.Player ?? "",
    First: group.First ?? "",
    Last: group.Last ?? "",
    Year: group.Year ?? "",
    Brand: group.Brand ?? "",
    Set: group.Set ?? "",
    Variation: group.Variation ?? "",
    Material: group.Material ?? "",
    Sport: group.Sport ?? "",
    Description: group.Description ?? "",
    Card_Description: group.Card_Description ?? "",
    Count: group.Count ?? 0,
    Display_Image: group.Display_Image ?? "",
    Front_Image: group.Front_Image ?? "",
    Main_Page_Image: group.Main_Page_Image ?? "",
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

function matchesSearch(group: any, q: string, cards: any[]) {
  if (!q.trim()) return true;

  const groupCards = cards.filter(
    (card: any) => card.Slug === group.Slug
  );

  const searchable = [
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
    group.Sport,
    group.Description,

    ...groupCards.flatMap((card: any) => [
      card.Card_id,
      card.Cert_Number,
      card.Serial_Number,
      card.Grade,
      card.Variation_Input,
      card.Variation,
      card.Card_Title,
      card.Card_Title_Display,
      card.Player,
      card.First,
      card.Last,
      card.Year,
      card.Brand,
      card.Set,
      card.Sport,
      card.Material,
      card.Card_Description,
    ]),
  ]
    .join(" ")
    .toLowerCase();

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

  return terms.every((term) => searchable.includes(term));
}

function matchesFilters(group: any, filters: any) {
  if (
    filters.sport &&
    normalize(group.Sport) !== normalize(filters.sport)
  ) {
    return false;
  }

  if (
    filters.player &&
    normalize(group.Player) !== normalize(filters.player)
  ) {
    return false;
  }

  if (
    filters.year &&
    String(group.Year) !== String(filters.year)
  ) {
    return false;
  }

  if (
    filters.brand &&
    normalize(group.Brand) !== normalize(filters.brand)
  ) {
    return false;
  }

  if (
    filters.variation &&
    !hasListValue(group.Variation, filters.variation)
  ) {
    return false;
  }

  return true;
}

function unique(values: any[]) {
  return Array.from(
    new Map(
      values
        .flatMap((value) => splitList(value))
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value])
    ).values()
  ).sort((a, b) => a.localeCompare(b));
}

function buildOptions(groups: any[], filters: any = {}) {
  function list(ignore: string) {
    return groups.filter((group) =>
      matchesFilters(group, {
        ...filters,
        [ignore]: "",
      })
    );
  }

  return {
    sports: unique(list("sport").map((group) => group.Sport)),
    players: unique(list("player").map((group) => group.Player)),
    years: unique(list("year").map((group) => group.Year)).sort(
      (a: any, b: any) => Number(b) - Number(a)
    ),
    brands: unique(list("brand").map((group) => group.Brand)),
    variations: unique(
      list("variation").map((group) => group.Variation)
    ),
  };
}

function sortGroups(groups: any[], sort: string) {
  const sorted = [...groups];

  switch (sort) {
    case "playerAZ":
      sorted.sort((a, b) =>
        String(a.Player).localeCompare(String(b.Player))
      );
      break;
    case "playerZA":
      sorted.sort((a, b) =>
        String(b.Player).localeCompare(String(a.Player))
      );
      break;
    case "yearNewest":
      sorted.sort((a, b) => Number(b.Year) - Number(a.Year));
      break;
    case "yearOldest":
      sorted.sort((a, b) => Number(a.Year) - Number(b.Year));
      break;
    case "mostTracked":
      sorted.sort((a, b) => Number(b.Count) - Number(a.Count));
      break;
    case "leastTracked":
      sorted.sort((a, b) => Number(a.Count) - Number(b.Count));
      break;
    case "titleAZ":
      sorted.sort((a, b) =>
        String(a.Card_Title).localeCompare(String(b.Card_Title))
      );
      break;
    case "titleZA":
      sorted.sort((a, b) =>
        String(b.Card_Title).localeCompare(String(a.Card_Title))
      );
      break;
  }

  return sorted;
}

function buildGroupVariations(cards: any[]) {
  const map = new Map<
    string,
    {
      name: string;
      tracked: number;
      printRuns: Map<number, number>;
    }
  >();

  for (const card of cards) {
    const name = variationName(card);
    const serial = parseSerial(card.Serial_Number);

    if (!map.has(name)) {
      map.set(name, {
        name,
        tracked: 0,
        printRuns: new Map(),
      });
    }

    const item = map.get(name)!;
    item.tracked++;

    if (serial.denominator !== 999999) {
      const current =
        item.printRuns.get(serial.denominator) || 0;

      item.printRuns.set(
        serial.denominator,
        current + 1
      );
    }
  }

  return Array.from(map.values())
    .map((item) => {
      const runs = Array.from(item.printRuns.entries())
        .sort((a, b) => a[0] - b[0])
        .map(
          ([denominator, tracked]) =>
            `(${tracked}/${denominator})`
        )
        .join("");

      return {
        name: item.name,
        tracked: item.tracked,
        label: runs
          ? `${item.name} ${runs}`
          : item.name,
      };
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      })
    );
}

export async function GET(req: Request) {
  const cache = await getCachedRPATrackerData();
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "startup";

  if (mode === "card") {
    const id = String(searchParams.get("id") || "")
      .trim()
      .slice(0, 100);

    return json(publicCard(cache.cardsById[id] || null));
  }

  if (mode === "exact") {
    const q = normalize(
      safeQuery(searchParams.get("q"))
    );

    const match = cache.cards.find((card: any) => {
      return (
        normalize(card.Card_id) === q ||
        normalize(card.Cert_Number) === q
      );
    });

    return json(publicCard(match || null));
  }

  if (mode === "group") {
    const slug = String(searchParams.get("slug") || "")
      .trim()
      .slice(0, 250);

    const group = cache.groupsBySlug?.[slug] || null;
    const cards = cache.cards.filter(
      (card: any) => card.Slug === slug
    );

    return json({
      group: publicGroup(group),
      cards: cards.map(publicCard),
      variations: buildGroupVariations(cards),
    });
  }

  const q = safeQuery(searchParams.get("q"));
  const limit = safeLimit(searchParams.get("limit"));
  const offset = safeOffset(searchParams.get("offset"));
  const sort = String(searchParams.get("sort") || "").slice(
    0,
    40
  );

  const filters = {
    sport: String(searchParams.get("sport") || "").slice(
      0,
      80
    ),
    player: String(searchParams.get("player") || "").slice(
      0,
      120
    ),
    year: String(searchParams.get("year") || "").slice(
      0,
      10
    ),
    brand: String(searchParams.get("brand") || "").slice(
      0,
      120
    ),
    variation: String(
      searchParams.get("variation") || ""
    ).slice(0, 120),
  };

  let groups = cache.groups.filter(
    (group: any) =>
      matchesSearch(group, q, cache.cards) &&
      matchesFilters(group, filters)
  );

  groups = sortGroups(groups, sort);

  const total = groups.length;
  const paged = groups.slice(offset, offset + limit);

  return json({
    groups: paged.map(publicGroup),
    options: buildOptions(groups, filters),
    meta: {
      mode,
      total,
      count: paged.length,
      limit,
      offset,
      hasMore: offset + limit < total,
      cardCount: cache.meta.cardCount,
      groupCount: cache.meta.groupCount,
      refreshedAt: cache.meta.refreshedAt,
    },
  });
}