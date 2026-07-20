import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = [
  "ebayimg.com",
  "i.ebayimg.com",
  "thumbs.ebaystatic.com",
  "goldin.co",
  "images.goldin.co",
  "cloudfront.net",
  "fanaticscollect.com",
  "heritagestatic.com",
];

function isAllowedHost(hostname: string) {
  const normalized = hostname.toLowerCase();

  return ALLOWED_HOSTS.some(
    (host) =>
      normalized === host ||
      normalized.endsWith(`.${host}`)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageUrl = String(body?.url || "").trim();

    if (!imageUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing image URL.",
        },
        {
          status: 400,
        }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid image URL.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      parsedUrl.protocol !== "https:" ||
      !isAllowedHost(parsedUrl.hostname)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "This image host is not supported.",
        },
        {
          status: 400,
        }
      );
    }

    const imageResponse = await fetch(parsedUrl.toString(), {
  cache: "no-store",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
    Accept:
      "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    Referer: "https://goldin.co/",
     },
});

    if (!imageResponse.ok) {
  throw new Error(
    `Unable to retrieve image (${imageResponse.status}) from ${parsedUrl.hostname}\n${parsedUrl}`
  );
}

    const arrayBuffer =
  await imageResponse.arrayBuffer();

const buffer = Buffer.from(arrayBuffer);

let contentType =
  imageResponse.headers.get("content-type") || "";

if (!contentType.startsWith("image/")) {
  const firstBytes = buffer.subarray(0, 12);

  const isJpeg =
    firstBytes[0] === 0xff &&
    firstBytes[1] === 0xd8 &&
    firstBytes[2] === 0xff;

  const isPng =
    firstBytes[0] === 0x89 &&
    firstBytes[1] === 0x50 &&
    firstBytes[2] === 0x4e &&
    firstBytes[3] === 0x47;

  const isWebp =
    firstBytes.toString("ascii", 0, 4) === "RIFF" &&
    firstBytes.toString("ascii", 8, 12) === "WEBP";

  const isGif =
    firstBytes.toString("ascii", 0, 3) === "GIF";

  if (isJpeg) {
    contentType = "image/jpeg";
  } else if (isPng) {
    contentType = "image/png";
  } else if (isWebp) {
    contentType = "image/webp";
  } else if (isGif) {
    contentType = "image/gif";
  } else {
    throw new Error(
  `The imported URL did not return a recognized image.
Content-Type: ${contentType || "unknown"}
First bytes: ${buffer.subarray(0, 16).toString("hex")}`
);
  }
}

const base64 = buffer.toString("base64");

    return NextResponse.json({
      ok: true,
      contentType,
      base64: `data:${contentType};base64,${base64}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to import the image.",
      },
      {
        status: 500,
      }
    );
  }
}