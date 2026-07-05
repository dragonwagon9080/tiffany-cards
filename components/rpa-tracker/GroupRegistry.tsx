"use client";

import { useState } from "react";
import Link from "next/link";

const SPECIAL_ONE_OF_ONE_ORDER = [
  "logoman",
  "nfl shield",
  "superfractor",
  "gold vinyl",
  "laundry tag",
  "bat knob",
  "nameplate",
  "championship tag",
];

function variationName(card: any) {
  return String(card.Variation_Input || card.Variation || "Base").trim();
}

function parseSerial(value: any) {
  const match = String(value || "").match(/(\d+)\s*\/\s*(\d+)/);

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

function specialRank(card: any) {
  const text = variationName(card).toLowerCase();

  const index = SPECIAL_ONE_OF_ONE_ORDER.findIndex((name) =>
    text.includes(name)
  );

  return index === -1 ? 999 : index;
}

function sortCards(cards: any[]) {
  return [...cards].sort((a, b) => {
    const serialA = parseSerial(a.Serial_Number);
    const serialB = parseSerial(b.Serial_Number);

    const rankA = specialRank(a);
    const rankB = specialRank(b);

    if (serialA.denominator === 1 || serialB.denominator === 1) {
      if (rankA !== rankB) return rankA - rankB;
    }

    if (serialA.denominator !== serialB.denominator) {
      return serialA.denominator - serialB.denominator;
    }

    const variationSort = variationName(a).localeCompare(variationName(b));
    if (variationSort !== 0) return variationSort;

    return serialA.numerator - serialB.numerator;
  });
}

function CopyText({
  prefix = "",
  value,
  className = "",
}: {
  prefix?: string;
  value: any;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = String(value || "").trim();

  if (!text) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`transition hover:text-[#d4af37] ${className}`}
      title={`Copy ${text}`}
    >
      {copied ? (
        <span className="text-green-400">✓ Copied!</span>
      ) : (
        <>
          {prefix}
          {text}
        </>
      )}
    </button>
  );
}

export default function GroupRegistry({ cards }: { cards: any[] }) {
  const sortedCards = sortCards(cards || []);

  if (!sortedCards.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-400">
        No cards found.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {sortedCards.map((card) => {
        const variation = variationName(card);
        const grade = card.Grade || "Raw";

        return (
          <div
            key={card.Card_id}
            className="overflow-hidden rounded-lg border border-zinc-700 bg-black transition hover:border-blue-500 hover:shadow-[0_0_25px_rgba(59,130,246,.65)]"
          >
            <Link href={`/rpa-tracker/card/${card.Card_id}`} className="block bg-black p-4">
              <div className="group flex h-64 items-center justify-center overflow-hidden">
  {card.Front_Image ? (
    <img
      src={card.Front_Image}
      alt={card.Card_Title_Display || card.Card_Title}
      className="max-h-full w-auto object-contain transition-transform duration-300 ease-out group-hover:scale-105"
      loading="lazy"
    />
  ) : (
    <div className="text-zinc-500">No Image</div>
  )}
</div>
            </Link>

            <div className="space-y-2 px-4 pb-4 pt-2 text-center select-text">
              <div className="flex items-center justify-center gap-3">
                <span className="text-base font-black text-blue-400">
                  {variation}
                </span>

                <span className="text-lg font-black text-[#d4af37]">
                  {card.Serial_Number || "—"}
                </span>
              </div>

              <div className="text-sm font-bold text-white">
                <span>{grade}</span>

                {card.Cert_Number && (
                  <span className="ml-2">
                    <CopyText prefix="Cert# " value={card.Cert_Number} />
                  </span>
                )}
              </div>

              <div className="text-xs font-bold tracking-wide text-zinc-400">
                <CopyText prefix="Card ID# " value={card.Card_id} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}