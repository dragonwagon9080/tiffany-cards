import Script from "next/script";

export default function EbaySmartLinks() {
  return (
    <>
      <Script
        id="ebay-smart-links-config"
        strategy="afterInteractive"
      >
        {`
          window._epn = {
            campaign: 5339176379,
            smartPopover: false
          };
        `}
      </Script>

      <Script
        id="ebay-smart-links"
        src="https://epnt.ebay.com/static/epn-smart-tools.js"
        strategy="lazyOnload"
      />
    </>
  );
}