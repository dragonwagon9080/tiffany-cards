"use client";

import { useState } from "react";

function clean(value: any) {
  return String(value || "").trim() || "—";
}

function extractCardNumber(card: any) {
  const existing =
    card.Num ||
    card.Card_Number ||
    card.Card_Num ||
    card.Number ||
    card.CardNo;

  if (existing) return existing;

  const title = `${card.Card_Title_Display || ""} ${card.Card_Title || ""}`;
  const match = title.match(/#\s*([A-Za-z0-9-]+)/);

  return match ? match[1] : "—";
}

function InfoBox({ label, value }: { label: string; value: any }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = clean(value);

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
        <span className="max-w-full break-words text-center text-[clamp(0.72rem,1.15vw,1.15rem)] font-black leading-tight text-white">
          {clean(value)}
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

export default function CardInfo({ card }: { card: any }) {
  const variation = card.Variation_Input || card.Variation || "Base";

  return (
    <section className="overflow-hidden rounded-lg border border-[#9c7a2d] bg-black">
      <div className="grid grid-cols-2 divide-x divide-y divide-[#9c7a2d]/60 sm:grid-cols-5 xl:grid-cols-10 xl:divide-y-0">
        <InfoBox label="Grade" value={card.Grade || "Raw"} />
        <InfoBox label="Cert #" value={card.Cert_Number} />
        <InfoBox label="Year" value={card.Year} />
        <InfoBox label="Player" value={card.Player} />
        <InfoBox label="Brand" value={card.Brand || card.Set} />
        <InfoBox label="Card #" value={extractCardNumber(card)} />
        <InfoBox label="Variation" value={variation} />
        <InfoBox label="Serial #" value={card.Serial_Number} />
        <InfoBox label="Sport" value={card.Sport} />
        <InfoBox label="Card ID" value={card.Card_id} />
      </div>
    </section>
  );
}