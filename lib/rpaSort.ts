export type ParsedSerial = {
  numerator: number;
  denominator: number | null;
  unknownTotal: boolean;
};

export type RegistryRun = {
  id: string;
  variation: string;
  denominator: number | null;
  unknownTotal: boolean;
  expected: boolean;
  foundByNumber: Map<number, any>;
};

type ExpectedRegistryRun = {
  variation: string;
  denominator: number | null;
  unknownTotal: boolean;
};

const MAX_REGISTRY_MAP_SIZE = 1000;

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
  "printing plate black",
  "printing plate cyan",
  "printing plate magenta",
  "printing plate yellow",
  "printing plate",
  "printing plates",
  "black",
  "green",
  "gold",
  "red",
  "white",
  "base",
];

const STOP_LINE_PATTERNS = [
  /^https?:\/\//i,
  /^www\./i,
  /^beware\b/i,
  /^warning\b/i,
  /^important\b/i,
  /^note\b/i,
  /^check\s+out\b/i,
  /^learn\s+more\b/i,
  /^for\s+more\b/i,
  /^click\s+here\b/i,
  /^source\b/i,
];

export function variationName(card: any) {
  return String(
    card?.Variation_Input ||
      card?.Variation ||
      "Base"
  ).trim();
}

export function parseSerial(
  value: any
): ParsedSerial | null {
  const text = String(value || "").trim();

  const numberedMatch = text.match(
    /^(\d+)\s*\/\s*(\d+)$/i
  );

  if (numberedMatch) {
    return {
      numerator: Number(numberedMatch[1]),
      denominator: Number(numberedMatch[2]),
      unknownTotal: false,
    };
  }

  const unknownMatch = text.match(
    /^(\d+)\s*\/\s*(?:xx|x|\?|unknown)$/i
  );

  if (unknownMatch) {
    return {
      numerator: Number(unknownMatch[1]),
      denominator: null,
      unknownTotal: true,
    };
  }

  return null;
}

export function normalizeVariationKey(
  value: string
) {
  let text = String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\bprinting\s+plates?\b/g, "printing plate")
    .replace(/\s+/g, " ")
    .trim();

  const plateColorMatch = text.match(
    /\b(black|cyan|magenta|yellow)\b/
  );

  if (
    plateColorMatch &&
    text.includes("printing plate")
  ) {
    return `printing plate ${plateColorMatch[1]}`;
  }

  return text
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function specialOneOfOneRank(
  variation: string
) {
  const text = normalizeVariationKey(variation);

  const index =
    SPECIAL_ONE_OF_ONE_ORDER.findIndex(
      (name) => text.includes(name)
    );

  return index === -1 ? 999 : index;
}

export function compareRegistryRuns(
  a: RegistryRun,
  b: RegistryRun
) {
  const aIsOneOfOne = a.denominator === 1;
  const bIsOneOfOne = b.denominator === 1;

  if (aIsOneOfOne && !bIsOneOfOne) {
    return -1;
  }

  if (!aIsOneOfOne && bIsOneOfOne) {
    return 1;
  }

  if (aIsOneOfOne && bIsOneOfOne) {
    const specialA = specialOneOfOneRank(
      a.variation
    );

    const specialB = specialOneOfOneRank(
      b.variation
    );

    if (specialA !== specialB) {
      return specialA - specialB;
    }
  }

  if (
    a.denominator === null &&
    b.denominator !== null
  ) {
    return 1;
  }

  if (
    a.denominator !== null &&
    b.denominator === null
  ) {
    return -1;
  }

  if (
    a.denominator !== null &&
    b.denominator !== null &&
    a.denominator !== b.denominator
  ) {
    return a.denominator - b.denominator;
  }

  return a.variation.localeCompare(
    b.variation,
    undefined,
    {
      sensitivity: "base",
      numeric: true,
    }
  );
}

function stripHtml(value: string) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, "")
    .trim();
}

function splitOutsideParentheses(
  value: string
) {
  const pieces: string[] = [];

  let current = "";
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === "(") {
      depth += 1;
      current += character;
      continue;
    }

    if (character === ")") {
      depth = Math.max(0, depth - 1);
      current += character;
      continue;
    }

    if (
      depth === 0 &&
      (character === "," || character === ".")
    ) {
      const trimmed = current.trim();

      if (trimmed) {
        pieces.push(trimmed);
      }

      current = "";
      continue;
    }

    current += character;
  }

  const trimmed = current.trim();

  if (trimmed) {
    pieces.push(trimmed);
  }

  return pieces;
}

function isStopLine(value: string) {
  const text = String(value || "").trim();

  return STOP_LINE_PATTERNS.some((pattern) =>
    pattern.test(text)
  );
}

