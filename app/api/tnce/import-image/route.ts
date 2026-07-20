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
          "Mozilla/5.0 (compatible; TiffanyCards/1.0)",
        Accept: "image/avif,image/webp,image/jpeg,image/png,image/*",
      },
    });

    if (!imageResponse.ok) {
      throw new Error(
        `Unable to retrieve image (${imageResponse.status}).`
      );
    }

    const contentType =
      imageResponse.headers.get("content-type") ||
      "image/jpeg";

    if (!contentType.startsWith("image/")) {
      throw new Error(
        "The imported URL did not return an image."
      );
    }

    const arrayBuffer =
      await imageResponse.arrayBuffer();

    const base64 = Buffer.from(arrayBuffer).toString(
      "base64"
    );

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