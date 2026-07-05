"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import SearchFilters from "./SearchFilters";
import RegistryGrid from "./RegistryGrid";
import RegistryStats from "./RegistryStats";
import Loading from "./Loading";
import UniversalSearchBar from "@/components/shared/UniversalSearchBar";

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

export default function RPATrackerClient({
  theme,
}: {
  theme: TrackerTheme;
}) {
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || "";

  const [groups, setGroups] = useState<RegistryGroup[]>([]);
  const [options, setOptions] = useState<FilterOptions>({
    sports: [],
    players: [],
    years: [],
    brands: [],
    variations: [],
  });

  const [meta, setMeta] = useState<TrackerMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(initialQuery);

  const [sport, setSport] = useState("");
  const [player, setPlayer] = useState("");
  const [year, setYear] = useState("");
  const [brand, setBrand] = useState("");
  const [variation, setVariation] = useState("");
  const [sort, setSort] = useState("");

  async function loadData() {
    setLoading(true);

    const params = new URLSearchParams();

    params.set("mode", search.trim() ? "filter" : "startup");

    if (search.trim()) params.set("q", search.trim());
    if (sport) params.set("sport", sport);
    if (player) params.set("player", player);
    if (year) params.set("year", year);
    if (brand) params.set("brand", brand);
    if (variation) params.set("variation", variation);
    if (sort) params.set("sort", sort);

    const res = await fetch(`/api/rpa-tracker?${params.toString()}`, {
      cache: "no-store",
    });

    const json: ApiResponse = await res.json();

    setGroups(json.groups || []);
    setOptions(json.options || {
      sports: [],
      players: [],
      years: [],
      brands: [],
      variations: [],
    });
    setMeta(json.meta || null);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [search, sport, player, year, brand, variation, sort]);

  useEffect(() => {
    const q = searchParams.get("q") || "";
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
    return <Loading />;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <UniversalSearchBar defaultTarget="rpa" />

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
    setVariation={setVariation}
    sort={sort}
    setSort={setSort}
    options={options}
    onReset={resetFilters}
  />
</div>

<RegistryStats meta={meta} theme={theme} />

<RegistryGrid groups={groups} theme={theme} />

    </section>
  );
}