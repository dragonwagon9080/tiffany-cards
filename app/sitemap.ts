import type { MetadataRoute } from "next";

import {
  getCardSets,
  getGuides,
  getInteractiveGuides,
  getPages,
} from "@/lib/cms";

const SITE_URL = "https://www.tiffanycards.com";

function cleanSlug(value: any) {
  return String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function isActive(item: any) {
  const value = String(item?.active ?? "true").toLowerCase().trim();
  return value !== "false" && value !== "no" && value !== "0";
}

function pageUrl(path: string): MetadataRoute.Sitemap[number] {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return {
    url: `${SITE_URL}${cleanPath}`,
    lastModified: new Date(),
  };
}

async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await safeFetch(() => getPages(), []);
  const cardSets = await safeFetch(() => getCardSets(), []);
  const guides = await safeFetch(() => getGuides(), []);
  const interactiveGuides = await safeFetch(() => getInteractiveGuides(), []);

  const urls: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/legal-disclaimer`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/card-sets`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/guide`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/cards-alert`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/rpa-tracker`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  for (const page of pages || []) {
    if (!isActive(page)) continue;

    const slug = cleanSlug(page.slug);
    if (!slug) continue;

    urls.push({
      ...pageUrl(`/${slug}`),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const set of cardSets || []) {
    if (!isActive(set)) continue;

    const slug = cleanSlug(set.slug);
    if (!slug) continue;

    urls.push({
      ...pageUrl(`/card-sets/${slug}`),
      changeFrequency: "monthly",
      priority: 0.85,
    });
  }

  for (const guide of guides || []) {
    if (!isActive(guide)) continue;

    const slug = cleanSlug(guide.slug || guide.guide_slug);
    if (!slug) continue;

    urls.push({
      ...pageUrl(`/guide/${slug}`),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const guide of interactiveGuides || []) {
    if (!isActive(guide)) continue;

    const slug = cleanSlug(guide.slug || guide.guide_slug);
    if (!slug) continue;

    urls.push({
      ...pageUrl(`/guide/${slug}`),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return Array.from(new Map(urls.map((item) => [item.url, item])).values());
}