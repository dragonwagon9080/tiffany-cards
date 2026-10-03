import { Suspense } from "react";
import Link from "next/link";

import {
  getPages,
  getSiteSettings,
} from "@/lib/cms";

import PageHero from "@/components/site/PageHero";
import UniversalSearchBar from "@/components/shared/UniversalSearchBar";

const tools = [
  {
    title: "Card Comparison",
    description:
      "Upload and compare two cards side-by-side with synchronized zoom, pan, and annotations. Highlight differences, mark similarities, and save your comparisons.",
    href: "/tools/card-comparison",
    icon: "⇄",
    image:
      "https://storage.googleapis.com/tiffanycards/website/tools/Card%20Compare.png",
    buttonLabel: "Open Card Comparison Tool",
    available: true,
  },
  {
  title: "eBay Best Image Finder",
  description:
    "Find the highest quality images from eBay listings. Enter an eBay URL to quickly locate and view the best available card images.",
  href: "/tools/ebay-image-finder",
  icon: "⌕",
  image:
    "https://storage.googleapis.com/tiffanycards/website/tools/eBay%20Finder.png",
  buttonLabel: "Open eBay Best Image Finder",
  available: true,
},
];

export default async function ToolsPage() {
  const [settings, pages] = await Promise.all([
    getSiteSettings(),
    getPages(),
  ]);

  const page =
    pages.find(
      (item: any) => item.slug === "tools"
    ) || {};

  return (
    <main className="min-h-screen bg-black">
      {/* MAIN TOOLS HERO */}
      <PageHero
        title={page.title}
        subtitle={page.subtitle}
        heroImage={page.hero_image}
        desktopBorder={
          page.border_image_desktop ||
          settings.hero_border_image
        }
        mobileBorder={
          page.border_image_mobile ||
          settings.hero_border_mobile
        }
        fallbackTitle="Tools"
      />

      {/* SEARCH DATABASE */}
      <section className="bg-black px-4 pt-3 text-white md:px-6">
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

      {/* TOOLS */}
      <section className="bg-black px-4 pb-14 pt-6 text-white md:px-6 md:pb-16 md:pt-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            {tools.map((tool) => {
              const card = (
                <div
                  className={`group relative flex h-full flex-col overflow-hidden rounded-xl border bg-[#111113] p-5 transition-all duration-300 md:p-6 ${
                    tool.available
                      ? "border-purple-700/70 hover:-translate-y-1 hover:border-purple-400 hover:shadow-[0_0_28px_rgba(147,51,234,0.25)]"
                      : "border-purple-900/60"
                  }`}
                >
                  {/* ICON / STATUS */}
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-purple-500 bg-purple-950/80 text-2xl font-black text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.18)]">
                      {tool.icon}
                    </div>

                    {!tool.available && (
                      <span className="rounded-full border border-purple-700 bg-purple-950/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-purple-300">
                        Coming Soon
                      </span>
                    )}
                  </div>

                  {/* TITLE */}
                  <h3 className="text-xl font-black uppercase tracking-wide text-white transition-colors group-hover:text-purple-200 md:text-2xl">
                    {tool.title}
                  </h3>

                  {/* DESCRIPTION */}
                  <p className="mt-2 min-h-[72px] text-sm leading-6 text-neutral-300 md:text-base">
                    {tool.description}
                  </p>

                  {/* PREVIEW IMAGE */}
                  <div className="mt-4 overflow-hidden rounded-lg border border-purple-950 bg-black">
                    <img
                      src={tool.image}
                      alt={`${tool.title} preview`}
                      className={`aspect-[16/9] w-full object-cover transition-transform duration-500 ${
                        tool.available
                          ? "group-hover:scale-[1.025]"
                          : ""
                      }`}
                    />
                  </div>

                  {/* BUTTON */}
                  <div className="mt-5">
                    {tool.available ? (
                      <div className="flex w-full items-center justify-center gap-3 rounded-lg border border-purple-500 bg-gradient-to-r from-purple-700 via-purple-600 to-purple-700 px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-white shadow-[0_0_18px_rgba(147,51,234,0.22)] transition-all group-hover:border-purple-300 group-hover:shadow-[0_0_24px_rgba(168,85,247,0.38)] md:text-sm">
                        {tool.buttonLabel}

                        <span
                          aria-hidden="true"
                          className="transition-transform group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </div>
                    ) : (
                      <div className="flex w-full items-center justify-center gap-3 rounded-lg border border-purple-900 bg-purple-950/40 px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-purple-400 md:text-sm">
                        Coming Soon
                      </div>
                    )}
                  </div>
                </div>
              );

              return tool.available ? (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="block h-full"
                >
                  {card}
                </Link>
              ) : (
                <div
                  key={tool.href}
                  className="h-full"
                >
                  {card}
                </div>
              );
            })}
          </div>

          {/* DISCLAIMER */}
          <div className="mx-auto mt-8 max-w-5xl border-t border-neutral-800 pt-5 text-center text-xs leading-5 text-neutral-500">
            Tiffany Cards tools are intended to assist collectors with research
            and visual comparison. Results should be considered alongside other
            available evidence when evaluating a card.
          </div>
        </div>
      </section>
    </main>
  );
}