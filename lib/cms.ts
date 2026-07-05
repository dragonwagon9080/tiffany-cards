/* =========================================================
   TIFFANY CMS FETCH HELPERS
   ========================================================= */

const CMS_API_URL =
  "https://script.google.com/macros/s/AKfycbzuO5eVx-tD3DEfwr_UTxb_ggC_Vdgt5Y0qWUDmAHj67BhtdYnuXiTp2CCj85F0bu5-aw/exec";

const CMS_REVALIDATE_SECONDS = 300;

async function fetchCms(action: string, fallback: any) {
  try {
    const res = await fetch(`${CMS_API_URL}?action=${action}`, {
      next: {
        revalidate: CMS_REVALIDATE_SECONDS,
      },
    });

    if (!res.ok) {
      console.error(`CMS fetch failed: ${action}`, res.status);
      return fallback;
    }

    const json = await res.json();
    return json?.data ?? json ?? fallback;
  } catch (error) {
    console.error(`CMS fetch error: ${action}`, error);
    return fallback;
  }
}

/* =========================================================
   GLOBAL SITE DATA
   ========================================================= */

export async function getSiteSettings() {
  return fetchCms("settings", {});
}

export async function getTheme() {
  return fetchCms("theme", {});
}

export async function getNavigation() {
  return fetchCms("navigation", []);
}

export async function getPages() {
  return fetchCms("pages", []);
}

export async function getHomepageSections() {
  return fetchCms("homepage", []);
}

export async function getSocials() {
  return fetchCms("socials", []);
}

/* =========================================================
   CARD SETS
   ========================================================= */

export async function getCardSets() {
  return fetchCms("cardsets", []);
}

export async function getCardSetContent() {
  return fetchCms("cardsetcontent", []);
}

export async function getCardSetKeyCards() {
  return fetchCms("cardsetkeycards", []);
}

/* =========================================================
   GUIDES
   ========================================================= */

export async function getGuides() {
  return fetchCms("guides", []);
}

export async function getInteractiveGuides() {
  return fetchCms("interactiveguides", []);
}

export async function getInteractiveGuideChoices() {
  return fetchCms("interactiveguidechoices", []);
}

export async function getInteractiveGuideLinks() {
  return fetchCms("interactiveguidelinks", []);
}

/* =========================================================
   CARDS ALERT
   ========================================================= */

export async function getCardsAlertStatuses() {
  return fetchCms("cardsalertstatuses", []);
}