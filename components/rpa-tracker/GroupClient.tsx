"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import UniversalPageHeader from "@/components/shared/UniversalPageHeader";

import GroupFilters from "./GroupFilters";
import GroupRegistry from "./GroupRegistry";
import RegistryMap from "./RegistryMap";
import ShareButton from "@/components/shared/ShareButton";

type GroupData = {
  group: any;
  cards: any[];
  variations: any[];
};

export default function GroupClient({ slug }: { slug: string }) {
  const [data, setData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [variation, setVariation] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);

      const res = await fetch(
        `/api/rpa-tracker?mode=group&slug=${encodeURIComponent(slug)}`,
        { cache: "no-store" }
      );

      const json = await res.json();

      setData(json);
      setLoading(false);
    }

    load();
  }, [slug]);

  const filteredCards = useMemo(() => {
    if (!data?.cards) return [];

    const q = search.trim().toLowerCase();

    return data.cards.filter((card) => {
      const cardVariation = card.Variation_Input || card.Variation || "Base";
      const variationMatch = variation ? cardVariation === variation : true;

      const searchable = [
        cardVariation,
        card.Serial_Number,
        card.Grade,
        card.Cert_Number,
        card.Card_id,
      ]
        .join(" ")
        .toLowerCase();

      return q ? searchable.includes(q) && variationMatch : variationMatch;
    });
  }, [data, search, variation]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">Loading Registry...</div>
      </main>
    );
  }

  if (!data?.group) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">Registry not found.</div>
      </main>
    );
  }

  const group = data.group;
  const title = group.Card_Title_Display || group.Card_Title;
  const selectedVariation = variation || data.variations?.[0]?.name || "Base";

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
              {group.Count} tracked card{group.Count === 1 ? "" : "s"}
            </div>

            <div className="flex justify-center sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
              <ShareButton
                type="registry"
                title={title}
                url={`${process.env.NEXT_PUBLIC_SITE_URL || ""}/rpa-tracker/group/${group.Slug}`}
              />
            </div>
          </div>
        </UniversalPageHeader>

        <GroupFilters
          searchDraft={searchDraft}
          setSearchDraft={setSearchDraft}
          onSearch={() => setSearch(searchDraft)}
          variation={variation}
          setVariation={setVariation}
          variations={data.variations || []}
          registryTitle={title}
          onReset={() => {
            setSearchDraft("");
            setSearch("");
            setVariation("");
          }}
        />

        <RegistryMap
          variation={variation || selectedVariation}
          cards={data.cards}
          showVariationPicker
        />

        <GroupRegistry cards={filteredCards} />
      </div>
    </main>
  );
}