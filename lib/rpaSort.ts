export type RegistryRun = {
  variation: string;
  denominator: number;
  foundByNumber: Map<number, any>;
};

const SPECIAL_ONE_OF_ONE_ORDER = [
  "logoman",
  "nfl shield",
  "shield",
  "superfractor",
  "gold vinyl",
  "laundry tag",
  "bat knob",
  "nameplate",
  "championship tag",
  "brand logo",
  "logo",
  "printing plate",
  "printing plates",
  "black",
  "green",
  "gold",
  "red",
  "white",
  "base",
];

export function variationName(card: any) {
  return String(card?.Variation_Input || card?.Variation || "Base").trim();
}

export function parseSerial(value: any) {
  const match = String(value || "").match(/(\d+)\s*\/\s*(\d+)/);

  if (!match) return null;

  return {
    numerator: Number(match[1]),
    denominator: Number(match[2]),
  };
}

export function specialOneOfOneRank(variation: string) {
  const text = String(variation || "").toLowerCase();

  const index = SPECIAL_ONE_OF_ONE_ORDER.findIndex((name) =>
    text.includes(name)
  );

  return index === -1 ? 999 : index;
}

export function compareRegistryRuns(a: RegistryRun, b: RegistryRun) {
  const aIsOneOfOne = a.denominator === 1;
  const bIsOneOfOne = b.denominator === 1;

  if (aIsOneOfOne && !bIsOneOfOne) return -1;
  if (!aIsOneOfOne && bIsOneOfOne) return 1;

  if (aIsOneOfOne && bIsOneOfOne) {
    const specialA = specialOneOfOneRank(a.variation);
    const specialB = specialOneOfOneRank(b.variation);

    if (specialA !== specialB) return specialA - specialB;
  }

  if (a.denominator !== b.denominator) {
    return a.denominator - b.denominator;
  }

  return a.variation.localeCompare(b.variation, undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

export function buildRegistryRuns(cards: any[], activeVariation = "All") {
  const runs = new Map<string, RegistryRun>();

  cards.forEach((card) => {
    const cardVariation = variationName(card);

    if (activeVariation !== "All" && cardVariation !== activeVariation) return;

    const serial = parseSerial(card.Serial_Number);
    if (!serial) return;
    if (!serial.denominator || serial.denominator > 250) return;

    const key = `${cardVariation}__${serial.denominator}`;

    if (!runs.has(key)) {
      runs.set(key, {
        variation: cardVariation,
        denominator: serial.denominator,
        foundByNumber: new Map<number, any>(),
      });
    }

    runs.get(key)?.foundByNumber.set(serial.numerator, card);
  });

  return Array.from(runs.values()).sort(compareRegistryRuns);
}

export function compareCardsByRegistryOrder(a: any, b: any) {
  const serialA = parseSerial(a?.Serial_Number) || {
    numerator: 999999,
    denominator: 999999,
  };

  const serialB = parseSerial(b?.Serial_Number) || {
    numerator: 999999,
    denominator: 999999,
  };

  const aIsOneOfOne = serialA.denominator === 1;
  const bIsOneOfOne = serialB.denominator === 1;

  if (aIsOneOfOne && !bIsOneOfOne) return -1;
  if (!aIsOneOfOne && bIsOneOfOne) return 1;

  if (aIsOneOfOne && bIsOneOfOne) {
    const specialA = specialOneOfOneRank(variationName(a));
    const specialB = specialOneOfOneRank(variationName(b));

    if (specialA !== specialB) return specialA - specialB;
  }

  if (serialA.denominator !== serialB.denominator) {
    return serialA.denominator - serialB.denominator;
  }

  const variationSort = variationName(a).localeCompare(variationName(b), undefined, {
    sensitivity: "base",
    numeric: true,
  });

  if (variationSort !== 0) return variationSort;

  return serialA.numerator - serialB.numerator;
}