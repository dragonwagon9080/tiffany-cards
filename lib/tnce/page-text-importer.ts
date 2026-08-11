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

  const supplied:
  Partial<
    ParsedAuctionTitle & {
      certNumber: string;
    }
  > =
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


function decodeHtmlEntities(
  value: string
) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code) =>
      String.fromCharCode(Number(code))
    );
}

function stripBlowoutHtml(
  value: string
) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<img\b[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function extractBlowoutPostId(
  originalUrl: string,
  html: string
) {
  const fromUrl =
    clean(
      originalUrl.match(
        /[?&]p=(\d+)/i
      )?.[1]
    );

  if (fromUrl) {
    return fromUrl;
  }

  return clean(
    html.match(
      /id=["']post_message_(\d+)["']/i
    )?.[1] ||
    html.match(
      /showpost\.php\?p=(\d+)/i
    )?.[1]
  );
}

function extractBlowoutMessageHtml(
  html: string,
  postId: string
) {
  if (!postId) {
    return "";
  }

  const marker =
    new RegExp(
      `id\\s*=\\s*["']post_message_${escapeRegExp(postId)}["']`,
      "i"
    ).exec(html);

  if (!marker) {
    return "";
  }

  const contentStart =
    html.indexOf(
      ">",
      marker.index
    );

  if (contentStart < 0) {
    return "";
  }

  const afterStart =
    html.slice(
      contentStart + 1
    );

  const endMatch =
    /<!--\s*\/\s*message\s*-->/i.exec(
      afterStart
    );

  if (!endMatch) {
    return "";
  }

  let messageHtml =
    afterStart
      .slice(
        0,
        endMatch.index
      )
      .trim();

  messageHtml =
    messageHtml.replace(
      /<\/div>\s*$/i,
      ""
    );

  return messageHtml.trim();
}

function extractBlowoutUsername(
  html: string,
  postId: string
) {
  const marker =
    `post_message_${postId}`;

  const index =
    html.indexOf(marker);

  if (index < 0) {
    return "";
  }

  const before =
    html.slice(
      Math.max(0, index - 12000),
      index
    );

  const matches =
    Array.from(
      before.matchAll(
        /<a[^>]+class=["'][^"']*\bbigusername\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi
      )
    );

  const last =
    matches[
      matches.length - 1
    ];

  return last?.[1]
    ? stripBlowoutHtml(
        last[1]
      )
    : "";
}

function extractBlowoutPostDate(
  html: string,
  postId: string
) {
  const marker =
    `post_message_${postId}`;

  const index =
    html.indexOf(marker);

  if (index < 0) {
    return "";
  }

  const before =
    html.slice(
      Math.max(0, index - 12000),
      index
    );

  const matches =
    Array.from(
      before.matchAll(
        /\b(\d{1,2}-\d{1,2}-\d{4})(?:,\s*\d{1,2}:\d{2}\s*(?:AM|PM))?/gi
      )
    );

  const raw =
    matches[
      matches.length - 1
    ]?.[1] || "";

  const parts =
    raw.split("-");

  if (parts.length !== 3) {
    return "";
  }

  const [month, day, year] =
    parts;

  return parseDate(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  );
}

function extractBlowoutImages(
  messageHtml: string,
  sourceUrl: string
) {
  const candidates: string[] = [];

  for (
    const match of messageHtml.matchAll(
      /<a[^>]+href=["']([^"']+\.(?:jpe?g|png|webp|gif)(?:\?[^"']*)?)["'][^>]*>[\s\S]*?<img\b/gi
    )
  ) {
    if (match[1]) {
      candidates.push(
        match[1]
      );
    }
  }

  for (
    const match of messageHtml.matchAll(
      /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    )
  ) {
    if (match[1]) {
      candidates.push(
        match[1]
      );
    }
  }

  const seen = new Set<string>();
  const urls: string[] = [];

  for (const raw of candidates) {
    let resolved =
      decodeHtmlEntities(raw)
        .trim();

    try {
      resolved =
        new URL(
          resolved,
          sourceUrl ||
            "https://www.blowoutforums.com/"
        ).toString();
    } catch {
      continue;
    }

    if (
      /(?:avatar|smilie|emoji|favicon|statusicon|quote\.gif)/i.test(
        resolved
      )
    ) {
      continue;
    }

    const key =
      resolved.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    urls.push(resolved);
  }

  return urls;
}

function detectBlowoutCertNumbers(
  text: string
) {
  const certs = new Set<string>();

  const patterns = [
    /\b(?:PSA|BGS|BECKETT|SGC|CGC|CSG)\s+(?:CERT(?:IFICATION)?\s*)?#?\s*(\d{6,12})\b/gi,
    /\bCERT(?:IFICATION)?\s*#?\s*(\d{6,12})\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (match[1]) {
        certs.add(match[1]);
      }
    }
  }

  return Array.from(certs);
}

