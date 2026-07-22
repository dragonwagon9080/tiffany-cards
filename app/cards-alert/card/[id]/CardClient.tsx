"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/cards-alert/StatusBadge";
import CardWorkspace from "@/components/shared/media/CardWorkspace";
import type { ImageItem } from "@/types/image";
import UniversalPageHeader from "@/components/shared/UniversalPageHeader";
import ShareButton from "@/components/shared/ShareButton";
import ContributionModal from "@/components/tnce/ContributionModal";
import TNCEContributeButton from "@/components/shared/TNCEContributeButton";
import TNCEActionMenu from "@/components/shared/TNCEActionMenu";

function sourceLabel(url: string) {
  const lower = url.toLowerCase();

  if (lower.includes("ebay.")) return "eBay →";
  if (lower.includes("goldin")) return "Goldin →";
  if (lower.includes("heritage")) return "Heritage →";
  if (lower.includes("pwcc")) return "PWCC →";
  if (lower.includes("fanatics")) return "Fanatics Collect →";
  if (lower.includes("myslabs")) return "MySlabs →";
  if (lower.includes("comc")) return "COMC →";
  if (lower.includes("facebook")) return "Facebook →";
  if (lower.includes("instagram")) return "Instagram →";
  if (lower.includes("x.com") || lower.includes("twitter"))
    return "X →";

  return "View Source →";
}
function formatDescription(text: string) {
  return String(text || "")
    .replace(
  /(https?:\/\/[^\s<]+)/g,
  (url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-400 underline hover:text-blue-300">${sourceLabel(
      url
    )}</a>`
)
    .replace(/\n/g, "<br />");
}

function splitImages(value: any) {
  return String(value || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  const [copied, setCopied] = useState(false);

  const text = String(value || "").trim() || "—";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex min-h-[88px] w-full flex-col items-center justify-center px-2 py-3 text-center transition hover:bg-[#111111] sm:min-h-[96px] xl:min-h-[104px]"
    >
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d4af37] sm:text-xs">
        {label}
      </div>

      <div className="mt-2 flex min-h-[42px] w-full items-center justify-center px-1">
        <span className="max-w-full break-words text-center text-[clamp(.72rem,1.15vw,1.15rem)] font-black leading-tight text-white">
          {text}
        </span>
      </div>

      <div
        className={`mt-1 h-3 text-[10px] font-bold text-green-400 transition ${
          copied ? "opacity-100" : "opacity-0"
        }`}
      >
        Copied
      </div>
    </button>
  );
}

function Divider() {
  return (
    <div className="mx-auto mt-10 h-px max-w-6xl bg-gradient-to-r from-transparent via-[#9c7a2d]/70 to-transparent" />
  );
}

export default function CardClient({
  id,
  initialCard,
  statuses = [],
}: {
  id: string;
  initialCard?: any;
  statuses?: any[];
}) {
  const [card, setCard] = useState<any>(initialCard || null);
  const [loading, setLoading] = useState(!initialCard);
  const [error, setError] = useState("");
const [showContributionModal, setShowContributionModal] = useState(false);

const [contributionMode, setContributionMode] =
  useState<"update" | "new">("update");

const [contributionAction, setContributionAction] = useState<
  "update" | "similar" | "removal"
>("update");

  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(0);

  useEffect(() => {
    if (initialCard) return;

    async function loadCard() {
      try {
        const res = await fetch(`/api/cards-alert/card/${encodeURIComponent(id)}`);

        if (!res.ok) {
          setError("Card not found");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setCard(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load card");
        setLoading(false);
      }
    }

    if (id) loadCard();
    else {
      setError("Missing card ID");
      setLoading(false);
    }
  }, [id, initialCard]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading card...
      </main>
    );
  }

  if (error || !card) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        {error || "Card not found"}
      </main>
    );
  }

  const leftImages: ImageItem[] = [];

  if (card?.front_image?.trim()) {
    leftImages.push({
      url: card.front_image.trim(),
      label: "Front",
    });
  }

  splitImages(card?.back_image).forEach((url) => {
    leftImages.push({
      url,
      label: "Back",
    });
  });

  const additionalImages: ImageItem[] = splitImages(card?.additional_images).map(
    (url, index) => ({
      url,
      label: `Additional ${index + 1}`,
    })
  );

  const allCompareImages: ImageItem[] = [...leftImages, ...additionalImages];

  useEffect(() => {
    if (!allCompareImages.length) return;

    setLeftIndex(0);
    setRightIndex(
      additionalImages.length > 0
        ? leftImages.length
        : leftImages.length > 1
        ? 1
        : 0
    );
  }, [card?.ID, card?.Cert_Number]);

  const title = `${card.Year || ""} ${card.First || ""} ${card.Last || ""} ${
    card.Num ? `#${card.Num}` : ""
  } ${card.Brand || ""}`
    .replace(/\s+/g, " ")
    .trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    image: allCompareImages.map((img) => img.url),
    description: `Reported as Possibly ${card.Status || "Unknown"}. ${
      card.Description || ""
    }`,
    brand: {
      "@type": "Brand",
      name: card.Brand || "Unknown",
    },
    identifier: card.Cert_Number || id,
  };

  const goldButtonClass =
    "inline-flex w-fit items-center rounded border border-[#d4af37] bg-[#9c7a2d] px-3 py-1.5 text-sm font-bold text-[#111111] transition hover:bg-[#b99236]";

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="mx-auto w-full max-w-[1800px] px-2">
        
<UniversalPageHeader
  section="Cards Alert"
  title={title}
  defaultTarget="cardsalert"
  badge={
    card.Status ? (
      <StatusBadge
        status={card.Status}
        statuses={statuses}
        size="large"
      />
    ) : undefined
  }
>
  <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Link
      href="/cards-alert"
      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#d4af37] bg-[#9c7a2d] px-3 py-2 text-sm font-bold text-black transition hover:bg-[#b99236] sm:w-auto sm:justify-start"
    >
      ← Back
    </Link>

    <div className="flex flex-col gap-3 sm:flex-row">
      <TNCEActionMenu
  button={
    <TNCEContributeButton
      theme={{
        report_bg_color: "#dc2626",
        report_hover_color: "#991b1b",
        report_border_color: "#fca5a5",
        report_text_color: "#ffffff",
      }}
      label="+ Contribute"
    />
  }
  actions={[
    {
  icon: "📝",
  label: "Update Existing Card",
  description: "Correct information or add details",
  onClick: () => {
    setContributionMode("update");
setContributionAction("update");
setShowContributionModal(true);
  },
},
{
  icon: "🆕",
  label: "Report Similar Card",
  description: "Same card with a different grade, cert, or serial number",
  onClick: () => {
    setContributionMode("new");
setContributionAction("similar");
setShowContributionModal(true);
  },
},
{
  icon: "🚫",
  label: "Request Removal",
  description: "Request review or removal of this listing",
  danger: true,
  onClick: () => {
    setContributionMode("update");
setContributionAction("removal");
setShowContributionModal(true);
  },
},
  ]}
/>

      <ShareButton
        type="alert"
        title={title}
        url={`https://www.tiffanycards.com/cards-alert/card/${encodeURIComponent(
          id
        )}`}
      />
    </div>
  </div>
</UniversalPageHeader>

        <section className="mt-8 overflow-hidden rounded-xl border border-[#9c7a2d]/80 bg-zinc-950 shadow-2xl">
          <div className="h-[820px] bg-black xl:h-[940px]">
            <CardWorkspace
              images={allCompareImages}
              leftIndex={leftIndex}
              rightIndex={rightIndex}
              onLeftSelect={setLeftIndex}
              onRightSelect={setRightIndex}
            />
          </div>
        </section>

        <Divider />

        <section className="mt-8 overflow-hidden rounded-lg border border-[#9c7a2d] bg-black">
  <div className="grid grid-cols-2 divide-x divide-y divide-[#9c7a2d]/60 sm:grid-cols-4 xl:grid-cols-7 xl:divide-y-0">
    <InfoBox label="Grade" value={card.Grade} />

    <InfoBox label="Cert #" value={card.Cert_Number} />

    <InfoBox
      label="Player"
      value={`${card.First || ""} ${card.Last || ""}`.trim()}
    />

    <InfoBox label="Year" value={card.Year} />

    <InfoBox label="Brand" value={card.Brand} />

    <InfoBox label="Card #" value={card.Num} />

    <InfoBox label="Sport" value={card.Sport} />
  </div>
</section>

        <Divider />

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-[#d4af37]">Opinion(s)</h2>

          <div
            className="mt-3 text-lg leading-relaxed text-gray-300"
            dangerouslySetInnerHTML={{
              __html: formatDescription(card.Description || ""),
            }}
          />
        </section>

        {card.Site_Link && (
          <>
            <Divider />

            <section className="mt-10">
              <h2 className="text-xl font-bold text-[#d4af37]">Source Link</h2>

              <a
                href={card.Site_Link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block font-bold text-blue-400 underline transition hover:text-blue-300"
              >
                {sourceLabel(card.Site_Link)}
              </a>
            </section>
          </>
        )}

        <Divider />

        <section className="mt-10 text-sm italic leading-relaxed text-gray-400">
          <a href="/disclaimer" className="text-[#d4af37] underline">
            Disclaimer:
          </a>{" "}
          Cards Alert is a community-driven resource for sharing opinions about
          cards that may be altered, fake, mislabeled, stolen, or otherwise
          questionable. Information is provided for research and discussion only.
        </section>
           </div>

      <ContributionModal
        open={showContributionModal}
        onClose={() => setShowContributionModal(false)}
       mode={contributionMode}
        project="cards-alert"
        projectLabel="Cards Alert"
        activeObject={{
          ...card,
          id: card.ID || id,
          title,
        }}
      />
    </main>
  );
}