export type Marketplace =
  | "ebay"
  | "goldin"
  | "heritage"
  | "fanatics"
  | "pwcc"
  | "myslabs"
  | "comc"
  | "facebook"
  | "instagram"
  | "x"
  | "reddit"
  | "unknown";

export function detectMarketplace(
  url: string
): Marketplace {
  const text = String(url || "").toLowerCase();

  if (text.includes("ebay.")) return "ebay";

  if (text.includes("goldin.co"))
    return "goldin";

  if (
    text.includes("ha.com") ||
    text.includes("heritageauctions.com")
  )
    return "heritage";

  if (
    text.includes("fanaticscollect.com")
  )
    return "fanatics";

  if (text.includes("pwcc"))
    return "pwcc";

  if (text.includes("myslabs"))
    return "myslabs";

  if (text.includes("comc"))
    return "comc";

  if (
    text.includes("facebook.com") ||
    text.includes("fb.com")
  )
    return "facebook";

  if (
    text.includes("instagram.com")
  )
    return "instagram";

  if (
    text.includes("twitter.com") ||
    text.includes("x.com")
  )
    return "x";

  if (text.includes("reddit.com"))
    return "reddit";

  return "unknown";
}