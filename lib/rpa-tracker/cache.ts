import fs from "fs";
import path from "path";

let cachedData: any = null;
let cachedAt = 0;
let pendingRequest: Promise<any> | null = null;

const CACHE_TIME = 1000 * 60 * 60;
const CACHE_FILE = path.join(process.cwd(), ".next", "rpa-tracker-cache.json");
const API_URL = process.env.RPA_TRACKER_API_URL!;

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
  if (Array.isArray(value)) return value.map(cleanString).filter(Boolean);

  return cleanString(value)
    .split(/\r?\n|,/)
    .map(cleanString)
    .filter(Boolean);
}

function getFirstName(row: any) {
  return cleanString(row.First || row.First_Name || "");
}

function getLastName(row: any) {
  return cleanString(row.Last || row.Last_Name || "");
}

function getPlayer(row: any) {
  return cleanString(row.Player || `${getFirstName(row)} ${getLastName(row)}`.trim());
}

function isRealDbCard(card: any) {
  return cleanString(card.Card_Title) !== "" && cleanString(card.Card_id) !== "";
}

function cleanDbCard(card: any) {
  const slug = card.Slug || slugify(card.Card_Title);

  return {
    ...card,
    Slug: slug,
    Other_Images: normalizeOtherImages(card.Other_Images),
  };
}

function buildGroups(homepageRows: any[], dbCards: any[]) {
  const countByTitle = new Map<string, number>();

  for (const card of dbCards) {
    const title = cleanString(card.Card_Title);
    if (!title) continue;
    countByTitle.set(title, (countByTitle.get(title) || 0) + 1);
  }

  return homepageRows
    .filter((row) => cleanString(row.Card_Title) !== "")
    .map((row) => {
      const title = cleanString(row.Card_Title);

      return {
        Slug: row.Slug || slugify(title),

        Card_Title: title,
        Card_Title_Display: row.Card_Title_Display || title,

        First: getFirstName(row),
        Last: getLastName(row),
        Player: getPlayer(row),

        Year: row.Year || "",
        Brand: row.Brand || "",
        Set: row.Set || "",
        Variation: row.Variation || "",
        Sport: row.Sport || "",

        Material: row.Type || row.Material || "",
        Type: row.Type || row.Material || "",

        Description: row.Description || "",
        Main_Page_Image: row.Main_Page_Image || "",

        Count: countByTitle.get(title) || 0,

        HighestGrade: "",
        LastUpdated: "",
      };
    })
    .sort((a, b) => {
      const last = String(a.Last || "").localeCompare(String(b.Last || ""));
      if (last !== 0) return last;

      const first = String(a.First || "").localeCompare(String(b.First || ""));
      if (first !== 0) return first;

      const year = Number(a.Year || 0) - Number(b.Year || 0);
      if (year !== 0) return year;

      return String(a.Brand || "").localeCompare(String(b.Brand || ""));
    });
}

function buildIndexes(cards: any[], groups: any[]) {
  const cardsById: Record<string, any> = {};
  const groupsBySlug: Record<string, any> = {};

  for (const card of cards) {
    const id = cleanString(card.Card_id);
    if (id) cardsById[id] = card;
  }

  for (const group of groups) {
    const slug = cleanString(group.Slug);
    if (slug) groupsBySlug[slug] = group;
  }

  return { cardsById, groupsBySlug };
}

async function fetchAction(action: string) {
  const separator = API_URL.includes("?") ? "&" : "?";

  const res = await fetch(`${API_URL}${separator}action=${action}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`RPA Tracker API action "${action}" failed: ${res.status}`);
  }

  return res.json();
}

function readCacheFile() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Could not read RPA Tracker cache:", err);
  }

  return null;
}

function writeCacheFile(data: any) {
  try {
    const dir = path.dirname(CACHE_FILE);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(data), "utf8");
  } catch (err) {
    console.error("Could not write RPA Tracker cache:", err);
  }
}

export async function refreshRPATrackerData() {
  if (!API_URL) {
    throw new Error("Missing RPA_TRACKER_API_URL environment variable.");
  }

  const [homepageRaw, dbRaw] = await Promise.all([
    fetchAction("homepage"),
    fetchAction("all"),
  ]);

  const homepageRows = Array.isArray(homepageRaw)
    ? homepageRaw
    : homepageRaw?.cards || homepageRaw?.groups || [];

  const rawDbCards = Array.isArray(dbRaw) ? dbRaw : dbRaw?.cards || [];

  const cards = rawDbCards.filter(isRealDbCard).map(cleanDbCard);
  const groups = buildGroups(homepageRows, cards);
  const indexes = buildIndexes(cards, groups);

  const data = {
    cards,
    groups,
    cardsById: indexes.cardsById,
    groupsBySlug: indexes.groupsBySlug,
    meta: {
      cardCount: cards.length,
      groupCount: groups.length,
      refreshedAt: new Date().toISOString(),
    },
  };

  cachedData = data;
  cachedAt = Date.now();

  writeCacheFile(data);

  return data;
}

export async function getCachedRPATrackerData() {
  const now = Date.now();

  if (cachedData && now - cachedAt < CACHE_TIME) {
    return cachedData;
  }

  const fileData = readCacheFile();

  if (fileData) {
    cachedData = fileData;
    cachedAt = now;

    if (!pendingRequest) {
      pendingRequest = refreshRPATrackerData()
        .catch((err) => {
          console.error("Background RPA Tracker refresh failed:", err);
        })
        .finally(() => {
          pendingRequest = null;
        });
    }

    return cachedData;
  }

  if (pendingRequest) return pendingRequest;

  pendingRequest = refreshRPATrackerData().finally(() => {
    pendingRequest = null;
  });

  return pendingRequest;
}