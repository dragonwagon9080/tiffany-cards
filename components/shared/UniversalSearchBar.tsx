"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

function isLikelyExactRpaLookup(value: string) {
  const q = value.trim();

  return (
    /^\\d{6,}$/.test(q) ||
    /^[A-Za-z]{1,3}[A-Fa-f0-9]{8}$/.test(q)
  );
}

export default function UniversalSearchBar({
  defaultTarget = "rpa",
}: {
  defaultTarget?: SearchTarget;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [target, setTarget] = useState<SearchTarget>(defaultTarget);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [submitting, setSubmitting] = useState(false);

  const exactLookupRef = useRef<AbortController | null>(null);

  const active = TARGETS[target];

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    return () => {
      exactLookupRef.current?.abort();
    };
  }, []);

  async function submitSearch(e: FormEvent) {
    e.preventDefault();

    const q = query.trim();
    if (!q) return;

    exactLookupRef.current?.abort();

    if (target !== "rpa" || !isLikelyExactRpaLookup(q)) {
      router.push(
        `${active.destination}?q=${encodeURIComponent(q)}`
      );
      return;
    }

    const controller = new AbortController();
    exactLookupRef.current = controller;
    setSubmitting(true);

    try {
      const res = await fetch(
        `/api/rpa-tracker?mode=exact&q=${encodeURIComponent(q)}`,
        {
          cache: "no-store",
          signal: controller.signal,
        }
      );

      if (res.ok) {
        const card = await res.json();

        if (card?.Card_id) {
          router.push(
            `/rpa-tracker/card/${encodeURIComponent(card.Card_id)}`
          );
          return;
        }
      }

      router.push(
        `/rpa-tracker?q=${encodeURIComponent(q)}`
      );
    } catch (error: any) {
      if (error?.name === "AbortError") return;

      router.push(
        `/rpa-tracker?q=${encodeURIComponent(q)}`
      );
    } finally {
      if (exactLookupRef.current === controller) {
        exactLookupRef.current = null;
        setSubmitting(false);
      }
    }
  }

  return (
    <section>
      <div className="mb-4 text-center text-sm font-black uppercase tracking-widest text-zinc-400">
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

      <form
        onSubmit={submitSearch}
        className="mx-auto flex max-w-3xl gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={active.placeholder}
          className="h-11 flex-1 rounded border bg-black px-4 text-sm font-bold text-white outline-none"
          style={{ borderColor: active.color }}
        />

        <button
          type="submit"
          disabled={submitting}
          className="h-11 rounded px-5 text-sm font-black uppercase text-white transition disabled:cursor-wait disabled:opacity-60"
          style={{ backgroundColor: active.color }}
          onMouseEnter={(e) => {
            if (!submitting) {
              e.currentTarget.style.backgroundColor = active.hover;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = active.color;
          }}
        >
          {submitting ? "Searching..." : "Search"}
        </button>
      </form>
    </section>
  );
}