function detectBlowoutGrades(
  text: string
) {
  const grades = new Set<string>();

  const pattern =
    /\b(PSA|BGS|BECKETT|SGC|CGC|CSG)\s+(AUTHENTIC(?:\s+ALTERED)?|10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/gi;

  for (const match of text.matchAll(pattern)) {
    const company =
      String(match[1] || "")
        .toUpperCase()
        .replace(
          "BECKETT",
          "BGS"
        );

    const grade =
      clean(match[2]);

    if (company && grade) {
      grades.add(
        `${company} ${grade}`
      );
    }
  }

  return Array.from(grades);
}

function chooseBlowoutCardTitle(
  postText: string
) {
  const lines =
    postText
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

  const yearCardLine =
    lines.find(
      (line) =>
        /\b(?:18|19|20)\d{2}(?:-\d{2})?\b/.test(line) &&
        /#\s*[A-Za-z0-9-]+/.test(line) &&
        !/thread|view single post|blowout/i.test(line)
    );

  if (yearCardLine) {
    return yearCardLine;
  }

  const yearLine =
    lines.find(
      (line) =>
        /\b(?:18|19|20)\d{2}(?:-\d{2})?\b/.test(line) &&
        !/\bcert\b|thread|view single post|blowout/i.test(line)
    );

  if (yearLine) {
    return yearLine;
  }

  return (
    lines.find(
      (line) =>
        !/^(?:PSA|BGS|SGC|CGC|CSG)?\s*cert\b/i.test(line) &&
        !/^value\s+(?:gain|increase|change)/i.test(line) &&
        !/^PSA\s+Set\s+Registry/i.test(line) &&
        !/thread|view single post|blowout/i.test(line)
    ) ||
    lines[0] ||
    "Blowout Forums Post"
  );
}

function extractBlowoutUsernameFromText(
  copiedText: string
) {
  const text =
    normalizeCopiedPageText(
      copiedText
    );

  const memberLinkMatch =
    text.match(
      /(?:^|\n)\s*([^\n|]{2,80})\s*(?=\n|\s).*?member\.php\?u=\d+/i
    );

  if (memberLinkMatch?.[1]) {
    const candidate =
      clean(memberLinkMatch[1])
        .replace(/[*_`[\]]/g, "")
        .trim();

    if (
      candidate &&
      !/thread|view single post|join date|location|posts/i.test(
        candidate
      )
    ) {
      return candidate;
    }
  }

  const lines =
    text
      .split("\n")
      .map((line) =>
        clean(
          line
            .replace(/[*_`]/g, "")
            .replace(/\[[^\]]+\]\([^)]+\)/g, "")
        )
      )
      .filter(Boolean);

  const dateIndex =
    lines.findIndex(
      (line) =>
        /^\d{1,2}-\d{1,2}-\d{4},\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i.test(
          line
        )
    );

  if (dateIndex >= 0) {
    for (
      let index = dateIndex + 1;
      index < Math.min(
        lines.length,
        dateIndex + 8
      );
      index += 1
    ) {
      const line =
        lines[index];

      if (
        line &&
        !/^#?\d+$/.test(line) &&
        !/join date|location|posts|view single post|thread/i.test(
          line
        ) &&
        line.length <= 80
      ) {
        return line;
      }
    }
  }

  return "";
}

function extractBlowoutPostDateFromText(
  copiedText: string
) {
  const raw =
    normalizeCopiedPageText(
      copiedText
    ).match(
      /(?:^|\n|\s)(\d{1,2}-\d{1,2}-\d{4})(?:,\s*\d{1,2}:\d{2}\s*(?:AM|PM))?/i
    )?.[1] || "";

  const parts =
    raw.split("-");

  if (parts.length !== 3) {
    return "";
  }

  const [month, day, year] =
    parts;

  return parseDate(
    `${year}-${month.padStart(
      2,
      "0"
    )}-${day.padStart(
      2,
      "0"
    )}`
  );
}

