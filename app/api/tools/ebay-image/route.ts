
import { createHash } from "node:crypto";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

function cleanUrl(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\\\$/g, "$")
    .trim();
}

type EbayImage =
  | { kind: "modern"; imageId: string }
  | { kind: "legacy"; imageId: string; sizeToken: string };

function identifyImage(url: URL): EbayImage | null {
  const modern = url.pathname.match(
    /^\/(?:thumbs\/)?images\/g\/([A-Za-z0-9_-]+)\/s-l\d+\.(?:jpe?g|webp|png)$/i
  );

  if (modern) {
    return {
      kind: "modern",
      imageId: modern[1],
    };
  }

  const legacy = url.pathname.match(
    /^\/00\/s\/([A-Za-z0-9_-]+)\/z\/([A-Za-z0-9_-]+)\/\$_\d+\.(?:jpe?g|webp|png)$/i
  );

  if (legacy) {
    return {
      kind: "legacy",
      imageId: legacy[2],
      sizeToken: legacy[1],
    };
  }

  return null;
}

function buildCandidates(
  input: URL,
  image: EbayImage
): string[] {
  const urls: string[] = [input.toString()];

  if (image.kind === "modern") {
    const sizes = [
      1600,
      1200,
      1000,
      800,
      500,
      300,
      225,
    ];

    const extensions = ["webp", "jpg"];

    for (const size of sizes) {
      for (const extension of extensions) {
        urls.push(
          `https://i.ebayimg.com/images/g/${image.imageId}/s-l${size}.${extension}`
        );
      }
    }
  } else {
    // Preserve the original legacy image ID and size path.
    const base =
      `https://i.ebayimg.com/00/s/${image.sizeToken}` +
      `/z/${image.imageId}`;

    const query = input.search;

    const variants = [57, 3, 12, 32, 1];

    for (const number of variants) {
      urls.push(
        `${base}/$_${number}.JPG${query}`
      );
    }
  }

  return [...new Set(urls)];
}

function failed(
  url: string,
  status = 0,
  contentType = ""
): CandidateResult {
  return {
    url,
    ok: false,
    status,
    contentType,
    bytes: null,
    width: null,
    height: null,
    format: null,
    fingerprint: null,
  };
}

async function testCandidate(
  url: string
): Promise<CandidateResult> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    8000
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",

        Accept:
          "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8",

        Referer: "https://www.ebay.com/",
      },
    });

    const contentType = (
      response.headers.get("content-type") || ""
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (
      !response.ok ||
      !contentType.startsWith("image/")
    ) {
      await response.body
        ?.cancel()
        .catch(() => undefined);

      return failed(
        url,
        response.status,
        contentType
      );
    }

    // Prevent unexpectedly large images from
    // consuming excessive server memory.
    const maxBytes = 20 * 1024 * 1024;

    const declaredLength = Number(
      response.headers.get("content-length") || 0
    );

    if (declaredLength > maxBytes) {
      await response.body
        ?.cancel()
        .catch(() => undefined);

      return failed(
        url,
        response.status,
        contentType
      );
    }

    const chunks: Buffer[] = [];
    let total = 0;

    if (!response.body) {
      return failed(
        url,
        response.status,
        contentType
      );
    }

    const reader = response.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        total += value.byteLength;

        if (total > maxBytes) {
          await reader.cancel();

          return failed(
            url,
            response.status,
            contentType
          );
        }

        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    const buffer = Buffer.concat(chunks);

    // Read actual image dimensions.
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return failed(
        url,
        response.status,
        contentType
      );
    }

    // SHA-256 identifies identical image files
    // returned through different eBay URLs.
    const fingerprint = createHash("sha256")
      .update(buffer)
      .digest("hex");

    return {
      url,
      ok: true,
      status: response.status,
      contentType,
      bytes: buffer.length,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format || null,
      fingerprint,
    };
  } catch (error) {
    console.warn(
      "eBay image candidate failed:",
      url,
      error
    );

    return failed(url);
  } finally {
    clearTimeout(timeout);
  }
}

function compareImages(
  a: CandidateResult,
  b: CandidateResult
): number {
  const aPixels =
    (a.width || 0) * (a.height || 0);

  const bPixels =
    (b.width || 0) * (b.height || 0);

  // Rank actual dimensions first,
  // then use file size as the tie-breaker.
  return (
    bPixels - aPixels ||
    (b.bytes || 0) - (a.bytes || 0)
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const inputUrl = cleanUrl(body?.url);

    if (!inputUrl) {
      return NextResponse.json(
        {
          error: "An eBay image URL is required.",
        },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(inputUrl);
    } catch {
      return NextResponse.json(
        {
          error: "The supplied URL is invalid.",
        },
        { status: 400 }
      );
    }

    // Only allow eBay's image host.
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname.toLowerCase() !==
        "i.ebayimg.com"
    ) {
      return NextResponse.json(
        {
          error:
            "This tool supports HTTPS i.ebayimg.com image URLs only.",
        },
        { status: 400 }
      );
    }

    const image = identifyImage(parsedUrl);

    if (!image) {
      return NextResponse.json(
        {
          error:
            "Unrecognized eBay image format. Supported: /images/g/... and /00/s/.../z/...",
        },
        { status: 400 }
      );
    }

    const candidateUrls = buildCandidates(
      parsedUrl,
      image
    );

    const tested: CandidateResult[] = [];

    // Test in small batches to limit memory use.
    for (
      let index = 0;
      index < candidateUrls.length;
      index += 3
    ) {
      const batch = await Promise.all(
        candidateUrls
          .slice(index, index + 3)
          .map(testCandidate)
      );

      tested.push(...batch);
    }

    const available = tested.filter(
      (item) => item.ok
    );

    // Group URLs returning identical files.
    const duplicateGroups = new Map<
      string,
      CandidateResult[]
    >();

    for (const item of available) {
      const key =
        item.fingerprint || item.url;

      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }

      duplicateGroups.get(key)!.push(item);
    }

    const uniqueImages = [
      ...duplicateGroups.values(),
    ]
      .map((group) => ({
        ...[...group].sort(compareImages)[0],
        aliases: group.map((item) => item.url),
      }))
      .sort(compareImages);

    const best = uniqueImages[0] || null;

    return NextResponse.json(
      {
        inputUrl,
        imageId: image.imageId,
        imageFormat: image.kind,
        best,
        uniqueImages,
        available,
        tested,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "eBay Image Finder API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to inspect the eBay image.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
