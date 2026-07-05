"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SearchTarget = "tiffany" | "rpa" | "cardsalert";

const TARGETS = {
  tiffany: {
    label: "Tiffany Cards",
    placeholder: "Search Tiffany Cards...",
    destination: "/",
    color: "#d4af37",
    hover: "#b99236",
  },
  cardsalert: {
    label: "Cards Alert",
    placeholder: "Search Cards Alert...",
    destination: "/cards-alert",
    color: "#dc2626",
    hover: "#b91c1c",
  },
  rpa: {
    label: "RPA Tracker",
    placeholder: "Search RPA Tracker...",
    destination: "/rpa-tracker",
    color: "#2563eb",
    hover: "#1d4ed8",
  },
};

export default function UniversalSearchBar({
  defaultTarget = "rpa",
}: {
  defaultTarget?: SearchTarget;
}) {
  const router = useRouter();

  const [target, setTarget] = useState<SearchTarget>(defaultTarget);
  const [query, setQuery] = useState("");

  const active = TARGETS[target];

  async function submitSearch(e: FormEvent) {
    e.preventDefault();

    const q = query.trim();
    if (!q) return;

    if (target === "rpa") {
      try {
        const res = await fetch(
          `/api/rpa-tracker?mode=exact&q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );

        const card = await res.json();

        if (card?.Card_id) {
          router.push(`/rpa-tracker/card/${card.Card_id}`);
          return;
        }
      } catch {}
    }

    router.push(`${active.destination}?q=${encodeURIComponent(q)}`);
  }

  return (
    <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 text-center text-sm font-black uppercase tracking-widest text-zinc-400">
        Search Database
      </div>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {(Object.keys(TARGETS) as SearchTarget[]).map((key) => {
          const item = TARGETS[key];
          const selected = key === target;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setTarget(key)}
              className="rounded border px-4 py-2 text-sm font-bold uppercase transition"
              style={{
                borderColor: selected ? item.color : "#3f3f46",
                backgroundColor: selected ? item.color : "#000000",
                color: selected ? "#ffffff" : item.color,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={submitSearch} className="mx-auto flex max-w-3xl gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={active.placeholder}
          className="h-11 flex-1 rounded border bg-black px-4 text-sm font-bold text-white outline-none"
          style={{ borderColor: active.color }}
        />

        <button
          type="submit"
          className="h-11 rounded px-5 text-sm font-black uppercase text-white transition"
          style={{ backgroundColor: active.color }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = active.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = active.color;
          }}
        >
          Search
        </button>
      </form>
    </section>
  );
}