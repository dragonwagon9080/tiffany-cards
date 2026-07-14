"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  buildRegistryRuns,
  parseSerial,
  variationName,
} from "@/lib/rpaSort";

function buildVariationOptions(cards: any[]) {
  const map = new Map<string, Map<number, number>>();

  cards.forEach((card) => {
    const name = variationName(card);
    const serial = parseSerial(card.Serial_Number);

    if (!map.has(name)) {
      map.set(name, new Map<number, number>());
    }

    if (
      serial?.denominator &&
      serial.denominator <= 250
    ) {
      const runs = map.get(name)!;

      runs.set(
        serial.denominator,
        (runs.get(serial.denominator) || 0) + 1
      );
    }
  });

  const options = Array.from(map.entries())
    .map(([name, runs]) => {
      const runLabel = Array.from(runs.entries())
        .sort((a, b) => a[0] - b[0])
        .map(
          ([denominator, tracked]) =>
            `(${tracked}/${denominator})`
        )
        .join(" ");

      return {
        name,
        label: runLabel
          ? `${name} ${runLabel}`
          : name,
      };
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      })
    );

  return [
    {
      name: "All",
      label: "All Variations",
    },
    ...options,
  ];
}

export default function RegistryMap({
  variation,
  cards,
  showVariationPicker = false,
  onVariationChange,
  onTrackedCardClick,
  onMissingCardClick,
  selectionMode = false,
  selectionTitle,
}: {
  variation: string;
  cards: any[];
  showVariationPicker?: boolean;
  onVariationChange?: (variation: string) => void;
  onTrackedCardClick?: (card: any) => void;
  onMissingCardClick?: (missingCard: any) => void;
  selectionMode?: boolean;
  selectionTitle?: string;
}) {
  const variationOptions = useMemo(
    () => buildVariationOptions(cards || []),
    [cards]
  );

  const [internalVariation, setInternalVariation] =
    useState(variation || "All");

  const activeVariation = onVariationChange
    ? variation || "All"
    : internalVariation || variation || "All";

  function handleVariationChange(value: string) {
    if (onVariationChange) {
      onVariationChange(value);
    } else {
      setInternalVariation(value);
    }
  }

  function buildMissingCardContext({
    variation,
    number,
    denominator,
  }: {
    variation: string;
    number: number;
    denominator: number;
  }) {
    const sample = cards?.[0] || {};
    const serialNumber = `${number}/${denominator}`;

    return {
      title:
        sample.Card_Title_Display ||
        sample.Card_Title ||
        "Missing RPA Card",

      Card_Title: sample.Card_Title || "",

      Card_Title_Display:
        sample.Card_Title_Display ||
        sample.Card_Title ||
        "",

      Serial_Number: serialNumber,
      Variation_Input: variation,
      Variation: variation,
      Numerator: String(number),
      Denominator: String(denominator),
      Player: sample.Player || "",
      First: sample.First || "",
      Last: sample.Last || "",
      Year: sample.Year || "",
      Brand: sample.Brand || "",
      Set: sample.Set || "",
      Sport: sample.Sport || "",
      Material: sample.Material || "",
      Slug: sample.Slug || "",
      Missing_From_Registry: "true",
    };
  }

  const printRuns = buildRegistryRuns(
    cards || [],
    activeVariation
  );

  if (!printRuns.length) return null;

  const heading =
    selectionMode && selectionTitle
      ? selectionTitle
      : "Registry Map";

  return (
    <div
      className={`rounded-xl border bg-zinc-950 p-4 sm:p-6 ${
        selectionMode
          ? "border-blue-400 shadow-[0_0_22px_rgba(59,130,246,.25)]"
          : "border-zinc-700"
      }`}
    >
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wide text-white">
            {heading}
          </h2>

          {selectionMode && (
            <p className="mt-2 text-sm text-zinc-400">
              Select a blue tracked card to update it,
              or select a yellow missing card to add it.
            </p>
          )}
        </div>

        {showVariationPicker &&
          variationOptions.length > 1 && (
            <select
              value={activeVariation}
              onChange={(event) =>
                handleVariationChange(
                  event.target.value
                )
              }
              className="h-10 rounded border border-blue-700 bg-black px-4 text-sm font-bold text-white outline-none transition focus:border-blue-400"
            >
              {variationOptions.map((item) => (
                <option
                  key={item.name}
                  value={item.name}
                >
                  {item.label}
                </option>
              ))}
            </select>
          )}
      </div>

      <div className="space-y-8">
        {printRuns.map(
          ({
            variation,
            denominator,
            foundByNumber,
          }) => (
            <div
              key={`${variation}-${denominator}`}
            >
              <div className="mb-4 text-lg font-bold sm:text-xl">
                <span className="text-blue-400">
                  {variation} /{denominator}
                </span>{" "}
                <span className="text-zinc-300">
                  ({foundByNumber.size}/
                  {denominator})
                </span>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                {Array.from({
                  length: denominator,
                }).map((_, index) => {
                  const number = index + 1;
                  const card =
                    foundByNumber.get(number);

                  const label = `${number}/${denominator}`;

                  const inner = (
                    <span className="flex h-full w-full flex-col items-center justify-center leading-none">
                      <span className="text-sm font-black sm:text-lg">
                        {number}
                      </span>

                      <span className="mt-0.5 text-[8px] font-bold opacity-90 sm:text-[10px]">
                        /{denominator}
                      </span>
                    </span>
                  );

                  if (card) {
                    if (
                      selectionMode &&
                      onTrackedCardClick
                    ) {
                      return (
                        <button
                          key={label}
                          type="button"
                          title={`Update tracked card • ${variation} • ${label}`}
                          onClick={() =>
                            onTrackedCardClick(card)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300 bg-blue-700 text-white transition hover:scale-110 hover:shadow-[0_0_18px_rgba(59,130,246,.85)] sm:h-12 sm:w-12"
                        >
                          {inner}
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={label}
                        href={`/rpa-tracker/card/${card.Card_id}`}
                        title={`${variation} ${label} tracked`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300 bg-blue-700 text-white transition hover:scale-110 hover:shadow-[0_0_18px_rgba(59,130,246,.85)] sm:h-12 sm:w-12"
                      >
                        {inner}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={label}
                      type="button"
                      title={`Add missing card • ${variation} • ${label}`}
                      onClick={() =>
                        onMissingCardClick?.(
                          buildMissingCardContext({
                            variation,
                            number,
                            denominator,
                          })
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4af37] bg-black text-[#d4af37] transition hover:scale-110 hover:bg-[#181300] hover:shadow-[0_0_18px_rgba(212,175,55,.75)] sm:h-12 sm:w-12"
                    >
                      {inner}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-6 border-t border-zinc-800 pt-4 text-sm text-zinc-300">
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