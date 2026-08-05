import type { Metadata } from "next";
import CardClient from "./CardClient";

import {
  getCachedCardsAlertData,
} from "@/lib/cards-alert/cache";

import {
  getCardsAlertStatuses,
} from "@/lib/cms";

import {
  getCardsAlertLists,
} from "@/lib/cards-alert/lists";

function cleanId(value: unknown) {
  return decodeURIComponent(
    String(value ?? "")
  ).trim();
}

function findCardById(
  cards: any[],
  id: string
) {
  const decodedId =
    cleanId(id);

  /*
   * Permanent Card_id is the primary card identity.
   */
  const permanentMatch =
    cards.find((card: any) => {
      return (
        String(
          card.Card_id || ""
        ).trim() === decodedId
      );
    });

  if (permanentMatch) {
    return permanentMatch;
  }

  /*
   * Temporary compatibility for existing public URLs.
   *
   * Remove these fallbacks only after all public links
   * have migrated to Card_id.
   */
  return cards.find((card: any) => {
    return (
      String(
        card.ID || ""
      ).trim() === decodedId ||
      String(
        card.Cert_Number || ""
      ).trim() === decodedId
    );
  });
}

function buildCardTitle(
  card: any
) {
  return [
    card.Year,
    card.First,
    card.Last,
    card.Num
      ? `#${card.Num}`
      : "",
    card.Brand,
    card.Grade,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildCardDescription(
  card: any
) {
  const title =
    buildCardTitle(card);

  const status =
    card.Status
      ? `Reported as Possibly ${card.Status}.`
      : "";

  const cert =
    card.Cert_Number
      ? `Cert #${card.Cert_Number}.`
      : "";

  return `${status} ${title}. ${cert} View images, details, source links, and collector-submitted information on Cards Alert.`
    .replace(/\s+/g, " ")
    .trim();
}

function getCanonicalCardId(
  card: any,
  fallbackId: string
) {
  return (
    String(
      card?.Card_id || ""
    ).trim() ||
    cleanId(fallbackId)
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}): Promise<Metadata> {
  const { id } =
    await params;

  const data =
    await getCachedCardsAlertData();

  const card =
    findCardById(
      data.cards || [],
      id
    );

  if (!card) {
    return {
      title:
        "Card Not Found | Cards Alert",

      description:
        "This Cards Alert record could not be found.",

      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title =
    `${buildCardTitle(
      card
    )} | Cards Alert`;

  const description =
    buildCardDescription(
      card
    );

  const image =
    card.front_image ||
    card.back_image ||
    "";

  const canonicalId =
    getCanonicalCardId(
      card,
      id
    );

  const url =
    `https://www.tiffanycards.com/cards-alert/card/${encodeURIComponent(
      canonicalId
    )}`;

  return {
    title,
    description,

    alternates: {
      canonical: url,
    },

    openGraph: {
      title,
      description,
      url,
      siteName:
        "Tiffany Cards",
      type:
        "article",

      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : [],
    },

    twitter: {
      card:
        "summary_large_image",
      title,
      description,
      images:
        image
          ? [image]
          : [],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } =
    await params;

  const [
    data,
    statuses,
    lists,
  ] =
    await Promise.all([
      getCachedCardsAlertData(),
      getCardsAlertStatuses(),
      getCardsAlertLists(),
    ]);

  const card =
    findCardById(
      data.cards || [],
      id
    );

  const canonicalId =
    card
      ? getCanonicalCardId(
          card,
          id
        )
      : cleanId(id);

  return (
    <CardClient
      id={canonicalId}
      initialCard={
        card || null
      }
      statuses={statuses}
      sports={lists.sports}
      reasons={lists.reasons}
    />
  );
}