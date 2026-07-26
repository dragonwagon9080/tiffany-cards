export type AuctionAspects = Record<string, string[]>;

export type ParsedAuctionTitle = {
  year: string;
  firstName: string;
  lastName: string;
  cardNumber: string;
  brand: string;
  parallel: string;
  sport: string;
  serialNumber: string;
  grade: string;
  gradingCompany: string;
};

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUnavailable(value: unknown) {
  return /^(?:not\s*available|notavailable|does\s*not\s*apply|n\/?a|none|unknown|unspecified)$/i.test(
    clean(value),
  );
}

function normalizedKey(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function aspectValue(
  aspects: AuctionAspects | undefined,
  names: string[],
) {
  if (!aspects || typeof aspects !== "object") {
    return "";
  }

  const wanted = new Set(names.map(normalizedKey));

  for (const [name, values] of Object.entries(aspects)) {
    if (!wanted.has(normalizedKey(name))) {
      continue;
    }

    const value = Array.isArray(values)
      ? values.map(clean).find(Boolean)
      : clean(values);

    if (value && !isUnavailable(value)) {
      return value;
    }
  }

  return "";
}

function parseSerialNumber(title: string) {
  const match = title.match(
    /(?:#|no\.?\s*)?(\d{1,5})\s*\/\s*(\d{1,5})\b/i,
  );

  if (!match) {
    return "";
  }

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);

  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator < 0 ||
    denominator < 1 ||
    numerator > denominator
  ) {
    return "";
  }

  return `${numerator}/${denominator}`;
}

function parseGrade(title: string) {
  const companyPattern =
    "BECKETT|PSA|BGS|SGC|CGC|CSG|TAG|HGA";

  const match = title.match(
    new RegExp(
      `\\b(${companyPattern})\\s*(?:MINT|GEM\\s*MINT|PRISTINE)?\\s*(10(?:\\.0)?|[1-9](?:\\.5|\\.0)?)\\b`,
      "i",
    ),
  );

  if (!match) {
    return {
      grade: "",
      gradingCompany: "",
    };
  }

  let gradingCompany = match[1].toUpperCase();

  if (gradingCompany === "BECKETT") {
    gradingCompany = "BGS";
  }

  return {
    grade: `${gradingCompany} ${Number(match[2])}`,
    gradingCompany,
  };
}

function parseYear(title: string, aspects?: AuctionAspects) {
  const fromAspects = aspectValue(aspects, [
    "Year",
    "Season",
    "Card Year",
  ]);

  const aspectMatch = fromAspects.match(/\b(19|20)\d{2}\b/);

  if (aspectMatch) {
    return aspectMatch[0];
  }

  return title.match(/\b(19|20)\d{2}\b/)?.[0] || "";
}

function parseCardNumber(title: string, aspects?: AuctionAspects) {
  const fromAspects = aspectValue(aspects, [
    "Card Number",
    "Card No.",
    "Card No",
    "Number",
  ]);

  if (fromAspects && !isUnavailable(fromAspects)) {
    return fromAspects.replace(/^#\s*/, "").trim();
  }

  return (
    title.match(
      /(?:card\s*(?:number|no\.?)\s*|#)([A-Z0-9][A-Z0-9.-]*)\b/i,
    )?.[1] || ""
  );
}

function splitPlayerName(value: string) {
  let player = clean(value)
    .split(/\s*(?:\/|&|,?\s+and\s+)\s*/i)[0]
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

  if (!player) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  if (player.includes(",")) {
    const [last, ...firstParts] = player.split(",");

    return {
      firstName: clean(firstParts.join(" ")),
      lastName: clean(last),
    };
  }

  const parts = player.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return {
      firstName: "",
      lastName: player,
    };
  }

  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" "),
  };
}

