"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/cards-alert/StatusBadge";
import UniversalSearchBar from "@/components/shared/UniversalSearchBar";
import ContributionModal from "@/components/tnce/ContributionModal";
import TNCEContributeButton from "@/components/shared/TNCEContributeButton";

type FilterOptions = {
  sports?: string[];
  players?: string[];
  years?: string[];
  sets?: string[];
  cardNumbers?: string[];
  statuses?: string[];
};

type CardsAlertTheme = {
  filter_bg_color?: string;
  filter_hover_color?: string;
  filter_border_color?: string;
  filter_text_color?: string;
  reset_bg_color?: string;
  reset_hover_color?: string;
  reset_text_color?: string;
  report_bg_color?: string;
  report_hover_color?: string;
  report_border_color?: string;
  report_text_color?: string;
  button_bg_color?: string;
  button_text_color?: string;
};

function CopyText({ value }: { value: any }) {
  const [copied, setCopied] = useState(false);

  const text = String(value || "").trim();

  if (!text) return <span>—</span>;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="font-bold text-gray-400 transition hover:text-red-400"
      title={`Copy ${text}`}
    >
      {copied ? <span className="text-green-400">✓ Copied!</span> : text}
    </button>
  );
}

export default function CardsAlertClient({
  theme = {},
  statuses = [],
}: {
  theme?: CardsAlertTheme;
  statuses?: any[];
}) {
  
  const searchParams = useSearchParams();

  const [cards, setCards] = useState<any[]>([]);
  const [options, setOptions] = useState<FilterOptions>({});
  const [loading, setLoading] = useState(true);

  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [sportFilter, setSportFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [setFilter, setSetFilter] = useState("all");
  const [cardNumberFilter, setCardNumberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("");
  const [showContributionModal, setShowContributionModal] =
  useState(false);


  const filterBg = theme.filter_bg_color || "#9c7a2d";
  const filterHover = theme.filter_hover_color || "#b99236";
  const filterBorder = theme.filter_border_color || "#d4af37";
  const filterText = theme.filter_text_color || "#111111";

  const resetBg = theme.reset_bg_color || "#991b1b";
  const resetHover = theme.reset_hover_color || "#dc2626";
  const resetText = theme.reset_text_color || "#ffffff";

  async function loadStartup() {
    setLoading(true);

    const q = searchParams.get("q") || "";
    setSearch(q);

    const params = new URLSearchParams();

    if (q.trim()) {
      params.set("mode", "filter");
      params.set("q", q.trim());
      params.set("limit", "100");
      params.set("offset", "0");
    } else {
      params.set("mode", "startup");
      params.set("limit", "50");
      params.set("offset", "0");
    }

    const res = await fetch(`/api/cards-alert?${params.toString()}`, {
      cache: "no-store",
    });

    const json = await res.json();

    setCards(json.cards || []);
    setOptions(json.options || {});
    setTotalResults(json?.meta?.total || 0);
    setHasMore(json?.meta?.hasMore || false);
    setOffset(q.trim() ? 100 : 50);
    setLoading(false);
  }

  async function loadFilterOptions(overrides: any = {}) {
    const filters = {
      sport: sportFilter,
      player: playerFilter,
      year: yearFilter,
      set: setFilter,
      cardNumber: cardNumberFilter,
      status: statusFilter,
      ...overrides,
    };

    const params = new URLSearchParams();
    params.set("mode", "filter-options");

    if (filters.sport !== "all") params.set("sport", filters.sport);
    if (filters.player !== "all") params.set("player", filters.player);
    if (filters.year !== "all") params.set("year", filters.year);
    if (filters.set !== "all") params.set("set", filters.set);
    if (filters.cardNumber !== "all") {
      params.set("cardNumber", filters.cardNumber);
    }
    if (filters.status !== "all") params.set("status", filters.status);

    const res = await fetch(`/api/cards-alert?${params.toString()}`, {
      cache: "no-store",
    });

    const json = await res.json();
    setOptions(json.options || {});
  }

  async function runServerFilter(overrides: any = {}) {
    const filters = {
      sport: sportFilter,
      player: playerFilter,
      year: yearFilter,
      set: setFilter,
      cardNumber: cardNumberFilter,
      status: statusFilter,
      ...overrides,
    };

    const nextOffset = overrides.offset || 0;
    const append = overrides.append || false;
    const activeSort = overrides.sort ?? sortFilter;

    const params = new URLSearchParams();
    params.set("mode", "filter");
    params.set("limit", "100");
    params.set("offset", String(nextOffset));

    if (search.trim()) params.set("q", search.trim());
    if (activeSort) params.set("sort", activeSort);

    if (filters.sport !== "all") params.set("sport", filters.sport);
    if (filters.player !== "all") params.set("player", filters.player);
    if (filters.year !== "all") params.set("year", filters.year);
    if (filters.set !== "all") params.set("set", filters.set);
    if (filters.cardNumber !== "all") {
      params.set("cardNumber", filters.cardNumber);
    }
    if (filters.status !== "all") params.set("status", filters.status);

    const res = await fetch(`/api/cards-alert?${params.toString()}`, {
      cache: "no-store",
    });

    const json = await res.json();

    if (append) {
      setCards((prev) => [...prev, ...(json.cards || [])]);
    } else {
      setCards(json.cards || []);
    }

    setTotalResults(json?.meta?.total || 0);
    setHasMore(json?.meta?.hasMore || false);
    setOffset(nextOffset + 100);
  }

  async function runSearch(value: string) {
    const q = value.trim();

    if (!q) {
      resetFilters();
      return;
    }

    const params = new URLSearchParams();
    params.set("mode", "filter");
    params.set("q", q);
    params.set("limit", "100");
    params.set("offset", "0");

    if (sortFilter) params.set("sort", sortFilter);
    if (sportFilter !== "all") params.set("sport", sportFilter);
    if (playerFilter !== "all") params.set("player", playerFilter);
    if (yearFilter !== "all") params.set("year", yearFilter);
    if (setFilter !== "all") params.set("set", setFilter);
    if (cardNumberFilter !== "all") params.set("cardNumber", cardNumberFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);

    const res = await fetch(`/api/cards-alert?${params.toString()}`, {
      cache: "no-store",
    });

    const json = await res.json();

    setCards(json.cards || []);
    setTotalResults(json?.meta?.total || 0);
    setHasMore(json?.meta?.hasMore || false);
    setOffset(100);
  }

  function resetFilters() {
    setSearch("");
    setSportFilter("all");
    setPlayerFilter("all");
    setYearFilter("all");
    setSetFilter("all");
    setCardNumberFilter("all");
    setStatusFilter("all");
    setSortFilter("");

    loadStartup();
  }

  useEffect(() => {
    loadStartup();
  }, [searchParams]);

  const controlStyle = {
    backgroundColor: filterBg,
    borderColor: filterBorder,
    color: filterText,
  };

  const resetStyle = {
    backgroundColor: resetBg,
    color: resetText,
  };

  function filterMouseEnter(
  e: React.MouseEvent<HTMLSelectElement | HTMLButtonElement>
) {
  e.currentTarget.style.backgroundColor = filterHover;
}

function filterMouseLeave(
  e: React.MouseEvent<HTMLSelectElement | HTMLButtonElement>
) {
  e.currentTarget.style.backgroundColor = filterBg;
}

  const filterClass =
    "w-36 rounded border p-2 font-bold transition focus:outline-none focus:ring-2 focus:ring-[#d4af37]";

  const searchClass =
    "w-full rounded border p-2 pl-9 font-bold placeholder-black/60 transition focus:outline-none focus:ring-2 focus:ring-[#d4af37]";

  const resetClass =
    "rounded px-4 py-2 font-bold transition focus:outline-none focus:ring-2 focus:ring-red-500";

  if (loading) {
    return (
      <div className="py-20 text-center text-white">
        Loading Cards Alert...
      </div>
    );
  }

  return (
    <section className="px-6 py-8">
      <div className="border-b border-zinc-800 pb-6">
        <div className="mb-6">
  <UniversalSearchBar defaultTarget="cardsalert" />
</div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <select
  className={filterClass}
  style={controlStyle}
  onMouseEnter={filterMouseEnter}
  onMouseLeave={filterMouseLeave}
  value={sportFilter}
            onChange={(e) => {
              const value = e.target.value;
              setSportFilter(value);
              setPlayerFilter("all");
              setYearFilter("all");
              setSetFilter("all");
              setCardNumberFilter("all");
              setStatusFilter("all");

              const filters = {
                sport: value,
                player: "all",
                year: "all",
                set: "all",
                cardNumber: "all",
                status: "all",
              };

              runServerFilter(filters);
              loadFilterOptions(filters);
            }}
          >
            <option value="all">All Sports</option>
            {(options.sports || []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className={filterClass}
            style={controlStyle}
            onMouseEnter={filterMouseEnter}
  onMouseLeave={filterMouseLeave}
            value={playerFilter}
            onChange={(e) => {
              const value = e.target.value;
              setPlayerFilter(value);
              setYearFilter("all");
              setSetFilter("all");
              setCardNumberFilter("all");
              setStatusFilter("all");

              const filters = {
                player: value,
                year: "all",
                set: "all",
                cardNumber: "all",
                status: "all",
              };

              runServerFilter(filters);
              loadFilterOptions(filters);
            }}
          >
            <option value="all">All Players</option>
            {(options.players || []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            className={filterClass}
            style={controlStyle}
            onMouseEnter={filterMouseEnter}
  onMouseLeave={filterMouseLeave}
            value={yearFilter}
            onChange={(e) => {
              const value = e.target.value;
              setYearFilter(value);
              setSetFilter("all");
              setCardNumberFilter("all");
              setStatusFilter("all");

              const filters = {
                year: value,
                set: "all",
                cardNumber: "all",
                status: "all",
              };

              runServerFilter(filters);
              loadFilterOptions(filters);
            }}
          >
            <option value="all">All Years</option>
            {(options.years || []).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            className={filterClass}
            style={controlStyle}
            onMouseEnter={filterMouseEnter}
  onMouseLeave={filterMouseLeave}
            value={setFilter}
            onChange={(e) => {
              const value = e.target.value;
              setSetFilter(value);
              setCardNumberFilter("all");
              setStatusFilter("all");

              const filters = {
                set: value,
                cardNumber: "all",
                status: "all",
              };

              runServerFilter(filters);
              loadFilterOptions(filters);
            }}
          >
            <option value="all">All Sets</option>
            {(options.sets || []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className={filterClass}
            style={controlStyle}
            onMouseEnter={filterMouseEnter}
  onMouseLeave={filterMouseLeave}
            value={cardNumberFilter}
            onChange={(e) => {
              const value = e.target.value;
              setCardNumberFilter(value);
              setStatusFilter("all");

              const filters = {
                cardNumber: value,
                status: "all",
              };

              runServerFilter(filters);
              loadFilterOptions(filters);
            }}
          >
            <option value="all">All Card #</option>
            {(options.cardNumbers || []).map((n, index) => (
              <option key={`${n}-${index}`} value={n}>
                {n}
              </option>
            ))}
          </select>

          <select
            className={filterClass}
            style={controlStyle}
            onMouseEnter={filterMouseEnter}
  onMouseLeave={filterMouseLeave}
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              setStatusFilter(value);

              const filters = {
                status: value,
              };

              runServerFilter(filters);
              loadFilterOptions(filters);
            }}
          >
            <option value="all">All Status</option>
            {(options.statuses || []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className="w-44 rounded border p-2 font-bold transition focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            style={controlStyle}
            value={sortFilter}
            onChange={(e) => {
              const value = e.target.value;
              setSortFilter(value);
              runServerFilter({ sort: value });
            }}
            onMouseEnter={filterMouseEnter}
            onMouseLeave={filterMouseLeave}
          >
            <option value="">Sort Results</option>
            <option value="serialRarest">Serial # Largest First</option>
            <option value="serialLeastRare">Serial # Smallest First</option>
            <option value="cardNumberAsc">Card # Smallest First</option>
            <option value="cardNumberDesc">Card # Largest First</option>
            <option value="parallelAZ">Parallel A-Z</option>
            <option value="parallelZA">Parallel Z-A</option>
            <option value="yearNewest">Year Newest</option>
            <option value="yearOldest">Year Oldest</option>
            <option value="playerAZ">Player A-Z</option>
            <option value="playerZA">Player Z-A</option>
          </select>

          <button
            onClick={resetFilters}
            className={resetClass}
            style={resetStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = resetHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = resetBg;
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 border-b border-zinc-800 px-2 py-4 text-center md:flex-row md:text-left">
        <div className="text-sm text-gray-400">
          Showing {cards.length} of {totalResults} reported cards
        </div>

        <TNCEContributeButton
  theme={theme}
  label="+ Contribute"
  onClick={() => setShowContributionModal(true)}
/>
      </div>

      <div className="grid grid-cols-1 gap-6 py-6 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((card: any, i: number) => (
          <div
            key={`${card.Cert_Number || card.ID || i}`}
            className="group overflow-hidden rounded-xl border border-transparent bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-red-600 hover:shadow-[0_0_25px_rgba(220,38,38,.35)]"
          >
            <a
              href={`/cards-alert/card/${encodeURIComponent(
                card.Cert_Number || card.ID || ""
              )}`}
              className="block bg-black p-3"
            >
              <div className="flex justify-center overflow-hidden rounded-lg">
                {card.front_image && (
                  <img
                    src={card.front_image}
                    loading="lazy"
                    className="max-h-64 w-auto object-contain transition duration-300 group-hover:scale-105"
                    alt={`${card.Year || ""} ${card.First || ""} ${
                      card.Last || ""
                    }`}
                  />
                )}
              </div>
            </a>

            <div className="space-y-1 p-3 text-sm select-text">
              <div className="font-bold text-white">
                {card.Year} {card.First} {card.Last} #{card.Num} {card.Brand}
              </div>

              <StatusBadge status={card.Status} statuses={statuses} />

              <div className="text-gray-300">Grade: {card.Grade}</div>

              <div className="text-gray-400 flex items-center gap-1">
  <span>Cert #:</span>
  <CopyText value={card.Cert_Number} />
</div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pb-10">
          <button
            onClick={() =>
              runServerFilter({
                offset,
                append: true,
              })
            }
            className="rounded border px-5 py-3 font-bold transition focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            style={controlStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = filterHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = filterBg;
            }}
          >
            Load More
          </button>
        </div>
            )}

      <ContributionModal
        open={showContributionModal}
        onClose={() => setShowContributionModal(false)}
        project="cards-alert"
        projectLabel="Cards Alert"
        mode="new"
        activeObject={{
          id: "cards-alert-main-page",
          title: "Cards Alert Main Page",
        }}
      />
    </section>
  );
}