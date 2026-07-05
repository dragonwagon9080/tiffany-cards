import {
  getGuides,
  getInteractiveGuides,
  getInteractiveGuideChoices,
  getInteractiveGuideLinks,
  getPages,
} from "@/lib/cms";

import PageHero from "@/components/site/PageHero";
import PageContent from "@/components/site/PageContent";
import InteractiveGuide from "./InteractiveGuide";

/* =========================================================
   TYPES
   ========================================================= */

type Guide = {
  slug: string;
  title: string;
  subtitle?: string;
  total_steps?: string;
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

type GuideStep = {
  guide_slug: string;
  step: string;
  title: string;
  description?: string;
  layout?: string;
  result_image?: string;
  sort_order?: string;
  active?: string;
};

type GuideChoice = {
  guide_slug: string;
  step: string;
  choice_label: string;
  choice_image?: string;
  choice_alt?: string;
  choice_description?: string;
  next_guide_slug?: string;
  next_step?: string;
  sort_order?: string;
  active?: string;
};

type GuideLink = {
  guide_slug: string;
  step: string;
  link_title: string;
  link_image?: string;
  link_url: string;
  link_description?: string;
  sort_order?: string;
  active?: string;
};

/* =========================================================
   GUIDE DETAIL PAGE
   ========================================================= */

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const guides: Guide[] = await getGuides();
  const allSteps: GuideStep[] = await getInteractiveGuides();
  const allChoices: GuideChoice[] = await getInteractiveGuideChoices();
  const allLinks: GuideLink[] = await getInteractiveGuideLinks();
  const pages: CmsPage[] = await getPages();

  const guidePage = pages.find(
    (page) =>
      page.slug === "guide" &&
      String(page.active).toLowerCase() !== "false"
  );

  const guide = guides.find((g) => String(g.slug).trim() === slug);

  if (!guide) {
    return (
      <main className="min-h-screen bg-black text-white">
        {guidePage && (
          <PageHero
            title={guidePage.title}
            subtitle={guidePage.subtitle}
            heroImage={guidePage.hero_image || guidePage.image_url || ""}
            desktopBorder={guidePage.border_image_desktop || ""}
            mobileBorder={guidePage.border_image_mobile || ""}
            fallbackTitle="Guides"
          />
        )}

        <PageContent className="text-center">
          <h1 className="gold-title text-4xl uppercase tracking-[0.08em] md:text-6xl">
            Guide Not Found
          </h1>

          <a
            href="/guide"
            className="mt-8 inline-block text-[#d4af37] underline"
          >
            Back to Guides
          </a>
        </PageContent>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {guidePage && (
        <PageHero
          title={guidePage.title}
          subtitle={guidePage.subtitle}
          heroImage={guidePage.hero_image || guidePage.image_url || ""}
          desktopBorder={guidePage.border_image_desktop || ""}
          mobileBorder={guidePage.border_image_mobile || ""}
          fallbackTitle="Guides"
        />
      )}

      <PageContent className="text-center">
        <h1 className="gold-title text-4xl uppercase tracking-[0.08em] md:text-6xl">
          {guide.title}
        </h1>

        {guide.subtitle && (
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-gray-300">
            {guide.subtitle}
          </p>
        )}
      </PageContent>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <InteractiveGuide
          steps={allSteps}
          choices={allChoices}
          links={allLinks}
          startingGuideSlug={guide.slug}
          totalSteps={Number(guide.total_steps || 5)}
        />
      </section>
    </main>
  );
}