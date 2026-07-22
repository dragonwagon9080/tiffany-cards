"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import {
  buildRegistryRuns,
  normalizeVariationKey,
  type RegistryRun,
} from "@/lib/rpaSort";

type VariationOption = {
  name: string;
  label: string;
};

function buildVariationOptions(
  runs: RegistryRun[]
): VariationOption[] {
  const map = new Map<
    string,
    {
      name: string;
      labels: string[];
    }
  >();

  runs.forEach((run) => {
    const key = normalizeVariationKey(
      run.variation
    );

    if (!map.has(key)) {
      map.set(key, {
        name: run.variation,
        labels: [],
      });
    }

    const item = map.get(key)!;

    const runLabel =
      run.denominator === null
        ? `(${run.foundByNumber.size} tracked, total unknown)`
        : `(${run.foundByNumber.size}/${run.denominator})`;

    item.labels.push(runLabel);
  });

  const options = Array.from(
    map.values()
  )
    .map((item) => ({
      name: item.name,
      label: `${item.name} ${item.labels.join(
        " "
      )}`,
    }))
    .sort((a, b) =>
      a.name.localeCompare(
        b.name,
        undefined,
        {
          sensitivity: "base",
          numeric: true,
        }
      )
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
  description = "",
  showVariationPicker = false,
  onVariationChange,
  onTrackedCardClick,
  onMissingCardClick,
  selectionMode = false,
  selectionTitle,
}: {
  variation: string;
  cards: any[];
  description?: string;
  showVariationPicker?: boolean;
  onVariationChange?: (
    variation: string
  ) => void;
  onTrackedCardClick?: (
    card: any
  ) => void;
  onMissingCardClick?: (
    missingCard: any
  ) => void;
  selectionMode?: boolean;
  selectionTitle?: string;
}) {
  const allRuns = useMemo(
    () =>
      buildRegistryRuns(
        cards || [],
        "All",
        description
      ),
    [cards, description]
  );

  const variationOptions = useMemo(
    () => buildVariationOptions(allRuns),
    [allRuns]
  );

  const [internalVariation, setInternalVariation] =
    useState(variation || "All");

  const activeVariation =
    onVariationChange
      ? variation || "All"
      : internalVariation ||
        variation ||
        "All";

  const printRuns = useMemo(
    () =>
      buildRegistryRuns(
        cards || [],
        activeVariation,
        description
      ),
    [
      cards,
      activeVariation,
      description,
    ]
  );

  function handleVariationChange(
    value: string
  ) {
    if (onVariationChange) {
      onVariationChange(value);
      return;
    }

    setInternalVariation(value);
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

    const sampleTitle = String(
      sample.Card_Title_Display ||
        sample.Card_Title ||
        sample.title ||
        "Missing RPA Card"
    ).trim();

    const baseCardTitle = sampleTitle
      .replace(
        /\s+\d+\s*\/\s*(?:\d+|xx)\s+[^/]+$/i,
        ""
      )
      .trim();

    const selectedCardTitle = [
      baseCardTitle,
      serialNumber,
      variation,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      title: selectedCardTitle,

      Card_Title: baseCardTitle,

      Card_Title_Display:
        selectedCardTitle,

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

  if (!printRuns.length) {
    return null;
  }

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
              Select a blue tracked card
              to update it, or select a
              yellow missing card to add
              it.
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
              {variationOptions.map(
                (item) => (
                  <option
                    key={item.name}
                    value={item.name}
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>
          )}
      </div>

      <div className="space-y-8">
        {printRuns.map((run) => {
          const {
            id,
            variation,
            denominator,
            foundByNumber,
          } = run;

          if (denominator === null) {
            const trackedCards =
              Array.from(
                foundByNumber.entries()
              ).sort(
                ([numberA], [numberB]) =>
                  numberA - numberB
              );

            return (
              <div key={id}>
                <div className="mb-4 text-lg font-bold sm:text-xl">
                  <span className="text-blue-400">
                    {variation}
                  </span>{" "}
                  <span className="text-zinc-300">
                    ({foundByNumber.size}{" "}
                    tracked, total unknown)
                  </span>
                </div>

                {trackedCards.length > 0 ? (
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {trackedCards.map(
                      ([number, card]) => {
                        const label = `${number}/xx`;

                        const inner = (
                          <span className="flex h-full w-full flex-col items-center justify-center px-2 leading-none">
                            <span className="text-xs font-black sm:text-sm">
                              {number}
                            </span>

                            <span className="mt-0.5 text-[8px] font-bold opacity-90 sm:text-[10px]">
                              /xx
                            </span>
                          </span>
                        );

                        if (
                          selectionMode &&
                          onTrackedCardClick
                        ) {
                          return (
                            <button
                              key={`${id}-${number}`}
                              type="button"
                              title={`Update tracked card • ${variation} • ${label}`}
                              onClick={() =>
                                onTrackedCardClick(
                                  card
                                )
                              }
                              className="flex h-10 min-w-20 items-center justify-center rounded-full border border-blue-300 bg-blue-700 text-white transition hover:scale-105 hover:shadow-[0_0_18px_rgba(59,130,246,.85)] sm:h-12"
                            >
                              {inner}
                            </button>
                          );
                        }

                        return (
                          <Link
                            key={`${id}-${number}`}
                            href={`/rpa-tracker/card/${card.Card_id}`}
                            title={`${variation} ${label} tracked`}
                            className="flex h-10 min-w-20 items-center justify-center rounded-full border border-blue-300 bg-blue-700 text-white transition hover:scale-105 hover:shadow-[0_0_18px_rgba(59,130,246,.85)] sm:h-12"
                          >
                            {inner}
                          </Link>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">
                    No Base cards have
                    been tracked yet.
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={id}>
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
                          key={`${id}-${label}`}
                          type="button"
                          title={`Update tracked card • ${variation} • ${label}`}
                          onClick={() =>
                            onTrackedCardClick(
                              card
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300 bg-blue-700 text-white transition hover:scale-110 hover:shadow-[0_0_18px_rgba(59,130,246,.85)] sm:h-12 sm:w-12"
                        >
                          {inner}
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={`${id}-${label}`}
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
                      key={`${id}-${label}`}
                      type="button"
                      title={`Add missing card • ${variation} • ${label}`}
                      onClick={() =>
                        onMissingCardClick?.(
                          buildMissingCardContext(
                            {
                              variation,
                              number,
                              denominator,
                            }
                          )
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
          );
        })}
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