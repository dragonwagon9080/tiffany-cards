"use client";

import {
  useEffect,
  useMemo,
  useRef,
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

  const mobileScrollerRef =
    useRef<HTMLDivElement>(
      null
    );

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
   * Desktop needs duplicated cards for
   * the continuous looping animation.
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

  function scrollMobile(
    direction:
      | "left"
      | "right"
  ) {
    const scroller =
      mobileScrollerRef.current;

    if (!scroller) {
      return;
    }

    const amount =
      174;

    scroller.scrollBy({
      left:
        direction ===
        "right"
          ? amount
          : -amount,

      behavior:
        "smooth",
    });
  }

  if (
    loading ||
    cards.length === 0
  ) {
    return null;
  }

  function renderCard(
    card: RecentRpaCard,
    key: string
  ) {
    return (
      <a
        key={key}
        href={card.href}
        className="recent-rpa-card group relative flex-shrink-0"
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
    );
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

      {/* Desktop auto-scroll */}
      <div className="recent-rpa-window recent-rpa-desktop">
        <div className="recent-rpa-track">
          {scrollingCards.map(
            (
              card,
              index
            ) =>
              renderCard(
                card,
                `${card.cardId}-desktop-${index}`
              )
          )}
        </div>
      </div>

      {/* Mobile/tablet swipe carousel */}
      <div className="recent-rpa-mobile-wrapper">
        <button
          type="button"
          className="recent-rpa-arrow recent-rpa-arrow-left"
          onClick={() =>
            scrollMobile(
              "left"
            )
          }
          aria-label="Previous cards"
        >
          ‹
        </button>

        <div
          ref={
            mobileScrollerRef
          }
          className="recent-rpa-mobile"
          aria-label="Recently added and updated cards"
        >
          <div className="recent-rpa-mobile-track">
            {cards.map(
              (
                card,
                index
              ) =>
                renderCard(
                  card,
                  `${card.cardId}-mobile-${index}`
                )
            )}
          </div>
        </div>

        <button
          type="button"
          className="recent-rpa-arrow recent-rpa-arrow-right"
          onClick={() =>
            scrollMobile(
              "right"
            )
          }
          aria-label="Next cards"
        >
          ›
        </button>
      </div>

      <style jsx>{`
        .recent-rpa-window {
          width: 100%;
          overflow: hidden;
          padding-top: 6px;
          padding-bottom: 6px;
        }

        .recent-rpa-track {
          display: flex;
          width: max-content;
          gap: 18px;
          padding-left: 18px;
          padding-right: 18px;

          animation:
            recentRpaScroll
            90s
            linear
            infinite;
        }

        .recent-rpa-window:hover
          .recent-rpa-track {
          animation-play-state:
            paused;
        }

        .recent-rpa-mobile-wrapper {
          display: none;
        }

        @keyframes recentRpaScroll {
          from {
            transform:
              translateX(0);
          }

          to {
            transform:
              translateX(-50%);
          }
        }

        @media (
          max-width: 768px
        ) {
          .recent-rpa-desktop {
            display: none;
          }

          .recent-rpa-mobile-wrapper {
            position: relative;
            display: block;
          }

          .recent-rpa-mobile {
            display: block;

            width: 100%;

            overflow-x: auto;
            overflow-y: hidden;

            padding-top: 6px;
            padding-bottom: 8px;

            -webkit-overflow-scrolling:
              touch;

            scroll-snap-type:
              x proximity;

            scrollbar-width:
              none;

            overscroll-behavior-x:
              contain;
          }

          .recent-rpa-mobile::-webkit-scrollbar {
            display: none;
          }

          .recent-rpa-mobile-track {
            display: flex;

            width: max-content;

            gap: 14px;

            padding-left: 16px;
            padding-right: 16px;
          }

          .recent-rpa-mobile-track
            :global(
              .recent-rpa-card
            ) {
            scroll-snap-align:
              start;

            scroll-snap-stop:
              normal;
          }

          .recent-rpa-arrow {
            position: absolute;
            top: 50%;
            z-index: 20;

            display: flex;
            align-items: center;
            justify-content: center;

            width: 42px;
            height: 56px;

            border: 1px solid
              rgba(
                59,
                130,
                246,
                0.7
              );

            border-radius: 10px;

            background:
              rgba(
                0,
                0,
                0,
                0.72
              );

            color: white;

            font-size: 32px;
            font-weight: 700;
            line-height: 1;

            transform:
              translateY(-50%);

            box-shadow:
              0 0 14px
              rgba(
                59,
                130,
                246,
                0.35
              );
          }

          .recent-rpa-arrow-left {
            left: 6px;
          }

          .recent-rpa-arrow-right {
            right: 6px;
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .recent-rpa-track {
            animation: none;
          }

          .recent-rpa-window {
            overflow-x: auto;
          }
        }
      `}</style>
    </section>
  );
}