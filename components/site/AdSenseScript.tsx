"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const TNCE_PATHS = [
  "/admin/tnce",
  "/tnce",
  "/contribute",
];

export default function AdSenseScript() {
  const pathname = usePathname();

  const isTNCE = TNCE_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  );

  if (isTNCE) {
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