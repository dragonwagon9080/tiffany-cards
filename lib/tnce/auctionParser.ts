export type ParsedAuctionTitle = {
  serialNumber: string;
  grade: string;
  gradingCompany: string;
};

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSerialNumber(title: string) {
  /*
   * Matches:
   * 19/25
   * 19 / 25
   * #19/25
   * No. 19/25
   *
   * Prevents card numbers such as #158 from being treated
   * as serial numbers because a denominator is required.
   */
  const match = title.match(
    /(?:#|no\.?\s*)?(\d{1,5})\s*\/\s*(\d{1,5})\b/i
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
  /*
   * Longer company names should appear before shorter names.
   *
   * Matches examples such as:
   * PSA 10
   * BGS 8.5
   * SGC 9.5
   * CSG 9
   * CGC 10
   * TAG 10
   * HGA 9.5
   * Beckett 8.5
   */
  const companyPattern =
    "BECKETT|PSA|BGS|SGC|CGC|CSG|TAG|HGA";

  const match = title.match(
    new RegExp(
      `\\b(${companyPattern})\\s*(?:MINT|GEM\\s*MINT|PRISTINE)?\\s*(10(?:\\.0)?|[1-9](?:\\.5|\\.0)?)\\b`,
      "i"
    )
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

  const numericGrade = String(
    Number(match[2])
  );

  return {
    grade: `${gradingCompany} ${numericGrade}`,
    gradingCompany,
  };
}

export function parseAuctionTitle(
  value: unknown
): ParsedAuctionTitle {
  const title = clean(value);

  if (!title) {
    return {
      serialNumber: "",
      grade: "",
      gradingCompany: "",
    };
  }

  const gradeResult = parseGrade(title);

  return {
    serialNumber: parseSerialNumber(title),
    grade: gradeResult.grade,
    gradingCompany:
      gradeResult.gradingCompany,
  };
}