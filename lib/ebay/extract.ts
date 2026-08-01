import {
  createHash,
} from "crypto";

import type {
  ListingFingerprint,
} from "./types";

export function cleanExtractedValue(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

/**
 * Attempts to extract a grading-company certification
 * number from a listing title or description.
 *
 * This intentionally requires a grading-company label
 * or words such as "cert" or "certification" to reduce
 * false positives.
 */
export function extractCertNumber(
  value: unknown
) {
  const text =
    cleanExtractedValue(
      value
    );

  if (!text) {
    return "";
  }

  const patterns = [
    /\b(?:PSA|BGS|BECKETT|SGC|CGC|CSG)\s*(?:CERT(?:IFICATE|IFICATION)?|SERIAL|NO\.?|#)?\s*[:#-]?\s*(\d{6,12})\b/i,

    /\b(?:CERT(?:IFICATE|IFICATION)?|CERT\s*NO\.?|CERT\s*#)\s*[:#-]?\s*(\d{6,12})\b/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      text.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

/**
 * Extracts serial-number formats such as:
 *
 * 15/99
 * 01 / 10
 * 1 of 1
 * numbered 23 of 99
 */
export function extractSerialNumber(
  value: unknown
) {
  const text =
    cleanExtractedValue(
      value
    );

  if (!text) {
    return "";
  }

  const slashMatch =
    text.match(
      /(?:^|[\s#([{-])(\d{1,5})\s*\/\s*(\d{1,5})(?=$|[\s)\]},.!?-])/i
    );

  if (
    slashMatch?.[1] &&
    slashMatch?.[2]
  ) {
    return `${Number(
      slashMatch[1]
    )}/${Number(
      slashMatch[2]
    )}`;
  }

  const ofMatch =
    text.match(
      /\b(?:numbered\s*)?(\d{1,5})\s+(?:of|out\s+of)\s+(\d{1,5})\b/i
    );

  if (
    ofMatch?.[1] &&
    ofMatch?.[2]
  ) {
    return `${Number(
      ofMatch[1]
    )}/${Number(
      ofMatch[2]
    )}`;
  }

  return "";
}

/**
 * Extracts the stable image identifier from common
 * eBay image URLs.
 *
 * Example:
 * https://i.ebayimg.com/images/g/AbCd1234/s-l1600.webp
 *
 * Returns:
 * AbCd1234
 */
export function extractImageId(
  value: unknown
) {
  const imageUrl =
    cleanExtractedValue(
      value
    );

  if (!imageUrl) {
    return "";
  }

  const imagePathMatch =
    imageUrl.match(
      /\/images\/g\/([^/?#]+)(?:\/|$)/i
    );

  if (
    imagePathMatch?.[1]
  ) {
    return imagePathMatch[1];
  }

  const pictureMatch =
    imageUrl.match(
      /\/([^/?#]+)\.(?:jpg|jpeg|png|webp)(?:[?#]|$)/i
    );

  if (
    pictureMatch?.[1]
  ) {
    return pictureMatch[1];
  }

  return "";
}

function normalizedFingerprintValue(
  value: unknown
) {
  return cleanExtractedValue(
    value
  ).toLowerCase();
}

/**
 * Produces a deterministic hash for one exact listing.
 *
 * The Apps Script monitor will also compare the individual
 * fingerprint fields separately. That separate comparison
 * is what allows a new listing ID to be recognized as a
 * relist of a previously reviewed card.
 */
export function buildFingerprintHash(
  fingerprint:
    Partial<ListingFingerprint>
) {
  const source = [
    normalizedFingerprintValue(
      fingerprint.listingId
    ),

    normalizedFingerprintValue(
      fingerprint.legacyListingId
    ),

    normalizedFingerprintValue(
      fingerprint.seller
    ),

    normalizedFingerprintValue(
      fingerprint.certNumber
    ),

    normalizedFingerprintValue(
      fingerprint.serialNumber
    ),

    normalizedFingerprintValue(
      fingerprint.imageId
    ),
  ].join("|");

  return createHash(
    "sha256"
  )
    .update(source)
    .digest("hex");
}