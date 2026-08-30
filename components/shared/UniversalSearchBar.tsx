"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type SearchTarget =
  | "tiffany"
  | "rpa"
  | "cardsalert";

const TARGETS = {
  tiffany: {
    label: "Tiffany Cards",
    placeholder:
      "Search Tiffany Cards...",
    destination: "/",
    color: "#d4af37",
    hover: "#b99236",
  },

  cardsalert: {
    label: "Cards Alert",
    placeholder:
      "Search Cards Alert...",
    destination: "/cards-alert",
    color: "#dc2626",
    hover: "#b91c1c",
  },

  rpa: {
    label: "RPA Tracker",
    placeholder:
      "Search RPA Tracker...",
    destination: "/rpa-tracker",
    color: "#2563eb",
    hover: "#1d4ed8",
  },
};

function isLikelyExactRpaLookup(
  value: string
) {
  const q =
    value.trim();

  return (
    /^\d{6,}$/.test(q) ||
    /^[A-Za-z]{1,3}[A-Fa-f0-9]{8}$/.test(
      q
    )
  );
}

export default function UniversalSearchBar({
  defaultTarget = "rpa",
}: {
  defaultTarget?: SearchTarget;
}) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const urlQuery =
    searchParams.get("q") || "";

  const [
    target,
    setTarget,
  ] =
    useState<SearchTarget>(
      defaultTarget
    );

  const [
    query,
    setQuery,
  ] =
    useState(urlQuery);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const exactLookupRef =
    useRef<AbortController | null>(
      null
    );

  /*
   * Tracks whether the user is actively editing
   * the search box.
   *
   * This prevents an older URL query from writing
   * itself back into the input while a new search
   * is being entered/submitted.
   */
  const editingRef =
    useRef(false);

  const active =
    TARGETS[target];

  /*
   * Sync the input with browser navigation,
   * back/forward, or an externally changed URL.
   *
   * Do not overwrite the text while the user is
   * actively editing a new search.
   */
  useEffect(() => {
    if (
      !editingRef.current
    ) {
      setQuery(
        urlQuery
      );
    }
  }, [
    pathname,
    urlQuery,
  ]);

  /*
   * Once the URL catches up to the search we
   * submitted, URL synchronization can resume.
   */
  useEffect(() => {
    if (
      editingRef.current &&
      urlQuery === query.trim()
    ) {
      editingRef.current =
        false;

      setSubmitting(false);
    }
  }, [
    urlQuery,
    query,
  ]);

  useEffect(() => {
    return () => {
      exactLookupRef.current?.abort();
    };
  }, []);

  function navigateToSearch(
    searchTarget: SearchTarget,
    value: string
  ) {
    const destination =
      TARGETS[searchTarget]
        .destination;

    const nextUrl =
      `${destination}?q=${encodeURIComponent(
        value
      )}`;

    /*
     * Mark this as an active search so the old URL
     * cannot restore its query into the input.
     */
    editingRef.current =
      true;

    setSubmitting(
      true
    );

    router.push(
      nextUrl
    );
  }

  async function submitSearch(
    e: FormEvent
  ) {
    e.preventDefault();

    const q =
      query.trim();

    if (!q) {
      return;
    }

    /*
     * Cancel any previous exact-card lookup.
     */
    exactLookupRef.current?.abort();

    /*
     * Normal text searches such as:
     *
     * kobe
     * tracy
     * lebron
     *
     * should immediately navigate to the new
     * ?q= URL.
     */
    if (
      target !== "rpa" ||
      !isLikelyExactRpaLookup(
        q
      )
    ) {
      navigateToSearch(
        target,
        q
      );

      return;
    }

    /*
     * RPA cert numbers / Card IDs get an exact
     * lookup first.
     */
    const controller =
      new AbortController();

    exactLookupRef.current =
      controller;

    editingRef.current =
      true;

    setSubmitting(
      true
    );

    try {
      const res =
        await fetch(
          `/api/rpa-tracker?mode=exact&q=${encodeURIComponent(
            q
          )}`,
          {
            cache:
              "no-store",

            signal:
              controller.signal,
          }
        );

      if (res.ok) {
        const card =
          await res.json();

        if (
          card?.Card_id
        ) {
          router.push(
            `/rpa-tracker/card/${encodeURIComponent(
              card.Card_id
            )}`
          );

          return;
        }
      }

      navigateToSearch(
        "rpa",
        q
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

      navigateToSearch(
        "rpa",
        q
      );
    } finally {
      if (
        exactLookupRef.current ===
        controller
      ) {
        exactLookupRef.current =
          null;
      }
    }
  }

  function handleQueryChange(
    value: string
  ) {
    /*
     * The instant the user starts typing another
     * search, stop treating the old URL query as
     * authoritative.
     */
    editingRef.current =
      true;

    setQuery(
      value
    );

    /*
     * If an exact lookup from the previous search
     * is still running, cancel it.
     */
    exactLookupRef.current?.abort();

    exactLookupRef.current =
      null;

    setSubmitting(
      false
    );
  }

  function handleTargetChange(
    nextTarget: SearchTarget
  ) {
    exactLookupRef.current?.abort();

    exactLookupRef.current =
      null;

    editingRef.current =
      true;

    setSubmitting(
      false
    );

    setTarget(
      nextTarget
    );
  }

  return (
    <section>
      <div className="mb-4 text-center text-sm font-black uppercase tracking-widest text-zinc-400">
        Search Database
      </div>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {(
          Object.keys(
            TARGETS
          ) as SearchTarget[]
        ).map(
          (key) => {
            const item =
              TARGETS[key];

            const selected =
              key ===
              target;

            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  handleTargetChange(
                    key
                  )
                }
                className="rounded border px-4 py-2 text-sm font-bold uppercase transition"
                style={{
                  borderColor:
                    selected
                      ? item.color
                      : "#3f3f46",

                  backgroundColor:
                    selected
                      ? item.color
                      : "#000000",

                  color:
                    selected
                      ? "#ffffff"
                      : item.color,
                }}
              >
                {
                  item.label
                }
              </button>
            );
          }
        )}
      </div>

      <form
        onSubmit={
          submitSearch
        }
        className="mx-auto flex max-w-3xl gap-2"
      >
        <input
          value={query}
          onChange={(
            event
          ) =>
            handleQueryChange(
              event.target
                .value
            )
          }
          placeholder={
            active.placeholder
          }
          className="h-11 flex-1 rounded border bg-black px-4 text-sm font-bold text-white outline-none"
          style={{
            borderColor:
              active.color,
          }}
        />

        <button
          type="submit"
          disabled={
            submitting
          }
          className="h-11 rounded px-5 text-sm font-black uppercase text-white transition disabled:cursor-wait disabled:opacity-60"
          style={{
            backgroundColor:
              active.color,
          }}
          onMouseEnter={(
            event
          ) => {
            if (
              !submitting
            ) {
              event.currentTarget.style.backgroundColor =
                active.hover;
            }
          }}
          onMouseLeave={(
            event
          ) => {
            event.currentTarget.style.backgroundColor =
              active.color;
          }}
        >
          {submitting
            ? "Searching..."
            : "Search"}
        </button>
      </form>
    </section>
  );
}