function isNotTracking(value: string) {
  return /\(\s*not\s+tracking\s*\)/i.test(
    value
  );
}

function expandPrintingPlates(
  variation: string,
  denominators: number[]
): ExpectedRegistryRun[] | null {
  const plateMatch = variation.match(
    /^(.*?)printing\s+plates?\s*\(\s*([^)]*)\s*\)\s*$/i
  );

  if (!plateMatch) {
    return null;
  }

  const prefix = plateMatch[1].trim();

  const colors = plateMatch[2]
    .split(",")
    .map((color) => color.trim())
    .filter(Boolean);

  const plateDenominators =
    denominators.length > 0
      ? denominators
      : [1];

  const results: ExpectedRegistryRun[] = [];

  colors.forEach((color) => {
    plateDenominators.forEach(
      (denominator) => {
        const plateName = [
          prefix,
          "Printing Plate",
          color,
        ]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        results.push({
          variation: plateName,
          denominator,
          unknownTotal: false,
        });
      }
    );
  });

  return results;
}

function parseChecklistEntry(
  value: string
): ExpectedRegistryRun[] | null {
  const original = String(value || "").trim();

  if (!original) {
    return null;
  }

  if (isNotTracking(original)) {
    return [];
  }

  const cleaned = original
    .replace(/\(\s*not\s+tracking\s*\)/gi, "")
    .trim();

  /*
   * Match one or more print runs at the end:
   *
   * Base /99
   * NFL Shield /1
   * NFL Shield 1/1
   * Stars & Stripes /25 /13 /10 /1 /1
   */
  const runMatch = cleaned.match(
    /^(.*?)(\s+(?:(?:\/\s*\d+)|(?:1\s*\/\s*1))(?:\s+(?:(?:\/\s*\d+)|(?:1\s*\/\s*1)))*)\s*$/i
  );

  if (runMatch) {
    const variation = runMatch[1].trim();

    const denominatorMatches =
      runMatch[2].match(
        /\/\s*(\d+)|1\s*\/\s*1/gi
      ) || [];

    const denominators =
      denominatorMatches.map((run) => {
        if (/^1\s*\/\s*1$/i.test(run.trim())) {
          return 1;
        }

        const match = run.match(/\/\s*(\d+)/);

        return match ? Number(match[1]) : 1;
      });

    if (!variation || !denominators.length) {
      return null;
    }

    const expandedPlates =
      expandPrintingPlates(
        variation,
        denominators
      );

    if (expandedPlates) {
      return expandedPlates;
    }

    return denominators
      .filter(
        (denominator) =>
          denominator > 0 &&
          denominator <= MAX_REGISTRY_MAP_SIZE
      )
      .map((denominator) => ({
        variation,
        denominator,
        unknownTotal: false,
      }));
  }

  /*
   * The only intentionally unnumbered checklist entry
   * currently supported is Base.
   *
   * Example:
   * Base, Refractor /10
   */
  if (/^base$/i.test(cleaned)) {
    return [
      {
        variation: "Base",
        denominator: null,
        unknownTotal: true,
      },
    ];
  }

  return null;
}

export function parseRegistryDescription(
  description: string
): ExpectedRegistryRun[] {
  const text = stripHtml(description);

  if (!text) {
    return [];
  }

  const lines = text.split("\n");

  const expected: ExpectedRegistryRun[] = [];
  let parsingStarted = false;
  let shouldStop = false;

  for (const rawLine of lines) {
    if (shouldStop) {
      break;
    }

    const line = rawLine.trim();

    if (!line) {
      if (parsingStarted) {
        break;
      }

      continue;
    }

    if (isStopLine(line)) {
      break;
    }

    const pieces =
      splitOutsideParentheses(line);

    for (const piece of pieces) {
      const parsed = parseChecklistEntry(piece);

      if (parsed === null) {
        if (parsingStarted) {
          shouldStop = true;
          break;
        }

        continue;
      }

      parsingStarted = true;
      expected.push(...parsed);
    }
  }

  return expected;
}

function createRunId(
  variation: string,
  denominator: number | null,
  occurrence: number
) {
  const denominatorKey =
    denominator === null ? "unknown" : denominator;

  return `${normalizeVariationKey(
    variation
  )}__${denominatorKey}__${occurrence}`;
}

function matchesActiveVariation(
  variation: string,
  activeVariation: string
) {
  if (
    !activeVariation ||
    activeVariation === "All"
  ) {
    return true;
  }

  return (
    normalizeVariationKey(variation) ===
    normalizeVariationKey(activeVariation)
  );
}

