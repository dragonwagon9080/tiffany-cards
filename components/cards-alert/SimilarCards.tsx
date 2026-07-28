"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Props = {
  currentCard: any;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function cardIdentifier(card: any) {
  return String(
    card?.Cert_Number ||
      card?.ID ||
      ""
  ).trim();
}

function similarityScore(
  card: any,
  currentCard: any
) {
  let score = 0;

  if (
    normalize(card.Brand) ===
    normalize(currentCard.Brand)
  ) {
    score += 4;
  }

  if (
    normalize(card.Year) ===
    normalize(currentCard.Year)
  ) {
    score += 3;
  }

  if (
    normalize(card.Num) ===
    normalize(currentCard.Num)
  ) {
    score += 2;
  }

  if (
    normalize(card.Status) ===
    normalize(currentCard.Status)
  ) {
    score += 1;
  }

  return score;
}

export default function SimilarCards({
  currentCard,
}: Props) {
  const scrollContainer =
    useRef<HTMLDivElement | null>(
      null
    );

  const [cards, setCards] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const player = useMemo(
    () =>
      [
        currentCard?.First,
        currentCard?.Last,
      ]
        .filter(Boolean)
        .join(" ")
        .trim(),
    [
      currentCard?.First,
      currentCard?.Last,
    ]
  );

  const currentId =
    cardIdentifier(currentCard);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadSimilarCards() {
      if (!player) {
        setCards([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const params =
          new URLSearchParams();

        params.set(
          "mode",
          "filter"
        );

        params.set(
          "player",
          player
        );

        /*
         * Retrieve extra records before excluding the
         * current card and ranking the results.
         */
        params.set(
          "limit",
          "50"
        );

        params.set(
          "offset",
          "0"
        );

        const response =
          await fetch(
            `/api/cards-alert?${params.toString()}`,
            {
              cache: "no-store",
              signal:
                controller.signal,
            }
          );

        if (!response.ok) {
          throw new Error(
            "Unable to load similar cards."
          );
        }

        const result =
          await response.json();

        const similarCards =
          Array.isArray(result?.cards)
            ? result.cards
            : [];

        const ranked =
          similarCards
            .filter((card: any) => {
              const id =
                cardIdentifier(card);

              return (
                id &&
                id !== currentId
              );
            })
            .sort(
              (
                firstCard: any,
                secondCard: any
              ) => {
                const scoreDifference =
                  similarityScore(
                    secondCard,
                    currentCard
                  ) -
                  similarityScore(
                    firstCard,
                    currentCard
                  );

                if (
                  scoreDifference !== 0
                ) {
                  return scoreDifference;
                }

                return (
                  Number(
                    secondCard.Year || 0
                  ) -
                  Number(
                    firstCard.Year || 0
                  )
                );
              }
            )
            .slice(0, 12);

        setCards(ranked);
      } catch (error) {
        if (
          error instanceof Error &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Similar Cards fetch failed:",
          error
        );

        setCards([]);
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    loadSimilarCards();

    return () => {
      controller.abort();
    };
  }, [
    player,
    currentId,
    currentCard,
  ]);

  function scrollCards(
    direction: "left" | "right"
  ) {
    scrollContainer.current?.scrollBy({
      left:
        direction === "left"
          ? -340
          : 340,

      behavior: "smooth",
    });
  }

  /*
   * Do not leave an empty section when no related
   * records exist.
   */
  if (
    !loading &&
    cards.length === 0
  ) {
    return null;
  }

  return (
    <>
      <div className="my-10 h-px w-full bg-gradient-to-r from-transparent via-[#9c7a2d]/70 to-transparent" />

      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wide text-[#d4af37]">
              Similar Reported Cards
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Other Cards Alert records for{" "}
              {player}.
            </p>
          </div>

          {!loading &&
            cards.length > 1 && (
              <div className="hidden gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() =>
                    scrollCards("left")
                  }
                  aria-label="Scroll similar cards left"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af37] bg-black text-xl font-black text-[#d4af37] transition hover:bg-[#d4af37] hover:text-black"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={() =>
                    scrollCards("right")
                  }
                  aria-label="Scroll similar cards right"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af37] bg-black text-xl font-black text-[#d4af37] transition hover:bg-[#d4af37] hover:text-black"
                >
                  →
                </button>
              </div>
            )}
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="h-72 w-56 shrink-0 animate-pulse rounded-xl border border-zinc-800 bg-zinc-950"
              />
            ))}
          </div>
        ) : (
          <div
            ref={scrollContainer}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-color:#9c7a2d_#18181b] [scrollbar-width:thin]"
          >
            {cards.map(
              (
                card: any,
                index: number
              ) => {
                const id =
                  cardIdentifier(card);

                const title = [
                  card.Year,
                  card.First,
                  card.Last,
                  card.Num
                    ? `#${card.Num}`
                    : "",
                  card.Brand,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <Link
                    key={`${id}-${index}`}
                    href={`/cards-alert/card/${encodeURIComponent(
                      id
                    )}`}
                    className="group w-56 shrink-0 snap-start overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition hover:-translate-y-1 hover:border-red-600 hover:shadow-[0_0_25px_rgba(220,38,38,.28)]"
                  >
                    <div className="flex h-52 items-center justify-center bg-black p-3">
                      {card.front_image ? (
                        <img
                          src={
                            card.front_image
                          }
                          alt={title}
                          loading="lazy"
                          className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                          No image
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 p-3">
                      <div className="line-clamp-3 text-sm font-black leading-5 text-white">
                        {title}
                      </div>

                      {card.Status && (
                        <div className="text-xs font-bold uppercase tracking-wide text-red-400">
                          {card.Status}
                        </div>
                      )}

                      <div className="text-xs text-zinc-400">
                        {card.Grade ||
                          "Raw"}

                        {card.Cert_Number
                          ? ` • Cert #${card.Cert_Number}`
                          : ""}
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </>
  );
}