function extractBlowoutPostNumber(
  copiedText: string,
  originalUrl: string
) {
  return clean(
    originalUrl.match(
      /[?&]postcount=(\d+)/i
    )?.[1] ||
    copiedText.match(
      /showpost\.php\?p=\d+(?:&|&amp;)postcount=(\d+)/i
    )?.[1] ||
    copiedText.match(
      /(?:^|\s)#\s*(\d{1,8})\b/
    )?.[1]
  );
}

function cleanBlowoutVisibleText(
  copiedText: string
) {
  return normalizeCopiedPageText(
    decodeHtmlEntities(
      copiedText
    )
  )
    .replace(
      /\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,
      "$1"
    )
    .replace(
      /\*\*([^*]+)\*\*/g,
      "$1"
    )
    .replace(
      /__([^_]+)__/g,
      "$1"
    )
    .replace(
      /<br\s*\/?>/gi,
      "\n"
    )
    .trim();
}

function extractBlowoutPostTextFromVisibleText(
  copiedText: string
) {
  const text =
    cleanBlowoutVisibleText(
      copiedText
    );

  const lines =
    text
      .split("\n")
      .map((line) =>
        clean(line)
      )
      .filter(Boolean);

  if (!lines.length) {
    return "";
  }

  let startIndex =
    lines.findIndex(
      (line) =>
        /\b(?:PSA|BGS|BECKETT|SGC|CGC|CSG)\s+Cert(?:ification)?\s*#?\s*\d{6,12}\b/i.test(
          line
        )
    );

  if (startIndex < 0) {
    startIndex =
      lines.findIndex(
        (line) =>
          /\b(?:18|19|20)\d{2}(?:-\d{2})?\b/.test(
            line
          ) &&
          /#\s*[A-Za-z0-9-]+/.test(
            line
          ) &&
          !/thread|view single post/i.test(
            line
          )
      );
  }

  if (startIndex < 0) {
    startIndex =
      lines.findIndex(
        (line) =>
          !/thread|view single post|join date|location|posts|^#\d+$/i.test(
            line
          )
      );
  }

  if (startIndex < 0) {
    return text;
  }

  let endIndex =
    lines.length;

  for (
    let index = startIndex + 1;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    if (
      /^_{8,}$/.test(line) ||
      /^-{8,}$/.test(line) ||
      /^He has no rival/i.test(line) ||
      /^Quick Reply$/i.test(line) ||
      /^Posting Rules$/i.test(line)
    ) {
      endIndex =
        index;
      break;
    }
  }

  return lines
    .slice(
      startIndex,
      endIndex
    )
    .filter(
      (line) =>
        !/^\|\s*-/.test(line) &&
        line !== "|" &&
        !/^\s*---+\s*$/.test(line)
    )
    .join("\n")
    .trim();
}

function extractBlowoutImagesFromClipboardHtml(
  copiedHtml: string,
  sourceUrl: string
) {
  const html =
    String(copiedHtml || "");

  if (!html) {
    return [];
  }

  const candidates: string[] =
    [];

  for (
    const match of html.matchAll(
      /<a[^>]+href=["']([^"']+\.(?:jpe?g|png|webp|gif)(?:\?[^"']*)?)["'][^>]*>[\s\S]*?<img\b/gi
    )
  ) {
    if (match[1]) {
      candidates.push(
        match[1]
      );
    }
  }

  for (
    const match of html.matchAll(
      /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi
    )
  ) {
    if (match[1]) {
      candidates.push(
        match[1]
      );
    }
  }

  const seen =
    new Set<string>();

  const urls: string[] =
    [];

  for (const raw of candidates) {
    let resolved =
      decodeHtmlEntities(
        raw
      ).trim();

    if (
      !resolved ||
      /^data:/i.test(
        resolved
      )
    ) {
      continue;
    }

    try {
      resolved =
        new URL(
          resolved,
          sourceUrl ||
            "https://www.blowoutforums.com/"
        ).toString();
    } catch {
      continue;
    }

    if (
      /blowoutforums\.com\/(?:images|image|clientscript|styles|customavatars|customprofilepics)\//i.test(
        resolved
      ) ||
      /(?:avatar|smilie|emoji|favicon|statusicon|quote\.gif|collapse|buttons|logo)/i.test(
        resolved
      )
    ) {
      continue;
    }

    if (
      !/\.(?:jpe?g|png|webp|gif)(?:[?#]|$)/i.test(
        resolved
      )
    ) {
      continue;
    }

    const key =
      resolved.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    urls.push(
      resolved
    );
  }

  return urls;
}

