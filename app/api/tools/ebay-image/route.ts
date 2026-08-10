import {
  NextRequest,
  NextResponse,
} from "next/server";

import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CandidateResult = {
  url: string;
  ok: boolean;
  status: number;
  contentType: string;
  bytes: number | null;
  width: number | null;
  height: number | null;
  format: string | null;
  fingerprint: string | null;
};

function cleanUrl(value: unknown) {
  return String(value || "")
    .replace(
      /[\u200B-\u200D\uFEFF]/g,
      ""
    )
    .trim();
}

function extractEbayImageId(
  input: string
) {
  const match =
    input.match(
      /i\.ebayimg\.com\/(?:thumbs\/)?images\/g\/([^/]+)\//i
    );

  return match?.[1] || "";
}

async function testCandidate(
  url: string
): Promise<CandidateResult> {
  try {
    const response = await fetch(
      url,
      {
        method: "GET",
        redirect: "follow",
        cache: "no-store",

        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",

          Accept:
            "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8",

          Referer:
            "https://www.ebay.com/",
        },
      }
    );

    const contentType =
      String(
        response.headers.get(
          "content-type"
        ) || ""
      )
        .split(";")[0]
        .trim()
        .toLowerCase();

    if (
      !response.ok ||
      !contentType.startsWith(
        "image/"
      )
    ) {
      return {
        url,
        ok: false,
        status: response.status,
        contentType,
        bytes: null,
        width: null,
        height: null,
        format: null,
        fingerprint: null,
      };
    }

    const arrayBuffer =
      await response.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    let width: number | null =
      null;

    let height: number | null =
      null;

    let format: string | null =
      null;

    try {
      const metadata =
        await sharp(
          buffer
        ).metadata();

      width =
        metadata.width || null;

      height =
        metadata.height || null;

      format =
        metadata.format || null;
    } catch {
      // Keep dimensions null if
      // Sharp cannot inspect it.
    }

    // Simple fingerprint to identify
    // duplicate responses.
    const fingerprint =
      `${buffer.length}:` +
      buffer
        .subarray(
          0,
          Math.min(
            buffer.length,
            64
          )
        )
        .toString("base64");

    return {
      url,
      ok: true,
      status: response.status,
      contentType,
      bytes: buffer.length,
      width,
      height,
      format,
      fingerprint,
    };
  } catch {
    return {
      url,
      ok: false,
      status: 0,
      contentType: "",
      bytes: null,
      width: null,
      height: null,
      format: null,
      fingerprint: null,
    };
  }
}

function scoreCandidate(
  item: CandidateResult
) {
  const width =
    item.width || 0;

  const height =
    item.height || 0;

  const pixels =
    width * height;

  const bytes =
    item.bytes || 0;

  const formatBonus =
    item.contentType ===
    "image/jpeg"
      ? 1
      : 0;

  return (
    pixels * 1000000000 +
    bytes * 10 +
    formatBonus
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const inputUrl =
      cleanUrl(body?.url);

    if (!inputUrl) {
      return NextResponse.json(
        {
          error:
            "An eBay image URL is required.",
        },
        {
          status: 400,
        }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl =
        new URL(inputUrl);
    } catch {
      return NextResponse.json(
        {
          error:
            "The supplied URL is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    const hostname =
      parsedUrl.hostname.toLowerCase();

    if (
      hostname !==
      "i.ebayimg.com"
    ) {
      return NextResponse.json(
        {
          error:
            "This tool currently supports i.ebayimg.com image URLs only.",
        },
        {
          status: 400,
        }
      );
    }

    const imageId =
      extractEbayImageId(
        inputUrl
      );

    if (!imageId) {
      return NextResponse.json(
        {
          error:
            "Unable to identify the eBay image ID from this URL.",
        },
        {
          status: 400,
        }
      );
    }

    const sizes = [
      1600,
      1200,
      1000,
      800,
      500,
      300,
      225,
    ];

    const extensions = [
      "webp",
      "jpg",
    ];

    const candidateUrls: string[] =
      [];

    for (const size of sizes) {
      for (
        const extension of extensions
      ) {
        candidateUrls.push(
          `https://i.ebayimg.com/images/g/${imageId}/s-l${size}.${extension}`
        );
      }
    }

    const tested =
      await Promise.all(
        candidateUrls.map(
          testCandidate
        )
      );

    const available =
      tested.filter(
        (item) => item.ok
      );

    // Group identical returned files.
    const duplicateGroups =
      new Map<
        string,
        CandidateResult[]
      >();

    for (
      const item of available
    ) {
      const key =
        item.fingerprint ||
        item.url;

      if (
        !duplicateGroups.has(
          key
        )
      ) {
        duplicateGroups.set(
          key,
          []
        );
      }

      duplicateGroups
        .get(key)!
        .push(item);
    }

    const uniqueImages =
      Array.from(
        duplicateGroups.values()
      ).map(
        (group) => {
          const sorted =
            [...group].sort(
              (a, b) =>
                scoreCandidate(b) -
                scoreCandidate(a)
            );

          const representative =
            sorted[0];

          return {
            ...representative,

            aliases:
              group.map(
                (item) =>
                  item.url
              ),
          };
        }
      );

    uniqueImages.sort(
      (a, b) =>
        scoreCandidate(b) -
        scoreCandidate(a)
    );

    const best =
      uniqueImages[0] ||
      null;

    return NextResponse.json({
      inputUrl,
      imageId,
      best,
      uniqueImages,
      available,
      tested,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to inspect the eBay image.",
      },
      {
        status: 500,
      }
    );
  }
}