"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import SearchFilters from "./SearchFilters";
import RegistryGrid from "./RegistryGrid";
import RegistryStats from "./RegistryStats";
import UniversalSearchBar from "@/components/shared/UniversalSearchBar";
import ContributionModal from "@/components/tnce/ContributionModal";
import TiffanyLoadingScreen from "@/components/shared/TiffanyLoadingScreen";

import {
  RegistryGroup,
  FilterOptions,
  TrackerMeta,
  TrackerTheme,
} from "./types";

type ApiResponse = {
  groups: RegistryGroup[];
  options: FilterOptions;
  meta: TrackerMeta;
};

const PAGE_SIZE = 50;

export default function RPATrackerClient({
  theme,
  logoUrl,
}: {
  theme: TrackerTheme;
  logoUrl?: string;
}) {
  const searchParams = useSearchParams();

  const initialQuery =
    searchParams.get("q") || "";

  const [groups, setGroups] = useState<
    RegistryGroup[]
  >([]);

  const [options, setOptions] =
    useState<FilterOptions>({
      sports: [],
      players: [],
      years: [],
      brands: [],
      variations: [],
    });

  const [meta, setMeta] =
    useState<TrackerMeta | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [searching, setSearching] =
    useState(false);

  const [search, setSearch] =
    useState(initialQuery);

  const [sport, setSport] =
    useState("");

  const [player, setPlayer] =
    useState("");

  const [year, setYear] =
    useState("");

  const [brand, setBrand] =
    useState("");

  const [variation, setVariation] =
    useState("");

  const [sort, setSort] =
    useState("");

  const [
    showContribute,
    setShowContribute,
  ] = useState(false);

  const requestRef =
    useRef<AbortController | null>(
      null
    );

  const requestIdRef =
    useRef(0);

  function buildParams(
    offset: number
  ) {
    const params =
      new URLSearchParams();

    params.set(
      "mode",
      search.trim()
        ? "filter"
        : "startup"
    );

    if (search.trim()) {
      params.set(
        "q",
        search.trim()
      );
    }

    if (sport) {
      params.set(
        "sport",
        sport
      );
    }

    if (player) {
      params.set(
        "player",
        player
      );
    }

    if (year) {
      params.set(
        "year",
        year
      );
    }

    if (brand) {
      params.set(
        "brand",
        brand
      );
    }

    if (variation) {
      params.set(
        "variation",
        variation
      );
    }

    if (sort) {
      params.set(
        "sort",
        sort
      );
    }

    params.set(
      "limit",
      String(PAGE_SIZE)
    );

    params.set(
      "offset",
      String(offset)
    );

    return params;
  }

  async function loadData({
    append = false,
  }: {
    append?: boolean;
  } = {}) {
    const requestId =
      ++requestIdRef.current;

    /*
     * For a brand-new search/filter request,
     * cancel the previous one immediately.
     *
     * For "Show More", keep the current result set
     * and fetch only the next page.
     */
    if (!append) {
      requestRef.current?.abort();
    }

    const controller =
      new AbortController();

    if (!append) {
      requestRef.current =
        controller;
    }

    if (append) {
      setLoadingMore(true);
    } else if (
      groups.length === 0
    ) {
      setLoading(true);
    } else {
      /*
       * Keep the existing results visible while
       * the new search/filter request runs.
       */
      setSearching(true);
    }

    try {
      const offset =
        append
          ? groups.length
          : 0;

      const params =
        buildParams(offset);

      const res = await fetch(
        `/api/rpa-tracker?${params.toString()}`,
        {
          cache: "no-store",
          signal:
            controller.signal,
        }
      );

      if (!res.ok) {
        throw new Error(
          `Unable to load RPA Tracker (${res.status}).`
        );
      }

      const json: ApiResponse =
        await res.json();

      /*
       * An older request may finish after a newer
       * one. Only the newest non-append request is
       * allowed to replace the screen.
       */
      if (
        !append &&
        requestId !==
          requestIdRef.current
      ) {
        return;
      }

      const incomingGroups =
        json.groups || [];

      if (append) {
        setGroups(
          (current) => {
            const seen =
              new Set(
                current.map(
                  (group) =>
                    group.Slug
                )
              );

            const next =
              incomingGroups.filter(
                (group) =>
                  !seen.has(
                    group.Slug
                  )
              );

            return [
              ...current,
              ...next,
            ];
          }
        );
      } else {
        setGroups(
          incomingGroups
        );
      }

      setOptions(
        json.options || {
          sports: [],
          players: [],
          years: [],
          brands: [],
          variations: [],
        }
      );

      setMeta(
        json.meta || null
      );
    } catch (error: any) {
      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }

      console.error(
        "RPA Tracker load error:",
        error
      );
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        if (
          requestRef.current ===
          controller
        ) {
          requestRef.current =
            null;

          setLoading(false);
          setSearching(false);
        }
      }
    }
  }

  useEffect(() => {
    loadData();

    return () => {
      requestRef.current?.abort();
    };
  }, [
    search,
    sport,
    player,
    year,
    brand,
    variation,
    sort,
  ]);

  useEffect(() => {
    const q =
      searchParams.get("q") || "";

    setSearch(q);
  }, [searchParams]);

  function resetFilters() {
    setSearch("");
    setSport("");
    setPlayer("");
    setYear("");
    setBrand("");
    setVariation("");
    setSort("");
  }

  if (loading) {
    return (
      <TiffanyLoadingScreen
        message="Loading RPA Tracker..."
      />
    );
  }

  return (
    <section>
      <UniversalSearchBar
        defaultTarget="rpa"
      />

      {searching && (
        <div className="mt-4 text-center text-sm font-semibold text-blue-300">
          Searching...
        </div>
      )}

      <div className="mt-8">
        <SearchFilters
          theme={theme}
          sport={sport}
          setSport={setSport}
          player={player}
          setPlayer={setPlayer}
          year={year}
          setYear={setYear}
          brand={brand}
          setBrand={setBrand}
          variation={variation}
          setVariation={
            setVariation
          }
          sort={sort}
          setSort={setSort}
          options={options}
          onReset={
            resetFilters
          }
        />
      </div>

      <RegistryStats
        meta={meta}
        theme={theme}
        onContribute={() =>
          setShowContribute(
            true
          )
        }
      />

      <RegistryGrid
        groups={groups}
        theme={theme}
      />

      {meta?.hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            disabled={
              loadingMore
            }
            onClick={() =>
              loadData({
                append: true,
              })
            }
            className="rounded-lg border border-blue-500 bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMore
              ? "Loading..."
              : "Show More Registries"}
          </button>
        </div>
      )}

      <ContributionModal
        open={
          showContribute
        }
        onClose={() =>
          setShowContribute(
            false
          )
        }
        project="rpa-tracker"
        projectLabel="RPA Tracker"
        logoUrl={logoUrl}
        activeObject={{
          id:
            "rpa-tracker-main-page",
          title:
            "RPA Tracker Main Page",
        }}
      />
    </section>
  );
}