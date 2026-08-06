import {
  parseAuctionTitle,
  type ParsedAuctionTitle,
} from "./auctionParser";
import {
  parseSubject,
} from "./subjectParser";

export type PageTextImportResult = {
  ok: boolean;

  marketplace: string;
  sourceUrl: string;
  listingId: string;

  title: string;
  seller: string;

  price: string;
  currency: string;
  endDate: string;

  certNumber?: string;
  grade?: string;
  serialNumber?: string;
  lotNumber?: string;
  description?: string;

  frontImage: string;
  additionalImages: string[];

  aspects: Record<string, string[]>;

  cardFields?: ParsedAuctionTitle & {
    certNumber: string;
  };
};

function clean(
  value: unknown
) {
  return String(value ?? "")
    .trim();
}

function normalizeCopiedPageText(
  value: unknown
) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegExp(
  value: string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function extractPageUrl(
  text: string
) {
  const value =
    text.match(
      /https?:\/\/[^\s<>"']+/i
    )?.[0] || "";

  return value
    .replace(/[),.;]+$/g, "")
    .trim();
}

function extractLabelValue(
  text: string,
  labels: string[]
) {
  for (const label of labels) {
    const escaped =
      escapeRegExp(label);

    const patterns = [
      new RegExp(
        `(?:^|\\n)\\s*${escaped}\\s*:?\\s*([^\\n]+)`,
        "i"
      ),

      new RegExp(
        `(?:^|\\n)\\s*${escaped}\\s*\\n\\s*([^\\n]+)`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match =
        text.match(pattern);

      if (match?.[1]) {
        const result =
          clean(match[1]);

        if (
          result &&
          result.toLowerCase() !==
            label.toLowerCase()
        ) {
          return result;
        }
      }
    }
  }

  return "";
}

function parseDate(
  value: unknown
) {
  const text =
    clean(value);

  if (!text) {
    return "";
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toISOString();
}

function normalizePsaCategory(
  value: unknown
) {
  const category =
    clean(value)
      .replace(
        /\s+CARDS?\s*$/i,
        ""
      )
      .trim();

  if (!category) {
    return "";
  }

  if (
  /pokemon|pokémon|tcg/i.test(
    category
  )
) {
  return "Pokémon/TCG";
}

  if (/basketball/i.test(category)) {
    return "Basketball";
  }

  if (/football/i.test(category)) {
    return "Football";
  }

  if (/baseball/i.test(category)) {
    return "Baseball";
  }

  if (/hockey/i.test(category)) {
    return "Hockey";
  }

  if (/soccer/i.test(category)) {
    return "Soccer";
  }

  if (/golf/i.test(category)) {
    return "Golf";
  }

  if (/boxing/i.test(category)) {
    return "Boxing";
  }

  return category
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function normalizeGrade(
  company: string,
  value: unknown
) {
  const grade =
    clean(value);

  if (!grade) {
    return "";
  }

  if (
    grade
      .toLowerCase()
      .startsWith(
        company.toLowerCase()
      )
  ) {
    return grade;
  }

  if (
    /authentic\s+altered/i.test(
      grade
    )
  ) {
    return `${company} Authentic Altered`;
  }

  if (
    /authentic/i.test(
      grade
    )
  ) {
    return `${company} Authentic`;
  }

  const numeric =
    grade.match(
      /\b10(?:\.0)?\b|\b[1-9](?:\.\d+)?\b/
    )?.[0];

  if (numeric) {
    return `${company} ${numeric}`;
  }

  return `${company} ${grade}`;
}

function addNormalizedCardFields(
  result: PageTextImportResult
): PageTextImportResult {
  const parsed =
    parseAuctionTitle(
      result.title,
      result.aspects
    );

  const supplied =
    result.cardFields || {};

  return {
    ...result,

    cardFields: {
      ...parsed,
      ...supplied,

      year:
        clean(supplied.year) ||
        parsed.year,

      firstName:
  Object.prototype.hasOwnProperty.call(
    supplied,
    "firstName"
  )
    ? clean(
        supplied.firstName
      )
    : parsed.firstName,

lastName:
  Object.prototype.hasOwnProperty.call(
    supplied,
    "lastName"
  )
    ? clean(
        supplied.lastName
      )
    : parsed.lastName,

      cardNumber:
        clean(
          supplied.cardNumber
        ) ||
        parsed.cardNumber,

      brand:
        clean(
          supplied.brand
        ) ||
        parsed.brand,

      parallel:
        clean(
          supplied.parallel
        ) ||
        parsed.parallel,

      sport:
        clean(
          supplied.sport
        ) ||
        parsed.sport,

      grade:
        clean(
          supplied.grade
        ) ||
        clean(result.grade) ||
        parsed.grade,

      serialNumber:
        clean(
          supplied.serialNumber
        ) ||
        clean(
          result.serialNumber
        ) ||
        parsed.serialNumber,

      certNumber:
        clean(
          supplied.certNumber
        ) ||
        clean(
          result.certNumber
        ),
    },
  };
}

function parseHeritagePageText(
  copiedText: string
): PageTextImportResult {
  const text =
    normalizeCopiedPageText(
      copiedText
    );

  const sourceUrl =
    extractPageUrl(text);

  const lotNumber =
    clean(
      text.match(
        /\bLot\s*(?:Number|No\.?|#)?\s*:?\s*(\d{1,10})\b/i
      )?.[1]
    );

  let title =
    extractLabelValue(
      text,
      [
        "Lot Title",
        "Item Title",
        "Title",
      ]
    );

  if (!title) {
    title =
      clean(
        text.match(
          /(?:^|\n)([^\n]{20,500})\n+(?=(?:Sold on|Sold For|Price Realized|Current Bid))/i
        )?.[1]
      );
  }

  if (!title) {
    title =
      clean(
        text
          .split("\n")
          .map((line) =>
            clean(line)
          )
          .find((line) => {
            return (
              line.length >= 20 &&
              /\b(?:19|20)\d{2}\b/.test(
                line
              ) &&
              !/^https?:\/\//i.test(
                line
              ) &&
              !/heritage auctions/i.test(
                line
              )
            );
          })
      );
  }

  const soldDate =
    clean(
      text.match(
        /\bSold on\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i
      )?.[1] ||
      text.match(
        /\b(?:Sale Date|Date Sold)\s*:?\s*([^\n]+)/i
      )?.[1]
    );

  const price =
    clean(
      text.match(
        /\bSold on\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}\s+for\s*:?\s*\$([\d,]+(?:\.\d{1,2})?)/i
      )?.[1] ||
      text.match(
        /\b(?:Sold For|Price Realized|Final Price)\s*:?\s*\$([\d,]+(?:\.\d{1,2})?)/i
      )?.[1]
    ).replace(/,/g, "");

  const certNumber =
    clean(
      text.match(
        /\bCert(?:ification)?\s*(?:Number|No\.?|#)?\s*:?\s*(\d{6,12})\b/i
      )?.[1] ||
      text.match(
        /psacard\.com\/cert\/(\d{6,12})/i
      )?.[1]
    );

  const serialNumber =
    clean(
      text.match(
        /(?:#['’]?d|Serial(?: Number)?|Numbered)\s*:?\s*(\d{1,6}\s*\/\s*(?:\d{1,6}|xx))/i
      )?.[1] ||
      text.match(
        /\b(\d{1,6}\s*\/\s*(?:\d{1,6}|xx))\b/i
      )?.[1]
    ).replace(/\s+/g, "");

  const gradeMatch =
    text.match(
      /\b(PSA|BGS|SGC|CGC)\s+(Authentic(?:\s+Altered)?|Gem\s+Mint\s+10|Mint\s+9|NM-MT\s+8|NM\s+7|EX-MT\s+6|EX\s+5|VG-EX\s+4|VG\s+3|Good\s+2|Poor\s+1|\d+(?:\.\d+)?)\b/i
    );

  const grade =
    gradeMatch
      ? clean(gradeMatch[0])
      : "";

  const description =
    extractLabelValue(
      text,
      [
        "Lot Description",
        "Description",
      ]
    );

  if (!title) {
    throw new Error(
      "Unable to find a Heritage lot title in the copied page text."
    );
  }

  return addNormalizedCardFields({
    ok: true,

    marketplace:
      "heritage-text",

    sourceUrl,

    listingId:
      lotNumber,

    lotNumber,

    title,

    seller:
      "Heritage Auctions",

    price,

    currency:
      price
        ? "USD"
        : "",

    endDate:
      parseDate(
        soldDate
      ),

    certNumber,

    grade,

    serialNumber,

    description,

    frontImage: "",

    additionalImages: [],

    aspects:
      lotNumber
        ? {
            "Lot Number": [
              lotNumber,
            ],
          }
        : {},
  });
}

function parsePsaPageText(
  copiedText: string
): PageTextImportResult {
  const text =
    normalizeCopiedPageText(
      copiedText
    );

  const sourceUrl =
    extractPageUrl(text);

  const certNumber =
    clean(
      extractLabelValue(
        text,
        [
          "Cert Number",
          "Certification Number",
          "Certificate Number",
        ]
      ).match(
        /\d{6,12}/
      )?.[0] ||
      text.match(
        /psacard\.com\/cert\/(\d{6,12})/i
      )?.[1]
    );

  const year =
    extractLabelValue(
      text,
      ["Year"]
    );

  const brandTitle =
    extractLabelValue(
      text,
      [
        "Brand/Title",
        "Brand / Title",
        "Brand",
      ]
    );

  const subject =
    extractLabelValue(
      text,
      [
        "Subject",
        "Player/Athlete",
        "Player",
      ]
    );

  const cardNumber =
    extractLabelValue(
      text,
      [
        "Card Number",
        "Card No.",
        "Card #",
      ]
    );

  const variety =
    extractLabelValue(
      text,
      [
        "Variety/Pedigree",
        "Variety / Pedigree",
        "Variety",
        "Pedigree",
      ]
    );

  const category =
    extractLabelValue(
      text,
      [
        "Category",
        "Sport",
      ]
    );

  const itemGrade =
    extractLabelValue(
      text,
      [
        "Item Grade",
        "Card Grade",
        "Grade",
      ]
    );

  const autographGrade =
    extractLabelValue(
      text,
      [
        "Autograph Grade",
        "Auto Grade",
      ]
    );

  const primarySigner =
    extractLabelValue(
      text,
      [
        "Primary Signer (1 Signer)",
        "Primary Signer",
        "Signer",
      ]
    );

  const serialNumber =
    clean(
      text.match(
        /\b(\d{1,6}\s*\/\s*(?:\d{1,6}|xx))\b/i
      )?.[1]
    ).replace(/\s+/g, "");

  const title = [
  year,

  subject ||
    primarySigner,

  cardNumber
    ? `#${cardNumber}`
    : "",

  brandTitle,

  variety,

  serialNumber,
]
  .filter(Boolean)
  .join(" ")
  .replace(/\s+/g, " ")
  .trim();

const parsedTitle =
  parseAuctionTitle(
    title,
    {
      ...(brandTitle
        ? {
            "Brand/Title": [
              brandTitle,
            ],
          }
        : {}),

      ...(category
        ? {
            Category: [
              category,
            ],
          }
        : {}),

      ...(variety
        ? {
            "Variety/Pedigree": [
              variety,
            ],
          }
        : {}),
    }
  );

const psaGrade =
  normalizeGrade(
    "PSA",
    itemGrade
  );

const psaSport =
  normalizePsaCategory(
    category
  );

const parsedSubject =
  parseSubject(
    subject || primarySigner,
    category
  );

if (
  !certNumber &&
  !title
) {
  throw new Error(
    "Unable to find PSA certification information in the copied page text."
  );
}

  const descriptionParts: string[] =
    [];

  if (autographGrade) {
    descriptionParts.push(
      `Autograph Grade: ${autographGrade}`
    );
  }

  if (
    primarySigner &&
    primarySigner.toLowerCase() !==
      subject.toLowerCase()
  ) {
    descriptionParts.push(
      `Primary Signer: ${primarySigner}`
    );
  }

  return addNormalizedCardFields({
    ok: true,

    marketplace:
      "psa-text",

    sourceUrl,

    listingId:
      certNumber,

    title,

    seller:
      "PSA",

    price: "",

    currency: "",

    endDate: "",

    certNumber,

    grade:
  psaGrade,

    serialNumber,

    description:
      descriptionParts.join(
        "\n"
      ),

    frontImage: "",

additionalImages: [],

cardFields: {
  ...parsedTitle,

  firstName:
    parsedSubject.firstName,

  lastName:
    parsedSubject.lastName,

  year:
    clean(year) ||
    parsedTitle.year,

  cardNumber:
    clean(cardNumber) ||
    parsedTitle.cardNumber,

  /*
   * PSA's Brand/Title value is more authoritative
   * than a brand guessed from the combined title.
   */
  brand:
    clean(brandTitle) ||
    parsedTitle.brand,

  /*
   * PSA's Variety/Pedigree maps to the Cards Alert
   * parallel or variation field.
   */
  parallel:
    clean(variety) ||
    parsedTitle.parallel,

  sport:
    psaSport ||
    parsedTitle.sport,

  grade:
    psaGrade ||
    parsedTitle.grade,

  serialNumber:
    clean(serialNumber) ||
    parsedTitle.serialNumber,

  certNumber:
    clean(certNumber),
},

aspects: {
      ...(year
        ? {
            Year: [year],
          }
        : {}),

      ...(brandTitle
        ? {
            "Brand/Title": [
              brandTitle,
            ],
          }
        : {}),

      ...(subject
        ? {
            Subject: [
              subject,
            ],
          }
        : {}),

      ...(cardNumber
        ? {
            "Card Number": [
              cardNumber,
            ],
          }
        : {}),

      ...(variety
        ? {
            "Variety/Pedigree": [
              variety,
            ],
          }
        : {}),

      ...(category
        ? {
            Category: [
              category,
            ],
          }
        : {}),

      ...(autographGrade
        ? {
            "Autograph Grade": [
              autographGrade,
            ],
          }
        : {}),
    },
  });
}

export async function importPageText(
  copiedText: string
): Promise<PageTextImportResult> {
  const text =
    normalizeCopiedPageText(
      copiedText
    );

  if (!text) {
    throw new Error(
      "Paste copied webpage text before importing."
    );
  }

  const normalized =
    text.toLowerCase();

  const looksLikeHeritage =
    normalized.includes(
      "heritage auctions"
    ) ||
    normalized.includes(
      "sports.ha.com"
    ) ||
    (
      normalized.includes(
        "price realized"
      ) &&
      normalized.includes(
        "lot"
      )
    );

  if (looksLikeHeritage) {
    return parseHeritagePageText(
      text
    );
  }

  const looksLikePsa =
    normalized.includes(
      "psacard.com"
    ) ||
    normalized.includes(
      "cert number"
    ) ||
    normalized.includes(
      "brand/title"
    ) ||
    (
      normalized.includes(
        "item grade"
      ) &&
      normalized.includes(
        "card number"
      )
    );

  if (looksLikePsa) {
    return parsePsaPageText(
      text
    );
  }

  throw new Error(
    "The copied page text was not recognized as Heritage Auctions or PSA."
  );
}