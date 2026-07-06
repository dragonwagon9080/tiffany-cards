import type { Metadata } from "next";
import { Cinzel } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import {
  getCardSets,
  getNavigation,
  getSiteSettings,
  getSocials,
  getTheme,
} from "@/lib/cms";

import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import BackToTopButton from "@/components/site/BackToTopButton";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-cinzel",
});

const siteUrl = "https://www.tiffanycards.com";
const siteName = "Tiffany Cards";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tiffany Cards | Tiffany Card Research, Guides & Card Databases",
    template: "%s | Tiffany Cards",
  },
  description:
    "Tiffany Cards is a collector-focused research network for Topps Tiffany card guides, Cards Alert reports, and RPA Tracker card history.",
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: "Tiffany Cards | Tiffany Card Research, Guides & Card Databases",
    description:
      "Collector-focused research for Topps Tiffany cards, Cards Alert reports, and RPA Tracker card history.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiffany Cards | Tiffany Card Research, Guides & Card Databases",
    description:
      "Collector-focused research for Topps Tiffany cards, Cards Alert reports, and RPA Tracker card history.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "google-adsense-account": "ca-pub-7543808952594105",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const navigation = await getNavigation();
  const theme = await getTheme();
  const socials = await getSocials();
  const cardSets = await getCardSets();

  return (
    <html lang="en">
      <body className={cinzel.variable}>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JCY0CYJFQR"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JCY0CYJFQR');
          `}
        </Script>

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7543808952594105"
          crossOrigin="anonymous"
        />

        <SiteHeader
          settings={settings}
          navigation={navigation}
          theme={theme}
          cardSets={cardSets}
        />

        {children}

        <SiteFooter settings={settings} socials={socials} />

        <BackToTopButton />
      </body>
    </html>
  );
}