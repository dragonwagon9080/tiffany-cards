export type ParsedSubject = {
  firstName: string;
  lastName: string;
  displayName: string;
  isPerson: boolean;
};

const SPORTS_CATEGORIES = [
  "BASEBALL",
  "BASKETBALL",
  "FOOTBALL",
  "HOCKEY",
  "SOCCER",
  "GOLF",
  "BOXING",
  "MMA",
  "RACING",
  "TENNIS",
  "WRESTLING",
];

const NON_SPORTS_CATEGORIES = [
  "TCG",
  "POKEMON",
  "POKÉMON",
  "MAGIC",
  "YUGIOH",
  "YU-GI-OH",
  "MARVEL",
  "STAR WARS",
  "DISNEY",
  "LORCANA",
  "ENTERTAINMENT",
  "NON-SPORT",
  "NON SPORT",
];

function cleanSubject(
  value: unknown
) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSubject(
  subject: string,
  category: string
): ParsedSubject {
  const cleanedSubject =
    cleanSubject(subject);

  if (!cleanedSubject) {
    return {
      firstName: "",
      lastName: "",
      displayName: "",
      isPerson: false,
    };
  }

  const upperCategory =
    cleanSubject(category)
      .toUpperCase();

  const isExplicitlyNonSports =
    NON_SPORTS_CATEGORIES.some(
      (value) =>
        upperCategory.includes(
          value
        )
    );

  if (isExplicitlyNonSports) {
    return {
      firstName:
        cleanedSubject,

      lastName: "",

      displayName:
        cleanedSubject,

      isPerson: false,
    };
  }

  const isSportsCard =
    SPORTS_CATEGORIES.some(
      (sport) =>
        upperCategory.includes(
          sport
        )
    );

  if (!isSportsCard) {
    return {
      firstName:
        cleanedSubject,

      lastName: "",

      displayName:
        cleanedSubject,

      isPerson: false,
    };
  }

  const parts =
    cleanedSubject
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 1) {
    return {
      firstName:
        parts[0],

      lastName: "",

      displayName:
        cleanedSubject,

      isPerson: true,
    };
  }

  return {
    firstName:
      parts
        .slice(0, -1)
        .join(" "),

    lastName:
      parts.at(-1) || "",

    displayName:
      cleanedSubject,

    isPerson: true,
  };
}