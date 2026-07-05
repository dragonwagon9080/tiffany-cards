"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

function variationName(card: any) {
  return String(card.Variation_Input || card.Variation || "Base").trim();
}

function parseSerial(value: any) {
  const match = String(value || "").match(/(\d+)\s*\/\s*(\d+)/);

  if (!match) return null;

  return {
    numerator: Number(match[1]),
    denominator: Number(match[2]),
  };
}

function buildPrintRuns(cards: any[], variation: string) {
  const runs = new Map<number, Map<number, any>>();

  cards.forEach((card) => {
    if (variationName(card) !== variation) return;

    const serial = parseSerial(card.Serial_Number);
    if (!serial) return;
    if (!serial.denominator || serial.denominator > 250) return;

    if (!runs.has(serial.denominator)) {
      runs.set(serial.denominator, new Map<number, any>());
    }

    runs.get(serial.denominator)?.set(serial.numerator, card);
  });

  return Array.from(runs.entries()).sort((a, b) => a[0] - b[0]);
}

function buildVariationOptions(cards: any[]) {
  const map = new Map<string, Map<number, number>>();

  cards.forEach((card) => {
    const name = variationName(card);
    const serial = parseSerial(card.Serial_Number);

    if (!map.has(name)) {
      map.set(name, new Map<number, number>());
    }

    if (serial?.denominator && serial.denominator <= 250) {
      const runs = map.get(name)!;
      runs.set(serial.denominator, (runs.get(serial.denominator) || 0) + 1);
    }
  });

  return Array.from(map.entries())
    .map(([name, runs]) => {
      const runLabel = Array.from(runs.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([denominator, tracked]) => `(${tracked}/${denominator})`)
        .join(" ");

      return {
        name,
        label: runLabel ? `${name} ${runLabel}` : name,
      };
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      })
    );
}

export default function RegistryMap({
  variation,
  cards,
  showVariationPicker = false,
}: {
  variation: string;
  cards: any[];
  showVariationPicker?: boolean;
}) {
  const variationOptions = useMemo(
    () => buildVariationOptions(cards || []),
    [cards]
  );

  const [selectedVariation, setSelectedVariation] = useState(variation);

  const activeVariation = showVariationPicker ? selectedVariation : variation;
  const printRuns = buildPrintRuns(cards, activeVariation);

  if (!printRuns.length) return null;

  return (
    <div className="mb-8 rounded-xl border border-zinc-700 bg-zinc-950 p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-black uppercase tracking-wide text-white">
          Registry Map
        </h2>

        {showVariationPicker && variationOptions.length > 1 && (
          <select
            value={selectedVariation}
            onChange={(e) => setSelectedVariation(e.target.value)}
            className="h-10 rounded border border-blue-700 bg-black px-4 text-sm font-bold text-white outline-none transition focus:border-blue-400"
          >
            {variationOptions.map((item) => (
              <option key={item.name} value={item.name}>
                {item.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-8">
        {printRuns.map(([denominator, foundByNumber]) => (
          <div key={`${activeVariation}-${denominator}`}>
            <div className="mb-4 text-xl font-bold">
              <span className="text-blue-400">
                {activeVariation} /{denominator}
              </span>{" "}
              <span className="text-zinc-300">
                ({foundByNumber.size}/{denominator})
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              {Array.from({ length: denominator }).map((_, index) => {
                const number = index + 1;
                const card = foundByNumber.get(number);
                const label = `${number}/${denominator}`;

                const inner = (
                  <span className="flex h-full w-full flex-col items-center justify-center leading-none">
                    <span className="text-lg font-black">{number}</span>
                    <span className="mt-0.5 text-[10px] font-bold opacity-90">
                      /{denominator}
                    </span>
                  </span>
                );

                if (card) {
                  return (
                    <Link
                      key={label}
                      href={`/rpa-tracker/card/${card.Card_id}`}
                      title={`${activeVariation} ${label} tracked`}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-300 bg-blue-700 text-white transition hover:scale-110 hover:shadow-[0_0_18px_rgba(59,130,246,.85)]"
                    >
                      {inner}
                    </Link>
                  );
                }

                return (
                  <button
                    key={label}
                    type="button"
                    title={`${activeVariation} ${label} not yet tracked`}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37] bg-black text-[#d4af37] transition hover:scale-110 hover:shadow-[0_0_18px_rgba(212,175,55,.75)]"
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-6 border-t border-zinc-800 pt-4 text-sm text-zinc-300">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full bg-blue-700" />
          Tracked
        </div>

        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border border-[#d4af37]" />
          Missing
        </div>
      </div>
    </div>
  );
}