export function buildRegistryRuns(
  cards: any[],
  activeVariation = "All",
  description = ""
) {
  const expectedRuns =
    parseRegistryDescription(description);

  const runs: RegistryRun[] = [];

  const occurrenceCounts = new Map<
    string,
    number
  >();

  expectedRuns.forEach((expected) => {
    const baseKey = `${normalizeVariationKey(
      expected.variation
    )}__${
      expected.denominator === null
        ? "unknown"
        : expected.denominator
    }`;

    const occurrence =
      occurrenceCounts.get(baseKey) || 0;

    occurrenceCounts.set(
      baseKey,
      occurrence + 1
    );

    runs.push({
      id: createRunId(
        expected.variation,
        expected.denominator,
        occurrence
      ),
      variation: expected.variation,
      denominator: expected.denominator,
      unknownTotal: expected.unknownTotal,
      expected: true,
      foundByNumber: new Map<number, any>(),
    });
  });

  cards.forEach((card) => {
    const cardVariation = variationName(card);
    const serial = parseSerial(
      card.Serial_Number
    );

    if (!serial) {
      return;
    }

    if (
      serial.denominator !== null &&
      (serial.denominator <= 0 ||
        serial.denominator >
          MAX_REGISTRY_MAP_SIZE)
    ) {
      return;
    }

    const variationKey =
      normalizeVariationKey(cardVariation);

    const matchingRuns = runs.filter(
      (run) =>
        normalizeVariationKey(
          run.variation
        ) === variationKey &&
        run.denominator === serial.denominator
    );

    /*
     * Duplicate anonymous runs such as:
     *
     * Stars & Stripes /1 /1
     *
     * are filled in order.
     */
    let targetRun = matchingRuns.find(
      (run) =>
        !run.foundByNumber.has(
          serial.numerator
        )
    );

    if (
      serial.denominator === 1 &&
      matchingRuns.length > 1
    ) {
      targetRun =
        matchingRuns.find(
          (run) => run.foundByNumber.size === 0
        ) || matchingRuns[0];
    }

    if (!targetRun) {
      const baseKey = `${variationKey}__${
        serial.denominator === null
          ? "unknown"
          : serial.denominator
      }`;

      const occurrence =
        occurrenceCounts.get(baseKey) || 0;

      occurrenceCounts.set(
        baseKey,
        occurrence + 1
      );

      targetRun = {
        id: createRunId(
          cardVariation,
          serial.denominator,
          occurrence
        ),
        variation: cardVariation,
        denominator: serial.denominator,
        unknownTotal:
          serial.denominator === null,
        expected: false,
        foundByNumber: new Map<
          number,
          any
        >(),
      };

      runs.push(targetRun);
    }

    targetRun.foundByNumber.set(
      serial.numerator,
      card
    );
  });

  return runs
    .filter((run) =>
      matchesActiveVariation(
        run.variation,
        activeVariation
      )
    )
    .sort(compareRegistryRuns);
}

export function compareCardsByRegistryOrder(
  a: any,
  b: any
) {
  const serialA = parseSerial(
    a?.Serial_Number
  ) || {
    numerator: 999999,
    denominator: null,
    unknownTotal: true,
  };

  const serialB = parseSerial(
    b?.Serial_Number
  ) || {
    numerator: 999999,
    denominator: null,
    unknownTotal: true,
  };

  const aIsOneOfOne =
    serialA.denominator === 1;

  const bIsOneOfOne =
    serialB.denominator === 1;

  if (aIsOneOfOne && !bIsOneOfOne) {
    return -1;
  }

  if (!aIsOneOfOne && bIsOneOfOne) {
    return 1;
  }

  if (aIsOneOfOne && bIsOneOfOne) {
    const specialA = specialOneOfOneRank(
      variationName(a)
    );

    const specialB = specialOneOfOneRank(
      variationName(b)
    );

    if (specialA !== specialB) {
      return specialA - specialB;
    }
  }

  if (
    serialA.denominator === null &&
    serialB.denominator !== null
  ) {
    return 1;
  }

  if (
    serialA.denominator !== null &&
    serialB.denominator === null
  ) {
    return -1;
  }

  if (
    serialA.denominator !== null &&
    serialB.denominator !== null &&
    serialA.denominator !==
      serialB.denominator
  ) {
    return (
      serialA.denominator -
      serialB.denominator
    );
  }

  const variationSort = variationName(
    a
  ).localeCompare(
    variationName(b),
    undefined,
    {
      sensitivity: "base",
      numeric: true,
    }
  );

  if (variationSort !== 0) {
    return variationSort;
  }

  return (
    serialA.numerator -
    serialB.numerator
  );
}