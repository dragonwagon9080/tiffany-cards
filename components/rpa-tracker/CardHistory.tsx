"use client";

type Props = {
  history: string;
};

type HistoryEntry = {
  date?: string;
  body: string;
};

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function formatDate(month: number, day: number, year: number) {
  if (year < 100) year += 2000;

  const date = new Date(year, month, day);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function extractDate(line: string) {
  const text = line.trim();

  const numeric = text.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(.*)$/i
  );

  if (numeric) {
    const date = formatDate(
      Number(numeric[1]) - 1,
      Number(numeric[2]),
      Number(numeric[3])
    );

    return {
      date,
      rest: numeric[4].trim(),
    };
  }

  const written = text.match(
    /^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{2,4})(.*)$/i
  );

  if (written) {
    const monthKey = written[1].toLowerCase();
    const month = MONTHS[monthKey];

    if (month !== undefined) {
      return {
        date: formatDate(month, Number(written[2]), Number(written[3])),
        rest: written[4].trim(),
      };
    }
  }

  const reverseWritten = text.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?,?\s+(\d{2,4})(.*)$/i
  );

  if (reverseWritten) {
    const monthKey = reverseWritten[2].toLowerCase();
    const month = MONTHS[monthKey];

    if (month !== undefined) {
      return {
        date: formatDate(month, Number(reverseWritten[1]), Number(reverseWritten[3])),
        rest: reverseWritten[4].trim(),
      };
    }
  }

  return {
    date: "",
    rest: line,
  };
}

function startsWithDate(line: string) {
  return Boolean(extractDate(line).date);
}

function sourceLabel(url: string) {
  const lower = url.toLowerCase();

  if (lower.includes("ebay.")) return "eBay →";
  if (lower.includes("goldin.co")) return "Goldin →";
  if (lower.includes("heritage")) return "Heritage →";
  if (lower.includes("fanatics")) return "Fanatics Collect →";
  if (lower.includes("pwcc")) return "PWCC →";
  if (lower.includes("myslabs")) return "MySlabs →";
  if (lower.includes("comc")) return "COMC →";
  if (lower.includes("facebook")) return "Facebook →";
  if (lower.includes("instagram")) return "Instagram →";
  if (lower.includes("twitter") || lower.includes("x.com")) return "X →";

  return "View Source →";
}

function psaCertUrl(cert: string) {
  return `https://www.psacard.com/cert/${encodeURIComponent(cert)}`;
}

function normalizeGradeCert(text: string) {
  return text.replace(
    /\b(PSA|BGS|SGC|CGC|MBA)\s+(.+?)\s+(?:cert\s*#?\s*)?(\d{5,})(?=\s|$)/gi,
    (_match, company, grade, cert) =>
      `${company.toUpperCase()} ${grade.trim()} cert# ${cert}`
  );
}

function parseEntries(history: string): HistoryEntry[] {
  const rawLines = String(history || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: HistoryEntry[] = [];

  for (const line of rawLines) {
    const parsed = extractDate(line);

    if (parsed.date) {
      entries.push({
        date: parsed.date,
        body: parsed.rest,
      });
      continue;
    }

    if (!entries.length) {
      entries.push({
        body: line,
      });
    } else {
      entries[entries.length - 1].body += `\n${line}`;
    }
  }

  return entries;
}

function renderSourceText(text: string) {
  const normalized = normalizeGradeCert(text);

  const parts = normalized.split(
    /(https?:\/\/[^\s]+|\b(?:PSA|BGS|SGC|CGC|MBA)\s+[^•\n]*?cert\s*#\s*\d{5,}|\bebay\b|\bGoldin\b|\bHeritage\b|\bPWCC\b|\bFanatics Collect\b)/gi
  );

  return parts.map((part, index) => {
    if (!part) return null;

    if (/^https?:\/\//i.test(part)) {
      return (
  <span key={index}>
    <span className="mx-2 font-bold text-white">•</span>
    <a
      href={part}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-blue-400 underline hover:text-blue-300"
    >
      {sourceLabel(part)}
    </a>
  </span>
);
    }

    const gradeCert = part.match(
      /\b(PSA|BGS|SGC|CGC|MBA|Raw)\s+(.+?)?(?:\s+cert\s*#\s*(\d{5,}))?\b/i
    );

    if (gradeCert) {
      const company = gradeCert[1].toUpperCase();
      const grade = gradeCert[2];
      const cert = gradeCert[3];
      const label = `${company} ${grade} cert# ${cert}`;

      if (company === "PSA") {
        return (
          <a
            key={index}
            href={psaCertUrl(cert)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#d4af37] underline hover:text-[#fff6c4]"
          >
            {label}
          </a>
        );
      }

      return (
        <span key={index} className="font-bold text-[#d4af37]">
          {label}
        </span>
      );
    }

    if (/^ebay$/i.test(part)) {
  return (
    <span key={index}>
      <span className="mx-2 font-bold text-white">•</span>
      <span className="font-bold text-blue-400">
        eBay
      </span>
    </span>
  );
}

    if (/^(Goldin|Heritage|PWCC|Fanatics Collect)$/i.test(part)) {
  return (
    <span key={index}>
      <span className="mx-2 font-bold text-white">•</span>
      <span className="font-bold text-blue-400">
        {part}
      </span>
    </span>
  );
}
    if (/\bRaw\b/i.test(part)) {
  return (
    <span key={index} className="font-bold text-[#d4af37]">
      {part}
    </span>
  );
}

return (
  <span key={index} className="text-zinc-400">
    {part}
  </span>
);
  });
}

export default function CardHistory({ history }: Props) {
  const entries = parseEntries(history);

  if (!entries.length) return null;

  return (
    <section>
      <h2 className="mb-5 text-2xl font-black uppercase tracking-wide text-[#d4af37]">
        Card History
      </h2>

      <div className="space-y-5">
        {entries.map((entry, index) => {
          const bodyLines = entry.body
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

          return (
            <div
              key={index}
              className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-5"
            >
              <div className="space-y-2 text-base leading-7">
                {entry.date && (
                  <div>
                    <span className="font-bold text-white">{entry.date}</span>

                    {bodyLines.length > 0 && (
                      <span className="mx-2 font-bold text-white">•</span>
                    )}

                    {bodyLines[0] && renderSourceText(bodyLines[0])}
                  </div>
                )}

                {!entry.date &&
                  bodyLines.map((line, lineIndex) => (
                    <div key={lineIndex}>{renderSourceText(line)}</div>
                  ))}

                {entry.date &&
                  bodyLines.slice(1).map((line, lineIndex) => (
                    <div key={lineIndex} className="text-zinc-400">
                      {renderSourceText(line)}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}