"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const NO_AD_PATHS = [
  "/admin",
  "/tnce",
  "/contribute",
];

export default function AdSenseScript() {
  const pathname = usePathname();

  const shouldHideAds = NO_AD_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  );

  if (shouldHideAds) {
    return null;
  }

  return (
    <Script
      id="google-adsense"
      async
      strategy="afterInteractive"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7543808952594105"
      crossOrigin="anonymous"
    />
  );
}