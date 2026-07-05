import {
  getCardSetContent,
  getCardSetKeyCards,
  getCardSets,
  getTheme,
} from "@/lib/cms";
import RichText from "@/components/site/RichText";
import ImageCarousel from "@/components/site/ImageCarousel";
import PageHero from "@/components/site/PageHero";
import type { Metadata } from "next";

/* =========================================================
   TYPES
   ========================================================= */

type CardSet = {
  slug: string;
  name: string;
  subtitle?: string;
  year_start?: string;
  sport?: string;
  brand?: string;
  button_image?: string;
  hero_image?: string;
  border_image_desktop?: string;
  border_image_mobile?: string;
  checklist_buttons?: string;
  summary?: string;
  description?: string;
  gallery_images?: string;
  seo_title?: string;
  seo_description?: string;
  sort_order?: string;
  active?: string;
};

type CardSetSection = {
  set_slug: string;
  section_name: string;
  layout: string;
  content?: string;
  image_urls?: string;
  sort_order?: string;
  active?: string;
};

type KeyCard = {
  set_slug: string;
  card_number: string;
  player_name: string;
  image_url?: string;
  affiliate_url?: string;
  sort_order?: string;
  active?: string;
};

type ThemeSection = {
  primary_color?: string;
  button_bg_color?: string;
  button_text_color?: string;
};

/* =========================================================
   CARD SET DETAIL PAGE
   ========================================================= */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const cardSets: CardSet[] = await getCardSets();

  const cardSet = cardSets.find((set) => set.slug === slug);

  if (!cardSet) {
    return {
      title: "Card Set Not Found | Tiffany Cards",
      description: "The requested card set could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title =
    cardSet.seo_title?.trim() ||
    `${cardSet.name} | Tiffany Cards`;

  const description =
    cardSet.seo_description?.trim() ||
    cardSet.summary?.trim() ||
    cardSet.description?.replace(/<[^>]*>/g, "").slice(0, 160) ||
    `Learn about ${cardSet.name} including checklists, identification guides, key cards, and collector information.`;

  const canonical = `https://www.tiffanycards.com/card-sets/${cardSet.slug}`;

  const images = cardSet.hero_image
    ? [
        {
          url: cardSet.hero_image,
          width: 1920,
          height: 500,
          alt: cardSet.name,
        },
      ]
    : [];

  return {
    title,
    description,

    alternates: {
      canonical,
    },

    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Tiffany Cards",
      type: "website",
      images,
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: cardSet.hero_image ? [cardSet.hero_image] : [],
    },
  };
}

export default async function CardSetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cardSets: CardSet[] = await getCardSets();
  const allSections: CardSetSection[] = await getCardSetContent();
  const allKeyCards: KeyCard[] = await getCardSetKeyCards();
  const theme = await getTheme();

  const tiffanyTheme: ThemeSection = theme?.tiffany || {};

  const cardSet = cardSets.find((set) => set.slug === slug);

  if (!cardSet) {
    return (
      <main className="min-h-screen bg-[#f7f3ea] px-6 py-20 text-center">
        <h1 className="gold-title text-4xl uppercase tracking-[0.08em] md:text-6xl">
          Card Set Not Found
        </h1>

        <a
          href="/card-sets"
          className="mt-8 inline-block rounded-lg bg-black px-6 py-3 font-bold uppercase tracking-wide text-[#d4af37]"
        >
          Back To Card Sets
        </a>
      </main>
    );
  }

  const sections = allSections
    .filter((section) => section.set_slug === cardSet.slug)
    .sort((a, b) => Number(a.sort_order || 9999) - Number(b.sort_order || 9999));

  const keyCards = allKeyCards
    .filter((card) => card.set_slug === cardSet.slug)
    .sort((a, b) => Number(a.sort_order || 9999) - Number(b.sort_order || 9999));

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <PageHero
        title={cardSet.name}
        subtitle={cardSet.subtitle}
        heroImage={cardSet.hero_image || ""}
        desktopBorder={cardSet.border_image_desktop || ""}
        mobileBorder={cardSet.border_image_mobile || ""}
        fallbackTitle={cardSet.name || "Card Set"}
      />

      <ChecklistButtons cardSet={cardSet} tiffanyTheme={tiffanyTheme} />

      <DynamicSections
        sections={sections}
        keyCards={keyCards}
        tiffanyTheme={tiffanyTheme}
      />

      <BackToCardSets />
    </main>
  );
}

