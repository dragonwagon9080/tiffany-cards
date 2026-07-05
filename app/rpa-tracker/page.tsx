import { Suspense } from "react";

import { getPages, getSiteSettings, getTheme } from "@/lib/cms";

import PageHero from "@/components/site/PageHero";
import RPATrackerClient from "@/components/rpa-tracker/RPATrackerClient";

export default async function RPATrackerPage() {
  const settings = await getSiteSettings();
  const pages = await getPages();
  const theme = await getTheme();

  const page = pages.find((p: any) => p.slug === "rpa-tracker") || {};

  const rpaTheme = theme?.rpa_tracker || {};

  return (
    <main className="min-h-screen bg-black">
      <PageHero
        title={page.title}
        subtitle={page.subtitle}
        heroImage={page.hero_image}
        desktopBorder={page.border_image_desktop || settings.hero_border_image}
        mobileBorder={page.border_image_mobile || settings.hero_border_mobile}
        fallbackTitle="RPA Tracker"
      />

      <Suspense fallback={<RPATrackerLoading />}>
        <RPATrackerClient theme={rpaTheme} />
      </Suspense>
    </main>
  );
}

function RPATrackerLoading() {
  return (
    <section className="bg-black px-6 py-16 text-center text-white">
      Loading RPA Tracker...
    </section>
  );
}