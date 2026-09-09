"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type RecentRpaCard = {
  cardId: string;
  activity:
    | "new"
    | "updated";
  publishedAt: string;
  title: string;
  cardTitle: string;
  serialNumber: string;
  variation: string;
  grade: string;
  player: string;
  year: string;
  sport: string;
  image: string;
  href: string;
};

type RecentResponse = {
  ok: boolean;
  cards: RecentRpaCard[];
  count: number;
  refreshedAt?: string | null;
};

export default function RecentRpaSlider() {
  const [cards, setCards] =
    useState<RecentRpaCard[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadRecent() {
      try {
        const res =
          await fetch(
            "/api/rpa-tracker/recent",
            {
              cache:
                "no-store",

              signal:
                controller.signal,
            }
          );

        if (!res.ok) {
          throw new Error(
            `Recent RPA request failed (${res.status}).`
          );
        }

        const data:
          RecentResponse =
            await res.json();

        setCards(
          Array.isArray(
            data.cards
          )
            ? data.cards
            : []
        );
      } catch (
        error: any
      ) {
        if (
          error?.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "Unable to load recent RPA cards:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadRecent();

    return () => {
      controller.abort();
    };
  }, []);

  /*
   * Duplicate the cards so the track can
   * continuously loop without an obvious
   * empty gap.
   */
  const scrollingCards =
    useMemo(() => {
      if (
        cards.length === 0
      ) {
        return [];
      }

      let base =
        [...cards];

      /*
       * A very small activity list would
       * otherwise leave lots of empty space.
       */
      while (
        base.length < 8
      ) {
        base = [
          ...base,
          ...cards,
        ];
      }

      return [
        ...base,
        ...base,
      ];
    }, [cards]);

  if (
    loading ||
    cards.length === 0
  ) {
    return null;
  }

  return (
    <section className="relative mt-10 mb-12 overflow-hidden border-y-2 border-blue-700/90 bg-gradient-to-b from-blue-950/20 to-black py-6 shadow-[inset_0_12px_20px_-12px_rgba(59,130,246,0.65),inset_0_-12px_20px_-12px_rgba(59,130,246,0.65)]">
      <div className="mb-5 flex items-center justify-between px-4 sm:px-6">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-[0.16em] text-white sm:text-xl">
            Recently Added
            &amp; Updated
          </h2>

          <div className="mt-1 h-[2px] w-24 bg-blue-500" />
        </div>
      </div>

      <div className="recent-rpa-window">
        <div className="recent-rpa-track">
          {scrollingCards.map(
            (
              card,
              index
            ) => (
              <a
                key={`${card.cardId}-${index}`}
                href={
                  card.href
                }
                className="group relative flex-shrink-0"
                aria-label={
                  card.title
                }
              >
                <div className="relative flex h-[230px] w-[160px] items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-lg transition duration-200 group-hover:-translate-y-1 group-hover:border-blue-500 group-hover:shadow-blue-500/20 sm:h-[260px] sm:w-[180px]">
                  <img
                    src={
                      card.image
                    }
                    alt={
                      card.title
                    }
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />

                  <div
                    className={`absolute left-2 top-2 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide shadow ${
                      card.activity ===
                      "updated"
                        ? "bg-blue-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {card.activity ===
                    "updated"
                      ? "Updated"
                      : "New"}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 translate-y-full bg-black/90 px-3 py-3 text-center transition-transform duration-200 group-hover:translate-y-0">
                    <div className="line-clamp-2 text-xs font-semibold text-white">
                      {card.title}
                    </div>

                    {(card.serialNumber ||
                      card.variation) && (
                      <div className="mt-1 text-[11px] text-blue-300">
                        {[
                          card.serialNumber,
                          card.variation,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " • "
                          )}
                      </div>
                    )}
                  </div>
                </div>
              </a>
            )
          )}
        </div>
      </div>

      <style jsx>{`
        .recent-rpa-window {
  width: 100%;
  overflow: hidden;
  padding-top: 4px;
  padding-bottom: 1px;
}

        .recent-rpa-track {
          display: flex;
          width: max-content;
          gap: 18px;
          padding-left: 18px;
          padding-right: 18px;
          animation: recentRpaScroll
            90s linear infinite;
        }

        .recent-rpa-window:hover
          .recent-rpa-track {
          animation-play-state:
            paused;
        }

        @keyframes recentRpaScroll {
          from {
            transform: translateX(
              0
            );
          }

          to {
            transform: translateX(
              -50%
            );
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .recent-rpa-track {
            animation: none;
            overflow-x: auto;
          }
        }
      `}</style>
    </section>
  );
}