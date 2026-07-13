"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import CardWorkspace from "@/components/shared/media/CardWorkspace";
import RegistryMap from "./RegistryMap";
import CardInfo from "./CardInfo";
import CardHistory from "./CardHistory";
import UniversalPageHeader from "@/components/shared/UniversalPageHeader";
import ShareButton from "@/components/shared/ShareButton";
import ContributionModal from "@/components/tnce/ContributionModal";

import type { ImageItem } from "@/types/image";

type Props = {
  id: string;
  logoUrl?: string;
};

function extractImages(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const text = String(value || "").trim();

  if (!text) return [];

  const urls = text.match(/https?:\/\/[^\s,"\]]+/g);

  if (urls?.length) {
    return urls.map((url) => url.trim()).filter(Boolean);
  }

  return text
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function variationName(card: any) {
  return String(card?.Variation_Input || card?.Variation || "Base").trim();
}

function GoldDivider() {
  return (
    <div className="my-10 h-px w-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
  );
}

export default function CardClient({ id, logoUrl }: Props) {
  const [card, setCard] = useState<any>(null);
const [groupCards, setGroupCards] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

const [showContribute, setShowContribute] = useState(false);
const [contributionObject, setContributionObject] = useState<any>(null);
const [contributionMode, setContributionMode] =
  useState<"new" | "update" | "missing">("update");

const [leftIndex, setLeftIndex] = useState(0);
const [rightIndex, setRightIndex] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const cardRes = await fetch(`/api/rpa-tracker?mode=card&id=${id}`, {
        cache: "no-store",
      });

      const cardJson = await cardRes.json();
      setCard(cardJson);

      if (cardJson?.Slug) {
        const groupRes = await fetch(
          `/api/rpa-tracker?mode=group&slug=${encodeURIComponent(
            cardJson.Slug
          )}`,
          { cache: "no-store" }
        );

        const groupJson = await groupRes.json();
        setGroupCards(groupJson?.cards || []);
      }

      setLoading(false);
    }

    load();
  }, [id]);

  const images = useMemo<ImageItem[]>((() => {
    if (!card) return [];

    const list: ImageItem[] = [];

    const front = String(card.Front_Image || "").trim();
    const back = String(card.Back_Image || "").trim();
    const others = extractImages(card.Other_Images);

    if (front) list.push({ label: "Front", url: front });
    if (back) list.push({ label: "Back", url: back });

    others.forEach((url: string, index: number) => {
      if (url !== front && url !== back) {
        list.push({
          label: `Other ${index + 1}`,
          url,
        });
      }
    });

    return list;
  }) as any, [card]);

  useEffect(() => {
    setLeftIndex(0);
    setRightIndex(images.length > 1 ? 1 : 0);
  }, [images.length]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">Loading card...</div>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">Card not found.</div>
      </main>
    );
  }

  const selectedVariation = variationName(card);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <UniversalPageHeader
          section="RPA Tracker"
          title={card.Card_Title_Display || card.Card_Title}
          defaultTarget="rpa"
        >
          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/rpa-tracker/group/${card.Slug}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#d4af37] bg-[#9c7a2d] px-3 py-2 text-sm font-bold text-black transition hover:bg-[#b99236] sm:w-auto sm:justify-start"
            >
              ← Back
            </Link>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
  setContributionMode("update");
setContributionObject(card);
setShowContribute(true);
}}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-300 bg-blue-600 px-6 py-3.5 text-base font-extrabold uppercase tracking-wide text-white shadow-lg shadow-blue-900/40 transition duration-200 hover:scale-105 hover:bg-blue-500 hover:shadow-xl sm:w-auto"
              >
                📝 Submit Update
              </button>

              <ShareButton
                type="card"
                title={card.Card_Title_Display || card.Card_Title}
                url={`${
                  process.env.NEXT_PUBLIC_SITE_URL || ""
                }/rpa-tracker/card/${card.Card_id}`}
              />
            </div>
          </div>
        </UniversalPageHeader>

        {images.length > 0 && (
          <div className="h-[800px] overflow-hidden rounded-xl border border-[#9c7a2d]/70">
            <CardWorkspace
              images={images}
              leftIndex={leftIndex}
              rightIndex={rightIndex}
              onLeftSelect={setLeftIndex}
              onRightSelect={setRightIndex}
            />
          </div>
        )}

        <GoldDivider />

        <CardInfo card={card} />

        {card.Card_History && (
          <>
            <GoldDivider />
            <CardHistory history={card.Card_History} />
          </>
        )}

        {groupCards.length > 0 && (
          <>
            <GoldDivider />
            <RegistryMap
  variation={selectedVariation}
  cards={groupCards}
  showVariationPicker
  onMissingCardClick={(missingCard) => {
  setContributionMode("missing");
  setContributionObject(missingCard);
  setShowContribute(true);
}}
/>
          </>
        )}
      </div>

      <ContributionModal
  open={showContribute}
  onClose={() => setShowContribute(false)}
  mode={contributionMode}
  project="rpa-tracker"
  projectLabel="RPA Tracker"
  logoUrl={logoUrl}
  activeObject={contributionObject || card}
/>
    </main>
  );
}