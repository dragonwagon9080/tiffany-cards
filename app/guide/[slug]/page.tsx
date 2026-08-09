import type { Metadata } from "next";

import {
  getGuides,
  getInteractiveGuides,
  getInteractiveGuideChoices,
  getInteractiveGuideLinks,
  getPages,
} from "@/lib/cms";

import PageHero from "@/components/site/PageHero";
import InteractiveGuide from "./InteractiveGuide";

/* =========================================================
CONSTANTS
========================================================= */

const SITE_URL =
  "https://www.tiffanycards.com";

const TIFFANY_IDENTIFY_SLUG =
  "how-to-identify-a-topps-tiffany-card";

/* =========================================================
TYPES
========================================================= */

type Guide = {
  slug: string;
  title: string;
  subtitle?: string;
  total_steps?: string;

  seo_title?: string;
  seo_description?: string;

  hero_image?: string;
  image_url?: string;
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
HELPERS
========================================================= */

function cleanSlug(
  value: unknown
) {
  return decodeURIComponent(
    String(value ?? "")
  )
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function findGuide(
  guides: Guide[],
  slug: string
) {
  const target =
    cleanSlug(
      slug
    ).toLowerCase();

  return guides.find(
    (guide) =>
      cleanSlug(
        guide.slug
      ).toLowerCase() ===
      target
  );
}

function buildSeoTitle(
  guide: Guide
) {
  const slug =
    cleanSlug(
      guide.slug
    );

  if (
    slug ===
    TIFFANY_IDENTIFY_SLUG
  ) {
    return (
      guide.seo_title ||
      "How to Identify Topps Tiffany Cards | Tiffany Cards"
    );
  }

  return (
    guide.seo_title ||
    `${guide.title} | Tiffany Cards`
  );
}

function buildSeoDescription(
  guide: Guide
) {
  const slug =
    cleanSlug(
      guide.slug
    );

  if (
    slug ===
    TIFFANY_IDENTIFY_SLUG
  ) {
    return (
      guide.seo_description ||
      "Learn how to identify authentic Topps Tiffany cards and distinguish them from regular Topps cards with the Tiffany Cards interactive identification guide."
    );
  }

  return (
    guide.seo_description ||
    guide.subtitle ||
    `Explore ${guide.title} on Tiffany Cards.`
  );
}

/* =========================================================
SEO METADATA
========================================================= */

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata> {
  const { slug } =
    await params;

  const clean =
    cleanSlug(
      slug
    );

  const guides: Guide[] =
    await getGuides();

  const guide =
    findGuide(
      guides,
      clean
    );

  if (!guide) {
    return {
      title:
        "Guide Not Found | Tiffany Cards",

      description:
        "This Tiffany Cards guide could not be found.",

      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title =
    buildSeoTitle(
      guide
    );

  const description =
    buildSeoDescription(
      guide
    );

  const canonical =
    `${SITE_URL}/guide/${encodeURIComponent(
      clean
    )}`;

  const image =
    guide.hero_image ||
    guide.image_url ||
    "";

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

      siteName:
        "Tiffany Cards",

      type:
        "article",

      images: image
        ? [
            {
              url: image,
              alt:
                guide.title,
            },
          ]
        : [],
    },

    twitter: {
      card:
        "summary_large_image",

      title,
      description,

      images:
        image
          ? [image]
          : [],
    },
  };
}

/* =========================================================
GUIDE DETAIL PAGE
========================================================= */

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } =
    await params;

  const clean =
    cleanSlug(
      slug
    );

  const [
    guides,
    allSteps,
    allChoices,
    allLinks,
    pages,
  ] =
    await Promise.all([
      getGuides(),
      getInteractiveGuides(),
      getInteractiveGuideChoices(),
      getInteractiveGuideLinks(),
      getPages(),
    ]);

  const guidePage =
    pages.find(
      (
        page: CmsPage
      ) =>
        page.slug ===
          "guide" &&
        String(
          page.active
        ).toLowerCase() !==
          "false"
    );

  const guide =
    findGuide(
      guides,
      clean
    );

  /* =======================================================
  GUIDE NOT FOUND
  ======================================================= */

  if (!guide) {
    return (
      <main className="min-h-screen w-full bg-black text-white">
        {guidePage && (
          <PageHero
            title={
              guidePage.title
            }
            subtitle={
              guidePage.subtitle
            }
            heroImage={
              guidePage.hero_image ||
              guidePage.image_url ||
              ""
            }
            desktopBorder={
              guidePage.border_image_desktop ||
              ""
            }
            mobileBorder={
              guidePage.border_image_mobile ||
              ""
            }
            fallbackTitle="Guides"
          />
        )}

        <section className="w-full bg-black px-6 py-16 text-center">
          <div className="mx-auto max-w-7xl">
            <h1 className="gold-title text-4xl uppercase tracking-[0.08em] md:text-6xl">
              Guide Not Found
            </h1>

            <a
              href="/guide"
              className="mt-8 inline-block text-[#d4af37] underline"
            >
              Back to Guides
            </a>
          </div>
        </section>
      </main>
    );
  }

  /* =======================================================
  GUIDE PAGE
  ======================================================= */

  return (
    <main className="min-h-screen w-full bg-black text-white">
      {guidePage && (
        <PageHero
          title={
            guidePage.title
          }
          subtitle={
            guidePage.subtitle
          }
          heroImage={
            guidePage.hero_image ||
            guidePage.image_url ||
            ""
          }
          desktopBorder={
            guidePage.border_image_desktop ||
            ""
          }
          mobileBorder={
            guidePage.border_image_mobile ||
            ""
          }
          fallbackTitle="Guides"
        />
      )}

      {/* GUIDE TITLE */}

      <section className="w-full bg-black px-6 pb-8 pt-10 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="gold-title text-4xl uppercase tracking-[0.08em] md:text-6xl">
            {guide.title}
          </h1>

          {guide.subtitle && (
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-gray-300">
              {guide.subtitle}
            </p>
          )}
        </div>
      </section>

      {/* INTERACTIVE GUIDE */}

      <section className="w-full bg-black px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <InteractiveGuide
            steps={
              allSteps
            }
            choices={
              allChoices
            }
            links={
              allLinks
            }
            startingGuideSlug={
              guide.slug
            }
            totalSteps={
              Number(
                guide.total_steps ||
                  5
              )
            }
          />
        </div>
      </section>
    </main>
  );
}