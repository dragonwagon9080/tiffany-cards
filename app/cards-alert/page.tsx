import { Suspense } from "react";

import {
  getPages,
  getSiteSettings,
  getCardsAlertStatuses,
  getTheme,
} from "@/lib/cms";

import PageHero from "@/components/site/PageHero";
import CardsAlertClient from "@/components/cards-alert/CardsAlertClient";

export default async function CardsAlertPage() {
  const settings = await getSiteSettings();
  const pages = await getPages();
  const theme = await getTheme();

  const statuses = await getCardsAlertStatuses();

  const page = pages.find((p: any) => p.slug === "cards-alert") || {};
  const cardsAlertTheme = theme?.cards_alert || {};

  return (
    <main className="min-h-screen bg-black">
      <PageHero
        title={page.title}
        subtitle={page.subtitle}
        heroImage={page.hero_image}
        desktopBorder={page.border_image_desktop || settings.hero_border_image}
        mobileBorder={page.border_image_mobile || settings.hero_border_mobile}
        fallbackTitle="Cards Alert"
      />

      <Suspense fallback={<CardsAlertLoading />}>
        <CardsAlertClient theme={cardsAlertTheme} statuses={statuses} />
      </Suspense>
    </main>
  );
}

function CardsAlertLoading() {
  return (
    <section className="bg-black px-6 py-16 text-center text-white">
      Loading Cards Alert...
    </section>
  );
}