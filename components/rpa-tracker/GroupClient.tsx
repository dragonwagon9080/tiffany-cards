"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import UniversalPageHeader from "@/components/shared/UniversalPageHeader";
import ShareButton from "@/components/shared/ShareButton";
import ContributionModal from "@/components/tnce/ContributionModal";

import GroupFilters from "./GroupFilters";
import GroupRegistry from "./GroupRegistry";
import RegistryMap from "./RegistryMap";

type GroupData = {
  group: any;
  cards: any[];
  variations: any[];
};

function variationName(card: any) {
  return String(
    card.Variation_Input ||
      card.Variation ||
      "Base"
  ).trim();
}

export default function GroupClient({
  slug,
  logoUrl,
}: {
  slug: string;
  logoUrl?: string;
}) {
  const [data, setData] =
    useState<GroupData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [searchDraft, setSearchDraft] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [variation, setVariation] =
    useState("All");

  const [sortMode, setSortMode] =
    useState("serial");

  const [
    showRegistryMap,
    setShowRegistryMap,
  ] = useState(false);

  const [
    registrySelectionMode,
    setRegistrySelectionMode,
  ] = useState(false);

  const registryMapRef =
    useRef<HTMLDivElement>(null);

  const [
    showContribute,
    setShowContribute,
  ] = useState(false);

  const [
    contributionObject,
    setContributionObject,
  ] = useState<any>(null);

  const [
    contributionMode,
    setContributionMode,
  ] = useState<
    "new" | "update" | "missing"
  >("update");

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const res = await fetch(
          `/api/rpa-tracker?mode=group&slug=${encodeURIComponent(
            slug
          )}`,
          {
            cache: "no-store",
          }
        );

        if (!res.ok) {
          setData(null);
          return;
        }

        const json = await res.json();

        setData(json);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  const filteredCards = useMemo(() => {
    if (!data?.cards) {
      return [];
    }

    const query = search
      .trim()
      .toLowerCase();

    return data.cards.filter((card) => {
      const cardVariation =
        variationName(card);

      const variationMatch =
        variation &&
        variation !== "All"
          ? cardVariation === variation
          : true;

      const searchable = [
        cardVariation,
        card.Serial_Number,
        card.Grade,
        card.Cert_Number,
        card.Card_id,
      ]
        .join(" ")
        .toLowerCase();

      return query
        ? searchable.includes(query) &&
            variationMatch
        : variationMatch;
    });
  }, [data, search, variation]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          Loading Registry...
        </div>
      </main>
    );
  }

  if (!data?.group) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          Registry not found.
        </div>
      </main>
    );
  }

  const group = data.group;

  const title =
    group.Card_Title_Display ||
    group.Card_Title;

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <UniversalPageHeader
          section="RPA Tracker"
          title={title}
          defaultTarget="rpa"
        >
          <div className="mt-5 grid w-full grid-cols-1 gap-3 text-center sm:grid-cols-3 sm:items-center">
            <div className="flex justify-center sm:justify-start">
              <Link
                href="/rpa-tracker"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#d4af37] bg-[#9c7a2d] px-3 py-2 text-sm font-bold text-black transition hover:bg-[#b99236] sm:w-auto"
              >
                ← Back
              </Link>
            </div>

            <div className="text-lg font-bold leading-tight text-white sm:text-xl">
              {filteredCards.length} of{" "}
              {group.Count} tracked card
              {group.Count === 1
                ? ""
                : "s"}
            </div>

            <div className="flex justify-center gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setRegistrySelectionMode(
                    true
                  );

                  setShowRegistryMap(true);

                  window.setTimeout(() => {
                    registryMapRef.current?.scrollIntoView(
                      {
                        behavior: "smooth",
                        block: "start",
                      }
                    );
                  }, 50);
                }}
                className="inline-flex items-center justify-center rounded-xl border-2 border-blue-300 bg-blue-600 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg shadow-blue-900/40 transition hover:scale-105 hover:bg-blue-500"
              >
                📝 Submit Update
              </button>

              <ShareButton
                type="registry"
                title={title}
                url={`${
                  process.env
                    .NEXT_PUBLIC_SITE_URL ||
                  ""
                }/rpa-tracker/group/${
                  group.Slug
                }`}
              />
            </div>
          </div>
        </UniversalPageHeader>

        <GroupFilters
          searchDraft={searchDraft}
          setSearchDraft={setSearchDraft}
          onSearch={() =>
            setSearch(searchDraft)
          }
          variation={
            variation === "All"
              ? ""
              : variation
          }
          setVariation={(value) =>
            setVariation(value || "All")
          }
          sortMode={sortMode}
          setSortMode={setSortMode}
          variations={
            data.variations || []
          }
          registryTitle={title}
          onReset={() => {
            setSearchDraft("");
            setSearch("");
            setVariation("All");
            setSortMode("serial");
          }}
        />

        <div className="mb-5">
          <button
            type="button"
            onClick={() =>
              setShowRegistryMap(
                (current) => !current
              )
            }
            className="w-full rounded-lg border border-blue-700 bg-zinc-950 px-5 py-3 text-sm font-black uppercase tracking-wide text-blue-300 transition hover:border-blue-400 hover:text-blue-200"
          >
            {showRegistryMap
              ? "Hide Registry Map"
              : "Show Registry Map"}
          </button>
        </div>

        {showRegistryMap && (
          <div
            ref={registryMapRef}
            className="mb-8 scroll-mt-6"
          >
            {registrySelectionMode && (
              <div className="mb-3 flex flex-col gap-3 rounded-xl border border-blue-500/60 bg-blue-950/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-black text-white">
                    Select a card to
                    update or add
                  </div>

                  <div className="mt-1 text-sm text-neutral-400">
                    Blue cards are
                    tracked. Yellow cards
                    are missing.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setRegistrySelectionMode(
                      false
                    )
                  }
                  className="rounded-lg border border-neutral-700 bg-black px-4 py-2 text-xs font-bold uppercase tracking-wide text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}

            <RegistryMap
              variation={variation}
              cards={data.cards || []}
              description={
                group.Description || ""
              }
              showVariationPicker
              onVariationChange={
                setVariation
              }
              selectionMode={
                registrySelectionMode
              }
              selectionTitle={
                registrySelectionMode
                  ? "Select a card"
                  : undefined
              }
              onTrackedCardClick={(
                card
              ) => {
                setContributionMode(
                  "update"
                );

                setContributionObject(
                  card
                );

                setRegistrySelectionMode(
                  false
                );

                setShowContribute(true);
              }}
              onMissingCardClick={(
                missingCard
              ) => {
                setContributionMode(
                  "missing"
                );

                setContributionObject(
                  missingCard
                );

                setRegistrySelectionMode(
                  false
                );

                setShowContribute(true);
              }}
            />
          </div>
        )}

        <GroupRegistry
          cards={filteredCards}
          sortMode={sortMode}
        />
      </div>

      <ContributionModal
        open={showContribute}
        onClose={() =>
          setShowContribute(false)
        }
        mode={contributionMode}
        project="rpa-tracker"
        projectLabel="RPA Tracker"
        logoUrl={logoUrl}
        activeObject={
          contributionObject || group
        }
      />
    </main>
  );
}