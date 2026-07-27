const ARROW = "\u2192";

type SourceDomain = {
  domains: string[];
  label: string;
};

/**
 * Central list of website labels used throughout
 * Tiffany Cards, Cards Alert, and RPA Tracker.
 *
 * Add future sources here so every page displays
 * them consistently.
 */
const SOURCE_DOMAINS: SourceDomain[] = [
  {
    domains: [
      "goldin.co",
    ],
    label: "Goldin",
  },
  {
    domains: [
      "ha.com",
      "heritageauctions.com",
    ],
    label: "Heritage",
  },
  {
    domains: [
      "pwccmarketplace.com",
      "pwcc.io",
    ],
    label: "PWCC",
  },
  {
    domains: [
      "fanaticscollect.com",
    ],
    label: "Fanatics Collect",
  },
  {
    domains: [
      "myslabs.com",
    ],
    label: "MySlabs",
  },
  {
    domains: [
      "comc.com",
    ],
    label: "COMC",
  },
  {
    domains: [
      "facebook.com",
      "fb.com",
    ],
    label: "Facebook",
  },
  {
    domains: [
      "instagram.com",
    ],
    label: "Instagram",
  },
  {
    domains: [
      "x.com",
      "twitter.com",
    ],
    label: "X",
  },
  {
    domains: [
      "cardladder.com",
    ],
    label: "CardLadder",
  },
  {
    domains: [
      "vintagecardprices.com",
    ],
    label: "VCP",
  },
  {
    domains: [
      "blowoutforums.com",
    ],
    label: "BlowOut",
  },
  {
    domains: [
      "net54baseball.com",
    ],
    label: "net54",
  },
  {
    domains: [
      "reddit.com",
    ],
    label: "reddit",
  },
  {
    domains: [
      "youtube.com",
      "youtu.be",
    ],
    label: "YouTube",
  },
  {
    domains: [
      "beckett.com",
    ],
    label: "Beckett",
  },
  {
    domains: [
      "psacard.com",
    ],
    label: "PSA",
  },
  {
    domains: [
      "gosgc.com",
      "sgccard.com",
    ],
    label: "SGC",
  },
  {
    domains: [
      "cgccards.com",
    ],
    label: "CGC",
  },
  {
    domains: [
      "tcdb.com",
    ],
    label: "TCDB",
  },
  {
    domains: [
      "buynicecards.com",
    ],
    label: "BuyNiceCards",
  },
  {
    domains: [
      "130point.com",
    ],
    label: "130point",
  },
  {
    domains: [
      "worthpoint.com",
    ],
    label: "WorthPoint",
  },
  {
    domains: [
      "robertedwardauctions.com",
    ],
    label: "REA",
  },
  {
    domains: [
      "memorylaneinc.com",
    ],
    label: "Memory Lane",
  },
  {
    domains: [
      "milehighcardco.com",
    ],
    label: "Mile High",
  },
  {
    domains: [
      "lelands.com",
    ],
    label: "Lelands",
  },
  {
    domains: [
      "scpauctions.com",
    ],
    label: "SCP Auctions",
  },
  {
    domains: [
      "pristineauction.com",
    ],
    label: "Pristine Auction",
  },
  {
    domains: [
      "sothebys.com",
    ],
    label: "Sotheby’s",
  },
  {
    domains: [
      "collectauctions.com",
    ],
    label: "Collect Auctions",
  },
  {
    domains: [
      "loveofgameauctions.com",
    ],
    label: "Love of the Game",
  },
  {
    domains: [
      "hugginsandscott.com",
    ],
    label: "Huggins & Scott",
  },
  {
    domains: [
      "whatnot.com",
    ],
    label: "Whatnot",
  },
  {
    domains: [
      "alt.xyz",
    ],
    label: "ALT",
  },
];

function getHostname(value: string) {
  const cleaned = String(value || "")
    .trim();

  if (!cleaned) {
    return "";
  }

  try {
    return new URL(cleaned)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    /*
     * Support stored addresses without https://,
     * such as cardladder.com.
     */
    try {
      return new URL(
        `https://${cleaned}`
      )
        .hostname
        .toLowerCase()
        .replace(/^www\./, "");
    } catch {
      return cleaned
        .toLowerCase()
        .replace(/^www\./, "")
        .split("/")[0]
        .split("?")[0]
        .split("#")[0];
    }
  }
}

function matchesDomain(
  hostname: string,
  domain: string
) {
  return (
    hostname === domain ||
    hostname.endsWith(
      `.${domain}`
    )
  );
}

function isEbayDomain(
  hostname: string
) {
  return (
    hostname === "ebay.com" ||
    hostname.startsWith("ebay.") ||
    hostname.includes(".ebay.")
  );
}

/**
 * Returns the standardized display label for a
 * source URL.
 */
export function sourceLabel(
  url: string
) {
  const hostname =
    getHostname(url);

  if (isEbayDomain(hostname)) {
    return `eBay ${ARROW}`;
  }

  for (
    const source of SOURCE_DOMAINS
  ) {
    const matched =
      source.domains.some(
        (domain) =>
          matchesDomain(
            hostname,
            domain
          )
      );

    if (matched) {
      return `${source.label} ${ARROW}`;
    }
  }

  /*
   * Preserve recognition of older Heritage, PWCC,
   * Fanatics, MySlabs, and COMC variations.
   */
  if (hostname.includes("heritage")) {
    return `Heritage ${ARROW}`;
  }

  if (hostname.includes("pwcc")) {
    return `PWCC ${ARROW}`;
  }

  if (hostname.includes("fanatics")) {
    return `Fanatics Collect ${ARROW}`;
  }

  if (hostname.includes("myslabs")) {
    return `MySlabs ${ARROW}`;
  }

  if (hostname.includes("comc")) {
    return `COMC ${ARROW}`;
  }

  return `View Source ${ARROW}`;
}