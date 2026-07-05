const COMPANY_ORDER = [
  "PSA",
  "BGS",
  "SGC",
  "CGC",
  "CSG",
  "TAG",
  "HGA",
  "GMA",
  "ISA",
  "MNT",
  "MGA",
  "ACE",
  "MBA",
  "KSA",
  "RARE EDITION",
];

export function parseGradeValue(grade: any) {
  const text = String(grade || "").trim().toUpperCase();

  if (!text || text === "RAW") return -999;

  if (text.includes("BLACK LABEL")) return 1000;
  if (text.includes("PRISTINE")) return 999;
  if (text.includes("GEM MINT")) return 998;
  if (text.includes("AUTHENTIC")) return 1;
  if (text.includes("ALTERED")) return 0;
  if (text.includes("TRIM")) return 0;

  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return -998;

  return Number(match[1]);
}

export function parseGradeCompany(grade: any) {
  const text = String(grade || "").trim().toUpperCase();

  const known = COMPANY_ORDER.find((company) => text.includes(company));

  if (known) return known;

  const firstWord = text.split(/\s+/)[0];

  return firstWord || "UNKNOWN";
}

export function gradeCompanyRank(company: any) {
  const text = String(company || "").trim().toUpperCase();
  const index = COMPANY_ORDER.indexOf(text);

  return index === -1 ? 999 : index;
}

export function compareGradesHighestFirst(a: any, b: any) {
  const gradeA = parseGradeValue(a?.Grade);
  const gradeB = parseGradeValue(b?.Grade);

  if (gradeA !== gradeB) return gradeB - gradeA;

  const companyA = parseGradeCompany(a?.Grade);
  const companyB = parseGradeCompany(b?.Grade);

  const companyRankA = gradeCompanyRank(companyA);
  const companyRankB = gradeCompanyRank(companyB);

  if (companyRankA !== companyRankB) {
    return companyRankA - companyRankB;
  }

  return companyA.localeCompare(companyB);
}