import { NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl = String(body?.url || "").trim();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "An image URL is required." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "The image URL is invalid." },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS image URLs are supported." },
        { status: 400 }
      );
    }

    const response = await fetch(parsedUrl.toString(), {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TiffanyCards-TNCE/1.0)",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Unable to download the image. The source returned ${response.status}.`,
        },
        { status: 400 }
      );
    }

    const contentType = String(
      response.headers.get("content-type") || ""
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "The supplied URL did not return an image." },
        { status: 400 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "The linked image is too large." },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return NextResponse.json({
      dataUrl: `data:${contentType};base64,${base64}`,
      contentType,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message || "Unable to retrieve the linked image.",
      },
      { status: 500 }
    );
  }
}