function parsePlayerFromTitle(
  title: string
) {
  const yearMatch =
    title.match(/\b(?:19|20)\d{2}\b/);

  if (!yearMatch || yearMatch.index === undefined) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  let prefix =
    title
      .slice(0, yearMatch.index)
      .replace(
        /\b(?:PSA|BGS|SGC|CGC|CSG|TAG|HGA|BECKETT)\s*(?:10|[1-9](?:\.5)?)\b/gi,
        ""
      )
      .replace(
        /\b(?:GEM\s*MINT|MINT|PRISTINE|ROOKIE|RC|AUTO|AUTOGRAPH)\b/gi,
        ""
      )
      .replace(/[^a-zA-Z.' -]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const parts =
    prefix.split(/\s+/).filter(Boolean);

  if (
    parts.length < 2 ||
    parts.length > 5
  ) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" "),
  };
}

function parsePlayer(
  aspects: AuctionAspects | undefined,
  title: string
) {
  const firstName = aspectValue(aspects, [
    "First Name",
    "Player First Name",
    "Athlete First Name",
  ]);

  const lastName = aspectValue(aspects, [
    "Last Name",
    "Player Last Name",
    "Athlete Last Name",
  ]);

  if (firstName || lastName) {
    return {
      firstName,
      lastName,
    };
  }

  const fromAspects =
    aspectValue(aspects, [
      "Player/Athlete",
      "Player",
      "Athlete",
      "Character",
    ]);

  if (fromAspects) {
    return splitPlayerName(
      fromAspects
    );
  }

  return parsePlayerFromTitle(title);
}

function cleanSetName(value: string) {
  return clean(value)
    .replace(/^(?:19|20)\d{2}(?:-\d{2})?\s+/, "")
    .trim();
}

function parseBrandFromTitle(
  title: string
) {
  const manufacturers = [
    "Upper Deck",
    "Panini",
    "Topps",
    "Bowman",
    "Donruss",
    "Fleer",
    "Leaf",
    "Score",
  ];

  const sets = [
    "National Treasures",
    "Immaculate Collection",
    "Flawless",
    "Prizm",
    "Select",
    "Optic",
    "Contenders",
    "Origins",
    "Exquisite Collection",
    "Ultimate Collection",
    "Chrome",
    "Finest",
    "Museum Collection",
    "Triple Threads",
    "Five Star",
    "Dynasty",
    "Sterling",
    "Heritage",
    "Tiffany",
  ];

  const manufacturer =
    manufacturers.find(function (value) {
      return new RegExp(
        "\\b" +
          value.replace(
            /\s+/g,
            "\\s+"
          ) +
          "\\b",
        "i"
      ).test(title);
    }) || "";

  const setName =
    sets.find(function (value) {
      return new RegExp(
        "\\b" +
          value.replace(
            /\s+/g,
            "\\s+"
          ) +
          "\\b",
        "i"
      ).test(title);
    }) || "";

  if (
    manufacturer &&
    setName &&
    normalizedKey(manufacturer) !==
      normalizedKey(setName)
  ) {
    return `${manufacturer} ${setName}`;
  }

  return manufacturer || setName;
}

function parseBrand(
  aspects: AuctionAspects | undefined,
  title: string
) {
  const setName = cleanSetName(
    aspectValue(aspects, [
      "Set",
      "Card Set",
      "Product",
      "Product Set",
    ]),
  );

  const maker = clean(
    aspectValue(aspects, [
      "Manufacturer",
      "Brand",
    ]),
  );

  if (!setName) {
    return maker ||
      parseBrandFromTitle(title);
  }

  if (
    !maker ||
    normalizedKey(setName).startsWith(normalizedKey(maker))
  ) {
    return setName;
  }

  return `${maker} ${setName}`;
}

function parseParallel(aspects?: AuctionAspects) {
  const value = aspectValue(aspects, [
    "Parallel/Variety",
    "Parallel",
    "Variety",
    "Insert Set",
    "Insert",
  ]);

  return isUnavailable(value) || /^base$/i.test(value)
    ? ""
    : value;
}

