import { NextResponse } from "next/server";
import { getCachedRPATrackerData } from "@/lib/rpa-tracker/cache";

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
  return String(card.Variation_Input || card.Variation || "Base").trim();
}

function matchesSearch(group: any, q: string, cards: any[]) {
  if (!q.trim()) return true;

  const groupCards = cards.filter((card: any) => card.Slug === group.Slug);

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
  if (filters.sport && normalize(group.Sport) !== normalize(filters.sport)) {
    return false;
  }

  if (filters.player && normalize(group.Player) !== normalize(filters.player)) {
    return false;
  }

  if (filters.year && String(group.Year) !== String(filters.year)) {
    return false;
  }

  if (filters.brand && normalize(group.Brand) !== normalize(filters.brand)) {
    return false;
  }

  if (filters.variation && !hasListValue(group.Variation, filters.variation)) {
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
    variations: unique(list("variation").map((group) => group.Variation)),
  };
}

function sortGroups(groups: any[], sort: string) {
  const sorted = [...groups];

  switch (sort) {
    case "playerAZ":
      sorted.sort((a, b) => String(a.Player).localeCompare(String(b.Player)));
      break;

    case "playerZA":
      sorted.sort((a, b) => String(b.Player).localeCompare(String(a.Player)));
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
      const current = item.printRuns.get(serial.denominator) || 0;
      item.printRuns.set(serial.denominator, current + 1);
    }
  }

  return Array.from(map.values())
    .map((item) => {
      const runs = Array.from(item.printRuns.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([denominator, tracked]) => `(${tracked}/${denominator})`)
        .join("");

      return {
        name: item.name,
        tracked: item.tracked,
        label: runs ? `${item.name} ${runs}` : item.name,
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
    const id = searchParams.get("id") || "";
    return NextResponse.json(cache.cardsById[id] || null);
  }

  if (mode === "exact") {
  const q = normalize(searchParams.get("q") || "");

  const match = cache.cards.find((card: any) => {
    return (
      normalize(card.Card_id) === q ||
      normalize(card.Cert_Number) === q
    );
  });

  return NextResponse.json(match || null);
}

  if (mode === "group") {
    const slug = searchParams.get("slug") || "";
    const group = cache.groupsBySlug?.[slug] || null;

    const cards = cache.cards.filter((card: any) => card.Slug === slug);

    return NextResponse.json({
      group,
      cards,
      variations: buildGroupVariations(cards),
    });
  }

  const q = searchParams.get("q") || "";
  const limit = Number(searchParams.get("limit") || 50);
  const offset = Number(searchParams.get("offset") || 0);
  const sort = searchParams.get("sort") || "";

  const filters = {
    sport: searchParams.get("sport") || "",
    player: searchParams.get("player") || "",
    year: searchParams.get("year") || "",
    brand: searchParams.get("brand") || "",
    variation: searchParams.get("variation") || "",
  };

  let groups = cache.groups.filter(
    (group: any) =>
      matchesSearch(group, q, cache.cards) && matchesFilters(group, filters)
  );

  groups = sortGroups(groups, sort);

  const total = groups.length;
  const paged = groups.slice(offset, offset + limit);

  return NextResponse.json({
    groups: paged,
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