export function findVariationInTitle(
  title: string,
  variations: string[]
) {
  const normalizedTitle = String(title || "").toLowerCase();

  /*
   * Remove blanks and duplicates.
   */
  const candidates = Array.from(
    new Set(
      variations
        .map((v) => String(v).trim())
        .filter(Boolean)
    )
  );

  /*
   * Longest first so
   * Premium Gold beats Gold.
   */
  candidates.sort(
    (a, b) => b.length - a.length
  );

  for (const variation of candidates) {
    if (
      normalizedTitle.includes(
        variation.toLowerCase()
      )
    ) {
      return variation;
    }
  }

  return "";
}