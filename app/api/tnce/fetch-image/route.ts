import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES =
  25 * 1024 * 1024;

function cleanImageUrl(
  value: unknown
) {
  const text =
    String(value || "")
      .replace(
        /[\u200B-\u200D\uFEFF]/g,
        ""
      )
      .trim();

  const match =
    text.match(
      /https?:\/\/[^\s"'<>]+/i
    );

  return match
    ? match[0]
    : text;
}

function refererForImage(
  parsedUrl: URL
) {
  const hostname =
    parsedUrl.hostname.toLowerCase();

  if (
    hostname ===
    "d1htnxwo4o0jhw.cloudfront.net"
  ) {
    return "https://www.psacard.com/";
  }

  return (
    parsedUrl.protocol +
    "//" +
    parsedUrl.hostname +
    "/"
  );
}

function detectImageType(
  buffer: Buffer
) {
  const firstBytes =
    buffer.subarray(0, 12);

  if (
    firstBytes[0] === 0xff &&
    firstBytes[1] === 0xd8 &&
    firstBytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    firstBytes[0] === 0x89 &&
    firstBytes[1] === 0x50 &&
    firstBytes[2] === 0x4e &&
    firstBytes[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    firstBytes.toString(
      "ascii",
      0,
      4
    ) === "RIFF" &&
    firstBytes.toString(
      "ascii",
      8,
      12
    ) === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    firstBytes.toString(
      "ascii",
      0,
      3
    ) === "GIF"
  ) {
    return "image/gif";
  }

  return "";
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const rawUrl =
      typeof body?.url === "string"
        ? body.url
        : body?.url?.url;

    const imageUrl =
      cleanImageUrl(rawUrl);

    if (!imageUrl) {
      return NextResponse.json(
        {
          error:
            "An image URL is required.",
        },
        {
          status: 400,
        }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl =
        new URL(imageUrl);
    } catch {
      return NextResponse.json(
        {
          error:
            "The image URL is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !["http:", "https:"].includes(
        parsedUrl.protocol
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only HTTP and HTTPS image URLs are supported.",
        },
        {
          status: 400,
        }
      );
    }

    const response =
      await fetch(
        parsedUrl.toString(),
        {
          redirect: "follow",
          cache: "no-store",

          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",

            Accept:
              "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8",

            Referer:
              refererForImage(
                parsedUrl
              ),
          },
        }
      );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            `Unable to download the image. The source returned ${response.status}.`,
        },
        {
          status: 400,
        }
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

console.log(
  "Downloaded image:",
  parsedUrl.toString(),
  "Size:",
  arrayBuffer.byteLength,
  "bytes"
);

    if (
      arrayBuffer.byteLength >
      MAX_IMAGE_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            "The linked image is too large.",
        },
        {
          status: 400,
        }
      );
    }

    const buffer =
      Buffer.from(arrayBuffer);

    const headerContentType =
      String(
        response.headers.get(
          "content-type"
        ) || ""
      )
        .split(";")[0]
        .trim()
        .toLowerCase();

    const detectedContentType =
      detectImageType(buffer);

    const contentType =
      headerContentType.startsWith(
        "image/"
      )
        ? headerContentType
        : detectedContentType;

    if (!contentType) {
      return NextResponse.json(
        {
          error:
            "The supplied URL did not return an image.",
        },
        {
          status: 400,
        }
      );
    }

    const base64 =
      buffer.toString("base64");

    return NextResponse.json({
      dataUrl:
        `data:${contentType};base64,` +
        base64,

      contentType,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to retrieve the linked image.",
      },
      {
        status: 500,
      }
    );
  }
}