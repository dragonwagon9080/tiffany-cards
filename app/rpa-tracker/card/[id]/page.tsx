import type { Metadata } from "next";
import CardClient from "@/components/rpa-tracker/CardClient";
import { getSiteSettings } from "@/lib/cms";

type Card = {
  Card_Title?: string;
  Card_Title_Display?: string;
  Variation_Input?: string;
  Variation?: string;
  Serial_Number?: string;
  Grade?: string;
  Cert_Number?: string;
  Front_Image?: string;
  Card_id?: string;
  Material?: string;
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "https://www.tiffanycards.com";

async function getCard(id: string): Promise<Card | null> {
  try {
    const res = await fetch(
      `${SITE_URL}/api/rpa-tracker?mode=card&id=${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;

    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);

  const canonical = `${SITE_URL}/rpa-tracker/card/${encodeURIComponent(id)}`;

  if (!card) {
    return {
      title: "Card Not Found | RPA Tracker",
      description: "This RPA Tracker card could not be found.",
      alternates: {
        canonical,
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const baseTitle = `${card.Card_Title_Display || card.Card_Title || "RPA Card"} ${
    card.Serial_Number || ""
  }`.trim();

  const title = `${baseTitle} | RPA Tracker`;

  const description =
    [
      card.Variation_Input || card.Variation,
      card.Grade,
      card.Cert_Number ? `Cert #${card.Cert_Number}` : "",
      card.Card_id ? `Card ID #${card.Card_id}` : "",
    ]
      .filter(Boolean)
      .join(" | ") ||
    `View images, serial number, grading history, and registry details for ${baseTitle} on RPA Tracker.`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Tiffany Cards",
      images: card.Front_Image
        ? [
            {
              url: card.Front_Image,
              alt: title,
            },
          ]
        : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: card.Front_Image ? [card.Front_Image] : [],
    },
  };
}

export default async function RPATrackerCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const settings = await getSiteSettings();

  return <CardClient id={id} logoUrl={settings.logo_url} />;
}