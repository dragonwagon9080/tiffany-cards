import { getHomepageSections, getSiteSettings, getTheme } from "@/lib/cms";
import RichText from "@/components/site/RichText";
import type { Metadata } from "next";

/* =========================================================
   TYPES
   ========================================================= */

type HomepageSection = {
  sort: string;
  type: string;
  title: string;
  subtitle?: string;
  content?: string;
  image_url?: string;
  card_image?: string;
  button_text?: string;
  button_link?: string;
  active?: string;
};

type SiteSettings = {
  seo_title?: string;
seo_description?: string;
default_seo_title?: string;
default_seo_description?: string;
  hero_border_image?: string;
  hero_border_mobile?: string;
  [key: string]: string | undefined;
};

type ThemeSection = {
  primary_color?: string;
  button_bg_color?: string;
  button_text_color?: string;
};

/* =========================================================
   MAIN HOMEPAGE
   ========================================================= */
export async function generateMetadata(): Promise<Metadata> {
  const settings: SiteSettings = await getSiteSettings();

  const title =
    settings.seo_title ||
    settings.default_seo_title ||
    "Tiffany Cards | Tiffany Card Research, Guides & Card Databases";

  const description =
    settings.seo_description ||
    settings.default_seo_description ||
    "Tiffany Cards is a collector-focused research network for Topps Tiffany card guides, Cards Alert reports, and RPA Tracker card history.";

  const siteUrl = "https://www.tiffanycards.com";

  return {
    title,
    description,
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: "Tiffany Cards",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function HomePage() {
  const sections: HomepageSection[] = await getHomepageSections();
  const settings: SiteSettings = await getSiteSettings();
  const theme = await getTheme();

  const tiffanyTheme: ThemeSection = theme?.tiffany || {};

  const hero = sections.find((section) => section.type === "hero");
  const textSections = sections.filter((section) => section.type === "text");
  const features = sections.filter((section) => section.type === "feature");

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      {hero && (
        <HeroSection
          hero={hero}
          settings={settings}
          tiffanyTheme={tiffanyTheme}
        />
      )}

      <ContentAndFeatureSection
        textSections={textSections}
        features={features}
        tiffanyTheme={tiffanyTheme}
      />
    </main>
  );
}

/* =========================================================
   HERO SECTION
   - Main homepage image
   - Desktop border image
   - Mobile border image
   - Title / subtitle / optional content / optional button
   ========================================================= */

function HeroSection({
  hero,
  settings,
  tiffanyTheme,
}: {
  hero: HomepageSection;
  settings: SiteSettings;
  tiffanyTheme: ThemeSection;
}) {
  return (
    <section className="bg-black px-4 py-4">
      <div className="relative w-full">
        <div className="relative">
          <HeroBorderImages settings={settings} />

          <div
            className="relative z-10 flex min-h-[280px] items-center justify-center overflow-hidden bg-cover bg-center text-center shadow-2xl md:min-h-[340px] lg:min-h-[375px]"
            style={{
              backgroundImage: hero.image_url
                ? `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url(${hero.image_url})`
                : "linear-gradient(135deg, #050505, #2a2112)",
            }}
          >
            <div className="relative z-20 mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-10 text-center">
              <h1 className="gold-title text-4xl uppercase tracking-[0.08em] md:text-6xl">
  {hero.title}
</h1>
              {hero.subtitle && (
                <p
  className="mt-5 text-lg font-semibold uppercase tracking-[0.18em] text-white md:text-2xl"
  style={{
    fontFamily: "Georgia, 'Times New Roman', serif",
    textShadow: "0 2px 6px rgba(0,0,0,.9)",
  }}
>
  {hero.subtitle}
</p>
              )}

              {hero.content && (
                <RichText
  content={hero.content}
  className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-100 [&_a]:text-[#d4af37] [&_a]:underline"
/>
              )}

              {hero.button_text && hero.button_link && (
                <a
                  href={hero.button_link}
                  className="mt-8 inline-block rounded-xl px-8 py-4 text-base font-bold uppercase tracking-widest shadow-lg transition hover:scale-105"
                  style={{
                    backgroundColor: tiffanyTheme.button_bg_color || "#d4af37",
                    color: tiffanyTheme.button_text_color || "#111827",
                  }}
                >
                  {hero.button_text}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   HERO BORDER IMAGES
   - Mobile uses hero_border_mobile
   - Tablet/Desktop uses hero_border_image
   ========================================================= */

function HeroBorderImages({ settings }: { settings: SiteSettings }) {
  return (
    <>
      {settings?.hero_border_mobile && (
        <img
          src={settings.hero_border_mobile}
          alt=""
          className="pointer-events-none absolute left-0 -top-1 z-30 block h-[104%] w-full object-fill md:hidden"
        />
      )}

      {settings?.hero_border_image && (
        <img
          src={settings.hero_border_image}
          alt=""
          className="pointer-events-none absolute left-0 -top-4 z-30 hidden h-[104%] w-full object-fill md:block"
        />
      )}
    </>
  );
}

/* =========================================================
   CONTENT + FEATURE CARD SECTION
   - Text sections appear first in their own full-width row
   - Feature cards appear below
   - Feature cards automatically create new rows
   - 4 cards per row on large screens
   ========================================================= */

function ContentAndFeatureSection({
  textSections,
  features,
  tiffanyTheme,
}: {
  textSections: HomepageSection[];
  features: HomepageSection[];
  tiffanyTheme: ThemeSection;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      {/* TEXT ROW */}
      <div className="mx-auto max-w-5xl text-center">
        <TextSections textSections={textSections} />
      </div>

      {/* FEATURE CARD GRID */}
      <div className="mt-12">
        <FeatureGrid features={features} tiffanyTheme={tiffanyTheme} />
      </div>
    </section>
  );
}

/* =========================================================
   TEXT SECTIONS
   ========================================================= */

function TextSections({
  textSections,
}: {
  textSections: HomepageSection[];
}) {
  return (
    <>
      {textSections.map((section) => (
        <div
          key={`${section.sort}-${section.title}`}
          className="mx-auto max-w-5xl"
        >
          {/* SECTION TITLE */}
          <h2 className="mb-8 text-center text-4xl font-bold text-black">
            {section.title}
          </h2>

          {/* SECTION CONTENT */}
          {section.content && (
            <RichText
              content={section.content}
              className="text-left text-lg leading-8 text-gray-800 [&_a]:font-semibold [&_a]:text-[#d4af37] [&_a]:underline"
            />
          )}

          {/* OPTIONAL BUTTON */}
          {section.button_text && section.button_link && (
            <div className="mt-8 text-center">
              <a
                href={section.button_link}
                className="inline-block rounded-lg bg-black px-6 py-3 font-bold uppercase tracking-wider text-white"
              >
                {section.button_text}
              </a>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/* =========================================================
   FEATURE GRID
   ========================================================= */

function FeatureGrid({
  features,
  tiffanyTheme,
}: {
  features: HomepageSection[];
  tiffanyTheme: ThemeSection;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {features.map((section) => (
        <FeatureCard
          key={`${section.sort}-${section.title}`}
          section={section}
          tiffanyTheme={tiffanyTheme}
        />
      ))}
    </div>
  );
}

/* =========================================================
   FEATURE CARD
   ========================================================= */

function FeatureCard({
  section,
  tiffanyTheme,
}: {
  section: HomepageSection;
  tiffanyTheme: ThemeSection;
}) {
  return (
    <a
      href={section.button_link || "#"}
      className="overflow-hidden rounded-lg border border-[#d4af37]/50 bg-black text-center shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
    >
      {(section.card_image || section.image_url) && (
        <img
          src={section.card_image || section.image_url}
          alt={section.title}
          className="h-52 w-full object-cover"
        />
      )}

      <div className="p-6">
        <h3
          className="text-2xl font-bold uppercase"
          style={{ color: tiffanyTheme.primary_color || "#d4af37" }}
        >
          {section.title}
        </h3>

        {section.subtitle && (
          <p className="mt-4 text-base leading-7 text-white">
            {section.subtitle}
          </p>
        )}

        {section.button_text && (
          <div
            className="mt-6 inline-block rounded-lg px-5 py-3 font-bold uppercase tracking-wider"
            style={{
              backgroundColor: tiffanyTheme.button_bg_color || "#d4af37",
              color: tiffanyTheme.button_text_color || "#111827",
            }}
          >
            {section.button_text}
          </div>
        )}
      </div>
    </a>
  );
}