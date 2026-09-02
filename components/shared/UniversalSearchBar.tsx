"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
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
    destination:
      "/cards-alert",
    color: "#dc2626",
    hover: "#b91c1c",
  },

  rpa: {
    label: "RPA Tracker",
    placeholder:
      "Search RPA Tracker...",
    destination:
      "/rpa-tracker",
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
    useState(
      urlQuery
    );


  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);


  const exactLookupRef =
    useRef<AbortController | null>(
      null
    );


  const active =
    TARGETS[target];


  /*****************************************************
   * SYNC INPUT WITH CURRENT URL
   *
   * Browser navigation is authoritative.
   *****************************************************/

  useEffect(() => {
    setQuery(
      urlQuery
    );

    setSubmitting(
      false
    );
  }, [
    urlQuery,
  ]);


  /*****************************************************
   * CLEAN UP EXACT LOOKUP
   *****************************************************/

  useEffect(() => {
    return () => {
      exactLookupRef.current
        ?.abort();
    };
  }, []);


  /*****************************************************
   * NORMAL SEARCH NAVIGATION
   *
   * Use real browser navigation instead of
   * router.push().
   *
   * This removes the race between:
   *
   * - local input state
   * - Next router state
   * - useSearchParams()
   * - server navigation completion
   *****************************************************/

  function navigateToSearch(
    searchTarget: SearchTarget,
    value: string
  ) {

    const destination =
      TARGETS[
        searchTarget
      ].destination;


    const nextUrl =
      `${destination}?q=${encodeURIComponent(
        value
      )}`;


    window.location.assign(
      nextUrl
    );
  }


  /*****************************************************
   * SUBMIT SEARCH
   *****************************************************/

  async function submitSearch(
    event: FormEvent
  ) {

    event.preventDefault();


    const q =
      query.trim();


    if (!q) {
      setSubmitting(
        false
      );

      return;
    }


    exactLookupRef.current
      ?.abort();


    /***************************************************
     * NORMAL TEXT SEARCH
     *
     * Examples:
     *
     * bird
     * kevin
     * kobe
     * tracy
     * lebron
     *
     * Navigate immediately.
     ***************************************************/

    if (
      target !== "rpa" ||
      !isLikelyExactRpaLookup(
        q
      )
    ) {

      setSubmitting(
        true
      );


      navigateToSearch(
        target,
        q
      );


      return;
    }


    /***************************************************
     * EXACT RPA LOOKUP
     *
     * Cert numbers and Card IDs get one quick exact
     * lookup before falling back to normal search.
     ***************************************************/

    const controller =
      new AbortController();


    exactLookupRef.current =
      controller;


    setSubmitting(
      true
    );


    /*
     * Never allow an exact lookup request to hang
     * indefinitely.
     */
    const timeout =
      window.setTimeout(
        function () {
          controller.abort();
        },
        8000
      );


    try {

      const response =
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


      if (
        response.ok
      ) {

        const card =
          await response.json();


        if (
          card?.Card_id
        ) {

          window.clearTimeout(
            timeout
          );


          window.location.assign(
            `/rpa-tracker/card/${encodeURIComponent(
              card.Card_id
            )}`
          );


          return;
        }
      }


      window.clearTimeout(
        timeout
      );


      navigateToSearch(
        "rpa",
        q
      );

    } catch (
      error: unknown
    ) {

      window.clearTimeout(
        timeout
      );


      /*
       * Even if the exact lookup times out or fails,
       * do the normal database search.
       */
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


  /*****************************************************
   * INPUT CHANGE
   *****************************************************/

  function handleQueryChange(
    value: string
  ) {

    exactLookupRef.current
      ?.abort();


    exactLookupRef.current =
      null;


    setSubmitting(
      false
    );


    setQuery(
      value
    );
  }


  /*****************************************************
   * TARGET CHANGE
   *****************************************************/

  function handleTargetChange(
    nextTarget: SearchTarget
  ) {

    exactLookupRef.current
      ?.abort();


    exactLookupRef.current =
      null;


    setSubmitting(
      false
    );


    setTarget(
      nextTarget
    );
  }


  /*****************************************************
   * RENDER
   *****************************************************/

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
          value={
            query
          }

          onChange={(
            event
          ) =>
            handleQueryChange(
              event.target.value
            )
          }

          placeholder={
            active.placeholder
          }

          autoComplete="off"

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
              event.currentTarget
                .style
                .backgroundColor =
                active.hover;
            }
          }}

          onMouseLeave={(
            event
          ) => {

            event.currentTarget
              .style
              .backgroundColor =
              active.color;
          }}
        >

          {
            submitting
              ? "Searching..."
              : "Search"
          }

        </button>

      </form>

    </section>
  );
}