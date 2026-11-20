import { createHash } from "node:crypto";
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

type ImageIdentity =
  | { kind: "modern"; imageId: string }
  | { kind: "legacy"; imageId: string; sizeToken: string };

function cleanUrl(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\\\$/g, "$")
    .trim();
}

function identifyImage(url: URL): ImageIdentity | null {
  const modern = url.pathname.match(
    /^\/(?:thumbs\/)?images\/g\/([A-Za-z0-9_-]+)\/s-l\d+\.(?:jpe?g|webp|png)$/i
  );
  if (modern) return { kind: "modern", imageId: modern[1] };

  const legacy = url.pathname.match(
  /^\/00\/s\/([A-Za-z0-9_=-]+)\/z\/([A-Za-z0-9_-]+)\/\$_\d+\.(?:jpe?g|webp|png)$/i
);
  if (legacy) {
    return { kind: "legacy", imageId: legacy[2], sizeToken: legacy[1] };
  }
  return null;
}

function buildCandidates(input: URL, image: ImageIdentity): string[] {
  const urls = [input.toString()];
  if (image.kind === "modern") {
    for (const size of [1600, 1200, 1000, 800, 500, 300, 225]) {
      for (const extension of ["jpg", "webp"]) {
        urls.push(
          `https://i.ebayimg.com/images/g/${image.imageId}/s-l${size}.${extension}`
        );
      }
    }
  } else {
    const base = `https://i.ebayimg.com/00/s/${image.sizeToken}/z/${image.imageId}`;
    for (const number of [57, 3, 12, 32, 1]) {
      urls.push(`${base}/$_${number}.JPG${input.search}`);
    }
  }
  return [...new Set(urls)];
}

// Reads real pixel dimensions directly from image headers.
// No Sharp, libvips, or other native image library is required.
function readImageMetadata(buffer: Buffer): {
  width: number | null;
  height: number | null;
  format: string | null;
} {
  const unknown = { width: null, height: null, format: null };
  try {
    // PNG: dimensions in IHDR.
    if (
      buffer.length >= 24 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      )
    ) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
        format: "png",
      };
    }

    // GIF: little-endian logical screen dimensions.
    if (
      buffer.length >= 10 &&
      ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))
    ) {
      return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
        format: "gif",
      };
    }

    // WebP: VP8, VP8L, or VP8X.
    if (
      buffer.length >= 30 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      const kind = buffer.toString("ascii", 12, 16);
      if (kind === "VP8 ") {
        return {
          width: buffer.readUInt16LE(26) & 0x3fff,
          height: buffer.readUInt16LE(28) & 0x3fff,
          format: "webp",
        };
      }
      if (kind === "VP8L") {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        return {
          width: 1 + (((b2 & 0x3f) << 8) | b1),
          height: 1 + ((b3 << 6) | (b2 >> 6)),
          format: "webp",
        };
      }
      if (kind === "VP8X") {
        return {
          width: 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16),
          height: 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16),
          format: "webp",
        };
      }
      return { width: null, height: null, format: "webp" };
    }

    // JPEG: scan segment markers until a Start Of Frame marker.
    if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset + 4 <= buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        while (offset < buffer.length && buffer[offset] === 0xff) offset++;
        if (offset >= buffer.length) break;
        const marker = buffer[offset++];
        if (marker === 0xd9 || marker === 0xda) break;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
        if (offset + 2 > buffer.length) break;
        const length = buffer.readUInt16BE(offset);
        if (length < 2 || offset + length > buffer.length) break;
        if (
          [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
            0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) &&
          length >= 7
        ) {
          return {
            height: buffer.readUInt16BE(offset + 3),
            width: buffer.readUInt16BE(offset + 5),
            format: "jpeg",
          };
        }
        offset += length;
      }
      return { width: null, height: null, format: "jpeg" };
    }
    return unknown;
  } catch {
    return unknown;
  }
}

function failed(url: string, status = 0, contentType = ""): CandidateResult {
  return {
    url, ok: false, status, contentType,
    bytes: null, width: null, height: null, format: null, fingerprint: null,
  };
}

async function testCandidate(url: string): Promise<CandidateResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        Referer: "https://www.ebay.com/",
      },
    });
    const contentType = (response.headers.get("content-type") || "")
      .split(";")[0].trim().toLowerCase();
    if (!response.ok || !contentType.startsWith("image/")) {
      await response.body?.cancel().catch(() => undefined);
      return failed(url, response.status, contentType);
    }

    const maxBytes = 20 * 1024 * 1024;
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      return failed(url, response.status, contentType);
    }
    if (!response.body) return failed(url, response.status, contentType);

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          return failed(url, response.status, contentType);
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    const buffer = Buffer.concat(chunks);
    const metadata = readImageMetadata(buffer);
    if (!metadata.width || !metadata.height) {
      return failed(url, response.status, contentType);
    }
    return {
      url, ok: true, status: response.status, contentType,
      bytes: buffer.length,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      fingerprint: createHash("sha256").update(buffer).digest("hex"),
    };
  } catch (error) {
    console.warn("eBay image candidate failed:", url, error);
    return failed(url);
  } finally {
    clearTimeout(timeout);
  }
}

function compareImages(a: CandidateResult, b: CandidateResult): number {
  const aPixels = (a.width || 0) * (a.height || 0);
  const bPixels = (b.width || 0) * (b.height || 0);
  return bPixels - aPixels || (b.bytes || 0) - (a.bytes || 0);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputUrl = cleanUrl(body?.url);
    if (!inputUrl) {
      return NextResponse.json(
        { error: "An eBay image URL is required." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(inputUrl);
    } catch {
      return NextResponse.json(
        { error: "The supplied URL is invalid." },
        { status: 400 }
      );
    }
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname.toLowerCase() !== "i.ebayimg.com"
    ) {
      return NextResponse.json(
        { error: "This tool supports HTTPS i.ebayimg.com image URLs only." },
        { status: 400 }
      );
    }

    const identity = identifyImage(parsedUrl);
    if (!identity) {
      return NextResponse.json(
        { error: "Unrecognized eBay image format. Supported: /images/g/... and /00/s/.../z/..." },
        { status: 400 }
      );
    }

    const candidateUrls = buildCandidates(parsedUrl, identity);
    const tested: CandidateResult[] = [];
    // Limit simultaneous downloads and stay within serverless time limits.
    for (let index = 0; index < candidateUrls.length; index += 3) {
      const batch = await Promise.all(
        candidateUrls.slice(index, index + 3).map(testCandidate)
      );
      tested.push(...batch);
    }

    const available = tested.filter((item) => item.ok);
    const groups = new Map<string, CandidateResult[]>();
    for (const item of available) {
      const key = item.fingerprint || item.url;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    const uniqueImages = [...groups.values()]
      .map((group) => ({
        ...[...group].sort(compareImages)[0],
        aliases: group.map((item) => item.url),
      }))
      .sort(compareImages);

    return NextResponse.json(
      {
        inputUrl,
        imageId: identity.imageId,
        imageFormat: identity.kind,
        best: uniqueImages[0] || null,
        uniqueImages,
        available,
        tested,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("eBay Image Finder API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Unable to inspect the eBay image.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