function parseBlowoutPageText(
  copiedText: string,
  originalUrl = "",
  copiedHtml = ""
): PageTextImportResult {
  const visibleText =
    String(copiedText || "");

  const clipboardHtml =
    String(copiedHtml || "");

  const combinedHtml =
    clipboardHtml ||
    (
      /<html\b|<div\b|post_message_/i.test(
        visibleText
      )
        ? visibleText
        : ""
    );

  const sourceUrl =
    clean(originalUrl) ||
    extractPageUrl(
      visibleText
    ) ||
    extractPageUrl(
      clipboardHtml
    ) ||
    "https://www.blowoutforums.com/";

  const postId =
    extractBlowoutPostId(
      sourceUrl,
      combinedHtml ||
        visibleText
    );

  const messageHtml =
    combinedHtml
      ? extractBlowoutMessageHtml(
          combinedHtml,
          postId
        )
      : "";

  const postText =
    messageHtml
      ? stripBlowoutHtml(
          messageHtml
        )
      : extractBlowoutPostTextFromVisibleText(
          visibleText
        );

  if (!postText) {
    throw new Error(
      "Blowout Forums was detected, but no usable post text could be extracted from the pasted content."
    );
  }

  const messageImages =
    messageHtml
      ? extractBlowoutImages(
          messageHtml,
          sourceUrl
        )
      : [];

  const clipboardImages =
    extractBlowoutImagesFromClipboardHtml(
      clipboardHtml,
      sourceUrl
    );

  const images =
    Array.from(
      new Set([
        ...messageImages,
        ...clipboardImages,
      ])
    );

  const username =
    (
      combinedHtml &&
      postId
        ? extractBlowoutUsername(
            combinedHtml,
            postId
          )
        : ""
    ) ||
    extractBlowoutUsernameFromText(
      visibleText
    );

  const endDate =
    (
      combinedHtml &&
      postId
        ? extractBlowoutPostDate(
            combinedHtml,
            postId
          )
        : ""
    ) ||
    extractBlowoutPostDateFromText(
      visibleText
    );

  const postNumber =
    extractBlowoutPostNumber(
      visibleText,
      sourceUrl
    );

  const certNumbers =
    detectBlowoutCertNumbers(
      postText
    );

  const grades =
    detectBlowoutGrades(
      postText
    );

  const title =
    chooseBlowoutCardTitle(
      postText
    );

  return addNormalizedCardFields({
    ok: true,
    marketplace:
      "blowout-text",
    sourceUrl,
    listingId:
      postId ||
      postNumber,
    title,
    seller:
      username ||
      "Blowout Forums",
    price: "",
    currency: "",
    endDate,
    certNumber:
      certNumbers.length === 1
        ? certNumbers[0]
        : "",
    /*
     * Blowout alteration posts commonly describe
     * the older grade first and the later/current
     * grade last. Preserve all grades in aspects,
     * and expose the last detected grade as the
     * primary/current grade for card forms.
     */
    grade:
      grades.length
        ? grades[
            grades.length - 1
          ]
        : "",
    serialNumber: "",
    description:
      postText,
    frontImage:
      images[0] || "",
    additionalImages:
      images.slice(1),
    aspects: {
      ...(postId
        ? {
            "Blowout Post ID": [
              postId,
            ],
          }
        : {}),
      ...(postNumber
        ? {
            "Blowout Post Number": [
              postNumber,
            ],
          }
        : {}),
      ...(certNumbers.length
        ? {
            "Detected Cert Numbers":
              certNumbers,
          }
        : {}),
      ...(grades.length
        ? {
            "Detected Grades":
              grades,
          }
        : {}),
    },
  });
}

