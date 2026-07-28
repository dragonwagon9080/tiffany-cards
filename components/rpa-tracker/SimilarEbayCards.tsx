"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type MatchType =
  | "same-card"
  | "same-set"
  | "same-year"
  | "same-player";

type EbayItem = {
  id: string;
  legacyItemId: string;
  title: string;
  image: string;

  price: {
    value: string;
    currency: string;
  };

  url: string;
  buyingOptions: string[];
  condition: string;
  endDate: string;
  seller: string;
  matchType: MatchType;
  matchLabel: string;
  score: number;
};

type Props = {
  card: any;
};

function clean(value: unknown) {
  return String(
    value ?? ""
  ).trim();
}

function formatPrice(
  value: string,
  currency: string
) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount)
  ) {
    return value;
  }

  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",

        currency:
          currency ||
          "USD",
      }
    ).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

function buyingLabel(
  options: string[]
) {
  if (
    options.includes("AUCTION")
  ) {
    return "Auction";
  }

  if (
    options.includes(
      "BEST_OFFER"
    )
  ) {
    return "Best Offer";
  }

  if (
    options.includes(
      "FIXED_PRICE"
    )
  ) {
    return "Buy It Now";
  }

  return "View Listing";
}

function formatEndDate(
  value: string
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

function matchStyle(
  type: MatchType
) {
  if (
    type === "same-card"
  ) {
    return "border-emerald-500/70 bg-emerald-950 text-emerald-200";
  }

  if (
    type === "same-set"
  ) {
    return "border-[#d4af37]/70 bg-[#181300] text-[#f1d36b]";
  }

  if (
    type === "same-year"
  ) {
    return "border-blue-500/70 bg-blue-950 text-blue-200";
  }

  return "border-neutral-600 bg-neutral-800 text-neutral-300";
}

export default function SimilarEbayCards({
  card,
}: Props) {
  const [items, setItems] =
    useState<EbayItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [failed, setFailed] =
    useState(false);

  const scrollRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const params =
    useMemo(() => {
      const player =
        clean(card.Player) ||
        [
          clean(card.First),
          clean(card.Last),
        ]
          .filter(Boolean)
          .join(" ");

      const values = {
        cardId:
          clean(card.Card_id),

        title:
          clean(card.Card_Title),

        year:
          clean(card.Year),

        player,

        cardNumber:
          clean(
            card.Num ||
              card.Card_Number
          ),

        brand:
          clean(
            card.Brand ||
              card.Set
          ),
      };

      const search =
        new URLSearchParams();

      Object.entries(
        values
      ).forEach(
        ([key, value]) => {
          if (value) {
            search.set(
              key,
              value
            );
          }
        }
      );

      return search.toString();
    }, [card]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function load() {
      if (!params) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setFailed(false);

      try {
        const response =
          await fetch(
            `/api/ebay/similar?${params}`,
            {
              signal:
                controller.signal,
            }
          );

        const text =
          await response.text();

        let data: any;

        try {
          data =
            JSON.parse(text);
        } catch {
          throw new Error(
            "eBay API returned invalid JSON."
          );
        }

        if (
          !response.ok ||
          !data.ok
        ) {
          throw new Error(
            data.error ||
              "Unable to load eBay listings."
          );
        }

        setItems(
          Array.isArray(
            data.items
          )
            ? data.items
            : []
        );
      } catch (error: any) {
        if (
          error?.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "Unable to load similar eBay cards:",
          error
        );

        setFailed(true);
        setItems([]);
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setLoading(false);
        }
      }
    }

    load();

    return () =>
      controller.abort();
  }, [params]);

  function scroll(
    direction: number
  ) {
    scrollRef.current?.scrollBy({
      left:
        direction * 640,

      behavior: "smooth",
    });
  }

  if (
    !loading &&
    (
      failed ||
      items.length === 0
    )
  ) {
    return null;
  }

  return (
    <section className="mt-12 border-t border-[#9c7a2d]/70 pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#d4af37]">
            Live eBay Listings
          </div>

          <h2 className="mt-2 text-2xl font-black text-white">
            Similar Cards on eBay
          </h2>

          <p className="mt-2 text-sm text-neutral-400">
            Same card variations appear first, followed by cards from the same set, year, and player.
          </p>
        </div>

        {!loading &&
          items.length > 0 && (
            <div className="hidden gap-2 sm:flex">
              <button
                type="button"
                onClick={() =>
                  scroll(-1)
                }
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#9c7a2d] bg-neutral-950 text-xl font-black text-[#d4af37] transition hover:border-[#d4af37] hover:bg-[#181300]"
                aria-label="Scroll eBay listings left"
              >
                ←
              </button>

              <button
                type="button"
                onClick={() =>
                  scroll(1)
                }
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#9c7a2d] bg-neutral-950 text-xl font-black text-[#d4af37] transition hover:border-[#d4af37] hover:bg-[#181300]"
                aria-label="Scroll eBay listings right"
              >
                →
              </button>
            </div>
          )}
      </div>

      {loading ? (
        <div className="mt-6 flex min-h-64 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-700 border-t-[#d4af37]" />

            <div className="mt-4 text-sm font-bold text-white">
              Finding similar eBay cards...
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-color:#9c7a2d_#171717] [scrollbar-width:thin]"
        >
          {items.map(
            (item) => (
              <a
                key={
                  item.id ||
                  item.url
                }
                href={item.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="group w-[240px] min-w-[240px] snap-start overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 transition hover:-translate-y-1 hover:border-[#d4af37] hover:shadow-[0_12px_30px_rgba(212,175,55,.15)] sm:w-[260px] sm:min-w-[260px]"
              >
                <div className="aspect-square overflow-hidden bg-white">
                  <img
                    src={
                      item.image
                    }
                    alt={
                      item.title
                    }
                    loading="lazy"
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="p-4">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${matchStyle(
                      item.matchType
                    )}`}
                  >
                    {item.matchLabel}
                  </span>

                  <div className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm font-bold leading-6 text-white">
                    {item.title}
                  </div>

                  <div className="mt-3 text-xl font-black text-[#d4af37]">
                    {formatPrice(
                      item.price
                        ?.value,

                      item.price
                        ?.currency
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide">
                    <span className="rounded-full bg-blue-950 px-2.5 py-1 text-blue-200">
                      {buyingLabel(
                        item.buyingOptions ||
                          []
                      )}
                    </span>

                    {item.condition && (
                      <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-neutral-300">
                        {
                          item.condition
                        }
                      </span>
                    )}
                  </div>

                  {item.endDate && (
                    <div className="mt-3 text-xs text-neutral-500">
                      Ends{" "}
                      {formatEndDate(
                        item.endDate
                      )}
                    </div>
                  )}

                  <div className="mt-4 text-sm font-black text-blue-400 underline group-hover:text-blue-300">
                    View on eBay →
                  </div>
                </div>
              </a>
            )
          )}
        </div>
      )}

      <p className="mt-3 text-xs italic text-neutral-500">
        As an eBay Partner, Tiffany Cards may earn from qualifying purchases made through these links.
      </p>
    </section>
  );
}