function parseParallelFromTitle(
  title: string
) {
  const parallelNames = [
    "Black Gold",
    "Gold Vinyl",
    "Superfractor",
    "Cracked Ice",
    "Tie-Dye",
    "Tie Dye",
    "Nebula",
    "Platinum",
    "Sapphire",
    "Orange",
    "Purple",
    "Green",
    "Blue",
    "Red",
    "Gold",
    "Silver",
    "Black",
    "White",
    "Pink",
    "Bronze",
  ];

  for (const parallel of parallelNames) {
    const pattern = new RegExp(
      "\\b" +
        parallel
          .replace(/\s+/g, "\\s+")
          .replace("-", "\\-") +
        "\\s*\\/\\s*\\d+\\b",
      "i"
    );

    if (pattern.test(title)) {
      return parallel;
    }
  }

  return "";
}

function parseSport(aspects?: AuctionAspects) {
  const value = aspectValue(aspects, [
    "Sport",
    "Sports",
  ]);

  const aliases: Record<string, string> = {
    "american football": "Football",
    baseball: "Baseball",
    basketball: "Basketball",
    football: "Football",
    golf: "Golf",
    hockey: "Hockey",
    "ice hockey": "Hockey",
    soccer: "Soccer",
    wrestling: "Wrestling",
  };

  return aliases[value.toLowerCase()] || value;
}

function parseSportFromTitle(
  title: string
) {
  const normalized =
    title.toLowerCase();

  const groups: Array<{
    sport: string;
    terms: string[];
  }> = [
    {
      sport: "Football",
      terms: [
        "football",
        "nfl",
        "ravens",
        "chiefs",
        "eagles",
        "bills",
        "bengals",
        "browns",
        "steelers",
        "cowboys",
        "packers",
        "49ers",
        "patriots",
        "broncos",
        "raiders",
        "chargers",
        "dolphins",
        "jets",
        "giants",
        "commanders",
        "lions",
        "bears",
        "vikings",
        "saints",
        "falcons",
        "panthers",
        "buccaneers",
        "rams",
        "seahawks",
        "cardinals",
        "texans",
        "titans",
        "jaguars",
        "colts",
      ],
    },
    {
      sport: "Basketball",
      terms: [
        "basketball",
        "nba",
        "wnba",
        "lakers",
        "celtics",
        "bulls",
        "warriors",
        "knicks",
        "nets",
        "mavericks",
        "spurs",
        "heat",
        "bucks",
        "suns",
        "nuggets",
      ],
    },
    {
      sport: "Baseball",
      terms: [
        "baseball",
        "mlb",
        "yankees",
        "mets",
        "dodgers",
        "cubs",
        "red sox",
        "braves",
        "phillies",
        "padres",
        "astros",
      ],
    },
    {
      sport: "Hockey",
      terms: [
        "hockey",
        "nhl",
      ],
    },
    {
      sport: "Soccer",
      terms: [
        "soccer",
        "premier league",
        "uefa",
        "fifa",
      ],
    },
  ];

  for (const group of groups) {
    if (
      group.terms.some(function (term) {
        return new RegExp(
          "(?:^|[^a-z0-9])" +
            term.replace(
              /\s+/g,
              "\\s+"
            ) +
            "(?:$|[^a-z0-9])",
          "i"
        ).test(normalized);
      })
    ) {
      return group.sport;
    }
  }

  return "";
}

export function parseAuctionTitle(
  value: unknown,
  aspects?: AuctionAspects,
): ParsedAuctionTitle {
  const title = clean(value);
  const gradeResult = parseGrade(title);
  const player = parsePlayer(
    aspects,
    title
  );

  const aspectParallel =
    parseParallel(aspects);

  const aspectSport =
    parseSport(aspects);

  return {
    year: parseYear(title, aspects),
    firstName: player.firstName,
    lastName: player.lastName,
    cardNumber: parseCardNumber(title, aspects),
    brand: parseBrand(
      aspects,
      title
    ),
    parallel:
      aspectParallel ||
      parseParallelFromTitle(title),
    sport:
      aspectSport ||
      parseSportFromTitle(title),
    serialNumber:
      aspectValue(aspects, [
        "Serial Number",
        "Print Run",
      ]).match(/\b\d{1,5}\s*\/\s*\d{1,5}\b/)?.[0]?.replace(/\s+/g, "") ||
      parseSerialNumber(title),
    grade: gradeResult.grade,
    gradingCompany: gradeResult.gradingCompany,
  };
}