function parseGenericPageText(
  copiedText: string
): PageTextImportResult {
  const text =
    normalizeCopiedPageText(
      copiedText
    );

  const lines =
    text
      .split("\n")
      .map((line) =>
        clean(line)
      )
      .filter(Boolean);

  if (!lines.length) {
    throw new Error(
      "No usable webpage text was found."
    );
  }

  const sourceUrl =
    extractPageUrl(text);

  /*
   * Try common labeled values first.
   */
  const soldPrice =
    extractLabelValue(
      text,
      [
        "Sold Price",
        "Sale Price",
        "Final Price",
        "Price Realized",
        "Sold For",
        "Price",
      ]
    );

  const soldDate =
    extractLabelValue(
      text,
      [
        "Sold Date",
        "Sale Date",
        "Date Sold",
        "End Date",
        "Ended",
      ]
    );

  const certNumber =
    clean(
      text.match(
        /\b(?:cert(?:ification)?(?:\s*(?:number|no\.?|#))?)\s*:?\s*(\d{6,12})\b/i
      )?.[1]
    );

  const serialNumber =
    clean(
      text.match(
        /\b(\d{1,6}\s*\/\s*(?:\d{1,6}|xx))\b/i
      )?.[1]
    ).replace(
      /\s+/g,
      ""
    );

  /*
   * Find the most likely card title.
   *
   * Prefer a reasonably long line containing a year.
   */
  let title =
    lines.find(
      (line) =>
        /\b(?:19|20)\d{2}(?:-\d{2})?\b/.test(
          line
        ) &&
        line.length >= 15 &&
        !/^https?:\/\//i.test(
          line
        ) &&
        !/sold price|sold date|listing type|feedback|population|^pop$/i.test(
          line
        )
    ) || "";

  /*
   * If no year-based title was found, use the first
   * substantial line that doesn't look like metadata.
   */
  if (!title) {
    title =
      lines.find(
        (line) =>
          line.length >= 15 &&
          !/^https?:\/\//i.test(
            line
          ) &&
          !/sold price|sold date|listing type|feedback|population|^pop$/i.test(
            line
          )
      ) || "";
  }

  if (!title) {
    throw new Error(
      "The page text was copied successfully, but a card title could not be identified. Enter the card information manually."
    );
  }

  /*
   * Detect the source loosely from the copied text.
   */
  let marketplace =
    "generic-text";

  if (
    /\bebay\b/i.test(text)
  ) {
    marketplace =
      "ebay-text";
  } else if (
    /\bgoldin\b/i.test(text)
  ) {
    marketplace =
      "goldin-text";
  } else if (
    /\bfanatics\b/i.test(text)
  ) {
    marketplace =
      "fanatics-text";
  } else if (
    /\binstagram\b/i.test(text)
  ) {
    marketplace =
      "instagram-text";
  } else if (
    /\bfacebook\b/i.test(text)
  ) {
    marketplace =
      "facebook-text";
  }

  /*
   * Find a grading company/grade when it appears
   * anywhere in the copied title or page text.
   */
  const gradeMatch =
    text.match(
      /\b(PSA|BGS|SGC|CGC)\s+(AUTH(?:ENTIC)?(?:\s+ALTERED)?|GEM\s+MINT\s+10|MINT\s+9|NM-MT\s+8|NM\s+7|EX-MT\s+6|EX\s+5|VG-EX\s+4|VG\s+3|GOOD\s+2|POOR\s+1|\d+(?:\.\d+)?)\b/i
    );

  const grade =
    gradeMatch
      ? clean(
          gradeMatch[0]
        )
          .replace(
            /\bAUTH\b/i,
            "Authentic"
          )
      : "";

  const numericPrice =
    clean(soldPrice)
      .replace(
        /[$,\s]/g,
        ""
      );

  return addNormalizedCardFields({
    ok: true,

    marketplace,

    sourceUrl,

    listingId: "",

    title,

    seller: "",

    price:
      /^\d+(?:\.\d+)?$/.test(
        numericPrice
      )
        ? numericPrice
        : "",

    currency:
      /\$/i.test(soldPrice)
        ? "USD"
        : "",

    endDate:
      parseDate(
        soldDate
      ),

    certNumber,

    grade,

    serialNumber,

    description: "",

    frontImage: "",

    additionalImages: [],

    aspects: {},
  });
}

export async function importPageText(
  copiedText: string,
  originalUrl = "",
  copiedHtml = ""
): Promise<PageTextImportResult> {
  const text =
    normalizeCopiedPageText(
      copiedText
    );

  if (
    !text &&
    !clean(copiedHtml)
  ) {
    throw new Error(
      "Paste copied webpage text before importing."
    );
  }

  const normalized =
    `${text}\n${copiedHtml}`
      .toLowerCase();

  const normalizedUrl =
    clean(originalUrl)
      .toLowerCase();

  const looksLikeBlowout =
    normalizedUrl.includes(
      "blowoutforums.com"
    ) ||
    normalized.includes(
      "blowoutforums.com"
    ) ||
    normalized.includes(
      "post_message_"
    );

  if (looksLikeBlowout) {
    return parseBlowoutPageText(
      copiedText,
      originalUrl,
      copiedHtml
    );
  }

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

  return parseGenericPageText(
  text
);
}