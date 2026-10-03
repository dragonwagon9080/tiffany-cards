import { Suspense } from "react";

import { getCardsAlertLists } from "@/lib/cards-alert/lists";

import UniversalSearchBar from "@/components/shared/UniversalSearchBar";
import CardComparisonTool from "@/components/tools/card-comparison/CardComparisonTool";

export default async function CardComparisonPage() {
  const lists = await getCardsAlertLists();

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="px-4 pt-10 md:px-6 md:pt-12">
        <div className="mx-auto max-w-7xl">
          <Suspense
            fallback={
              <div className="py-6 text-center text-sm text-neutral-500">
                Loading search...
              </div>
            }
          >
            <UniversalSearchBar defaultTarget="tiffany" />
          </Suspense>
        </div>
      </section>

      <section className="px-4 pb-5 pt-5 text-center md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-xl font-black uppercase tracking-[0.18em] text-purple-500 md:text-2xl">
            Tools
          </div>

          <h1
            className="mt-2 text-3xl font-black uppercase leading-tight tracking-wide md:text-5xl"
            style={{
              background:
                "linear-gradient(to bottom, #fff3a6 0%, #e2c45a 35%, #b98b22 65%, #795407 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter:
                "drop-shadow(0 2px 3px rgba(183, 137, 32, 0.25))",
            }}
          >
            Card Comparison
          </h1>

          <p className="mx-auto mt-3 max-w-3xl text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 md:text-sm">
            Compare, align, and document trading cards
          </p>
        </div>
      </section>

      <CardComparisonTool
        sports={lists.sports}
        reasons={lists.reasons}
      />
    </main>
  );
}