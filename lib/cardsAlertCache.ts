import fs from "fs";
import path from "path";

let cachedData: any = null;
let cachedAt = 0;
let pendingRequest: Promise<any> | null = null;

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const CACHE_FILE = path.join(process.cwd(), ".next", "cards-alert-cache.json");

const CARDS_ALERT_API_URL =
  process.env.CARDS_ALERT_API_URL ||
  process.env.NEXT_PUBLIC_CARDS_ALERT_API_URL ||
  "";

function isRealCard(card: any) {
  const first = String(card.First || "").trim();
  const last = String(card.Last || "").trim();
  const brand = String(card.Brand || "").trim();
  const cert = String(card.Cert_Number || "").trim();
  const front = String(card.front_image || "").trim();
  const back = String(card.back_image || "").trim();

  return (
    first !== "" &&
    last !== "" &&
    brand !== "" &&
    (cert !== "" || front.startsWith("http") || back.startsWith("http"))
  );
}

function cleanCardsAlertData(data: any) {
  return {
    ...data,
    cards: (data.cards || []).filter(isRealCard),
  };
}

function readCacheFile() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Could not read Cards Alert cache:", error);
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
  } catch (error) {
    console.error("Could not write Cards Alert cache:", error);
  }
}

export async function refreshCardsAlertData() {
  if (!CARDS_ALERT_API_URL) {
    throw new Error("Missing CARDS_ALERT_API_URL in .env.local");
  }

  const res = await fetch(CARDS_ALERT_API_URL, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Cards Alert API failed: ${res.status}`);
  }

  const rawData = await res.json();
  const data = cleanCardsAlertData(rawData);

  cachedData = data;
  cachedAt = Date.now();

  writeCacheFile(data);

  return data;
}

export async function getCachedCardsAlertData() {
  const now = Date.now();

  if (cachedData && now - cachedAt < CACHE_TIME) {
    return cachedData;
  }

  const fileData = readCacheFile();

  if (fileData) {
    cachedData = cleanCardsAlertData(fileData);
    cachedAt = now;

    if (!pendingRequest) {
      pendingRequest = refreshCardsAlertData()
        .catch((error) => {
          console.error("Background Cards Alert refresh failed:", error);
        })
        .finally(() => {
          pendingRequest = null;
        });
    }

    return cachedData;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = refreshCardsAlertData().finally(() => {
    pendingRequest = null;
  });

  return pendingRequest;
}