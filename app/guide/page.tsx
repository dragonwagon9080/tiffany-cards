import { getGuides, getPages } from "@/lib/cms";
import RichText from "@/components/site/RichText";
import PageHero from "@/components/site/PageHero";
import PageContent from "@/components/site/PageContent";

/* =========================================================
   TYPES
   ========================================================= */

type Guide = {
  slug: string;
  title: string;
  subtitle?: string;
  card_image?: string;
  sort_order?: string;
  active?: string;
};

type CmsPage = {
  slug: string;
  title: string;
  subtitle?: string;
  content?: string;
  image_url?: string;
  hero_image?: string;
  border_image_desktop?: string;
  border_image_mobile?: string;
  active?: string;
};

/* =========================================================
   GUIDES MAIN PAGE
   ========================================================= */

export default async function GuidesPage() {
  const guides: Guide[] = await getGuides();
  const pages: CmsPage[] = await getPages();

  const pageContent = pages.find(
    (page) =>
      page.slug === "guide" &&
      String(page.active).toLowerCase() !== "false"
  );

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      {pageContent && (
        <PageHero
          title={pageContent.title}
          subtitle={pageContent.subtitle}
          heroImage={pageContent.hero_image || pageContent.image_url || ""}
          desktopBorder={pageContent.border_image_desktop || ""}
          mobileBorder={pageContent.border_image_mobile || ""}
          fallbackTitle="Guides"
        />
      )}

      <PageContent>
  <GuidesIntro pageContent={pageContent} />
</PageContent>

      <section className="bg-black py-16">
        <div className="mx-auto max-w-7xl px-6">
          <GuideCardGrid guides={guides} />
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   INTRO TEXT SECTION
   ========================================================= */

function GuidesIntro({ pageContent }: { pageContent?: CmsPage }) {
  return (
    <div className="mx-auto max-w-5xl text-center">
      {pageContent?.content && (
        <RichText
          content={pageContent.content}
          className="text-left text-lg leading-8 text-gray-800 [&_a]:font-semibold [&_a]:text-[#d4af37] [&_a]:underline"
        />
      )}
    </div>
  );
}

/* =========================================================
   GUIDE CARD GRID
   ========================================================= */

function GuideCardGrid({ guides }: { guides: Guide[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
      {guides.map((guide) => (
        <GuideCard key={guide.slug} guide={guide} />
      ))}
    </div>
  );
}

/* =========================================================
   GUIDE CARD
   ========================================================= */

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <a href={`/guide/${guide.slug}`} className="group block text-center">
      <div className="mx-auto flex max-w-[230px] items-center justify-center">
        {guide.card_image ? (
          <img
            src={guide.card_image}
            alt={guide.title}
            className="max-h-[320px] w-full rounded-lg object-contain shadow-xl transition duration-300 group-hover:scale-105 group-hover:shadow-2xl"
          />
        ) : (
          <div className="flex h-[300px] w-full items-center justify-center rounded-lg border border-[#d4af37] bg-neutral-900 px-4 text-center text-xl font-bold text-[#d4af37]">
            {guide.title}
          </div>
        )}
      </div>

      <div className="mt-5 text-base font-bold uppercase tracking-wide text-[#d4af37] transition duration-300 group-hover:text-white">
        {guide.title}
      </div>

      <div className="mx-auto mt-2 h-[2px] w-0 bg-[#d4af37] transition-all duration-300 group-hover:w-3/4" />

      {guide.subtitle && (
        <p className="mx-auto mt-3 max-w-[260px] text-sm leading-6 text-gray-300">
          {guide.subtitle}
        </p>
      )}
    </a>
  );
}