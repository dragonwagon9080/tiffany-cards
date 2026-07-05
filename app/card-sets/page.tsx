import { getCardSets, getPages, getTheme } from "@/lib/cms";
import RichText from "@/components/site/RichText";
import PageHero from "@/components/site/PageHero";
import PageContent from "@/components/site/PageContent";

/* =========================================================
   TYPES
   ========================================================= */

type CardSet = {
  slug: string;
  name: string;
  year_start?: string;
  year_end?: string;
  brand?: string;
  button_image?: string;
  hero_image?: string;
  summary?: string;
  description?: string;
  badge_text?: string;
  sort_order?: string;
  active?: string;
  seo_title?: string;
  seo_description?: string;
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

type ThemeSection = {
  primary_color?: string;
  button_bg_color?: string;
  button_text_color?: string;
};

/* =========================================================
   CARD SETS MAIN PAGE
   ========================================================= */

export default async function CardSetsPage() {
  const cardSets: CardSet[] = await getCardSets();
  const pages: CmsPage[] = await getPages();
  const theme = await getTheme();

  const tiffanyTheme: ThemeSection = theme?.tiffany || {};

  const pageContent = pages.find(
    (page) =>
      page.slug === "card-sets" &&
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
          fallbackTitle="Card Sets"
        />
      )}

      <PageContent>
  <CardSetsIntro pageContent={pageContent} />
</PageContent>

      <section className="bg-black py-16">
        <div className="mx-auto max-w-7xl px-6">
          <CardSetButtonGrid
            cardSets={cardSets}
            tiffanyTheme={tiffanyTheme}
          />
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   INTRO TEXT SECTION
   ========================================================= */

function CardSetsIntro({ pageContent }: { pageContent?: CmsPage }) {
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
   ROUND CARD SET BUTTON GRID
   ========================================================= */

function CardSetButtonGrid({
  cardSets,
  tiffanyTheme,
}: {
  cardSets: CardSet[];
  tiffanyTheme: ThemeSection;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-8 gap-y-10">
      {cardSets.map((set) => (
        <CardSetButton
          key={set.slug}
          set={set}
          tiffanyTheme={tiffanyTheme}
        />
      ))}
    </div>
  );
}

/* =========================================================
   ROUND CARD SET BUTTON
   ========================================================= */

function CardSetButton({
  set,
  tiffanyTheme,
}: {
  set: CardSet;
  tiffanyTheme: ThemeSection;
}) {
  return (
    <a
      href={`/card-sets/${set.slug}`}
      className="group flex w-32 flex-col items-center text-center sm:w-36 md:w-40"
    >
      <div className="relative flex h-32 w-32 items-center justify-center rounded-full shadow-xl transition duration-300 group-hover:scale-105 group-hover:shadow-2xl sm:h-36 sm:w-36 md:h-40 md:w-40">
        {set.button_image ? (
          <img
            src={set.button_image}
            alt={set.name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span
            className="px-4 text-center text-xl font-bold"
            style={{ color: tiffanyTheme.primary_color || "#d4af37" }}
          >
            {set.badge_text || set.name}
          </span>
        )}
      </div>

      <div className="mt-4 text-base font-bold uppercase tracking-wide text-[#d4af37] transition group-hover:text-white">
        {set.badge_text || set.name}
      </div>
    </a>
  );
}