/* =========================================================
   CHECKLIST BUTTONS
   ========================================================= */

function ChecklistButtons({
  cardSet,
  tiffanyTheme,
}: {
  cardSet: CardSet;
  tiffanyTheme: ThemeSection;
}) {
  const buttons = parseChecklistButtons(cardSet.checklist_buttons);

  if (!buttons.length) return null;

  return (
    <section className="bg-black px-6 py-8">
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {buttons.map((button) => (
          <a
            key={`${button.label}-${button.url}`}
            href={button.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[#d4af37] bg-[#111] px-5 py-4 text-center text-sm font-bold uppercase tracking-widest text-[#d4af37] shadow-lg transition hover:bg-[#d4af37] hover:text-black"
            style={{
              borderColor: tiffanyTheme.primary_color || "#d4af37",
            }}
          >
            {button.label}
          </a>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   DYNAMIC SECTIONS
   ========================================================= */

function DynamicSections({
  sections,
  keyCards,
  tiffanyTheme,
}: {
  sections: CardSetSection[];
  keyCards: KeyCard[];
  tiffanyTheme: ThemeSection;
}) {
  return (
    <>
      {sections.map((section, index) => {
        if (section.layout === "key-cards") {
          return (
            <KeyCardsSection
              key={`${section.section_name}-${index}`}
              section={section}
              keyCards={keyCards}
              tiffanyTheme={tiffanyTheme}
            />
          );
        }

        if (section.layout === "registry") {
          return (
            <RegistrySection
              key={`${section.section_name}-${index}`}
              section={section}
            />
          );
        }

        return (
          <TextCarouselSection
            key={`${section.section_name}-${index}`}
            section={section}
          />
        );
      })}
    </>
  );
}

/* =========================================================
   TEXT + CAROUSEL SECTION
   - Same background color for all sections
   - Black divider between sections
   - Section title supports HTML via RichText
   ========================================================= */

function TextCarouselSection({ section }: { section: CardSetSection }) {
  const images = splitUrls(section.image_urls);

  return (
    <section className="border-t-4 border-black bg-[#f7f3ea] py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_1.15fr] lg:items-center">
        <div>
          <RichText
            content={section.section_name}
            className="mb-6 text-4xl font-bold leading-tight text-black [&_a]:text-[#d4af37] [&_a]:underline [&_h1]:text-4xl [&_h1]:font-bold [&_h2]:text-4xl [&_h2]:font-bold"
          />

          {section.content && (
            <RichText
              content={section.content}
              className="text-lg leading-8 text-gray-800 [&_a]:font-semibold [&_a]:text-[#d4af37] [&_a]:underline"
            />
          )}
        </div>

        {images.length > 0 && (
          <div className="flex w-full items-center justify-center">
            <ImageCarousel
              images={images}
              title={stripHtml(section.section_name)}
            />
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   KEY CARDS SECTION
   ========================================================= */

function KeyCardsSection({
  section,
  keyCards,
}: {
  section: CardSetSection;
  keyCards: KeyCard[];
  tiffanyTheme: ThemeSection;
}) {
  return (
    <section className="border-t-4 border-black bg-[#f7f3ea] py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-5xl text-center">
          <RichText
            content={section.section_name}
            className="mb-6 text-4xl font-bold leading-tight text-black [&_a]:text-[#d4af37] [&_a]:underline [&_h1]:text-4xl [&_h1]:font-bold [&_h2]:text-4xl [&_h2]:font-bold"
          />

          {section.content && (
            <RichText
              content={section.content}
              className="text-left text-lg leading-8 text-gray-800 [&_a]:font-semibold [&_a]:text-[#d4af37] [&_a]:underline"
            />
          )}

          <AffiliateDisclosure />
        </div>

        {keyCards.length > 0 && (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {keyCards.map((card) => (
              <KeyCardButton
                key={`${card.card_number}-${card.player_name}`}
                card={card}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   AFFILIATE DISCLOSURE
   ========================================================= */

function AffiliateDisclosure() {
  return (
    <div className="mx-auto mt-8 max-w-4xl rounded-lg border border-[#d4af37]/60 bg-black px-5 py-4 text-left text-sm leading-6 text-gray-100">
      <strong className="text-[#d4af37]">Affiliate Disclosure:</strong>{" "}
      Some card links may be affiliate links. If you click a link and make a
      purchase, TiffanyCards.com may earn a commission at no additional cost to
      you.
    </div>
  );
}

/* =========================================================
   KEY CARD BUTTON
   ========================================================= */

function KeyCardButton({ card }: { card: KeyCard }) {
  const content = (
    <>
      {card.image_url && (
        <img
          src={card.image_url}
          alt={`${card.card_number} ${card.player_name}`}
          className="h-64 w-full rounded-lg object-contain transition group-hover:scale-105"
        />
      )}

      <div className="mt-4 text-center">
        <div className="text-sm font-bold uppercase tracking-widest text-[#d4af37]">
          #{card.card_number}
        </div>
        <div className="mt-1 text-base font-semibold text-white">
          {card.player_name}
        </div>
      </div>
    </>
  );

  if (card.affiliate_url) {
    return (
      <a
        href={card.affiliate_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="group block rounded-xl border border-[#d4af37]/40 bg-black p-4 shadow-lg transition hover:-translate-y-1 hover:border-[#d4af37]"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="group block rounded-xl border border-[#d4af37]/40 bg-black p-4 shadow-lg">
      {content}
    </div>
  );
}

/* =========================================================
   REGISTRY SECTION
   ========================================================= */

function RegistrySection({ section }: { section: CardSetSection }) {
  return (
    <section className="border-t-4 border-black bg-[#f7f3ea] py-16">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <RichText
          content={section.section_name}
          className="mb-6 text-4xl font-bold leading-tight text-black [&_a]:text-[#d4af37] [&_a]:underline [&_h1]:text-4xl [&_h1]:font-bold [&_h2]:text-4xl [&_h2]:font-bold"
        />

        {section.content && (
          <RichText
            content={section.content}
            className="text-left text-lg leading-8 text-gray-800 [&_a]:font-semibold [&_a]:text-[#d4af37] [&_a]:underline"
          />
        )}
      </div>
    </section>
  );
}

/* =========================================================
   BACK LINK
   ========================================================= */

function BackToCardSets() {
  return (
    <section className="border-t-4 border-black bg-[#f7f3ea] px-6 py-12 text-center">
      <a
        href="/card-sets"
        className="inline-block rounded-lg bg-black px-6 py-3 font-bold uppercase tracking-wider text-[#d4af37] transition hover:bg-[#d4af37] hover:text-black"
      >
        ← Back To Card Sets
      </a>
    </section>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function splitUrls(value?: string) {
  if (!value) return [];

  return String(value)
    .split(/\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function parseChecklistButtons(value?: string) {
  if (!value) return [];

  return String(value)
    .split(/\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [label, url] = row.split("|").map((part) => part.trim());

      return {
        label,
        url,
      };
    })
    .filter((button) => button.label && button.url)
    .slice(0, 4);
}

function stripHtml(value?: string) {
  if (!value) return "";

  return String(value).replace(/<[^>]*>/g, "");
}