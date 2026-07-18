import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITABLE_PRODUCTION_FIELDS = [
  "Card_Title",
  "Serial_Number",
  "Variation_Input",
  "Card_History",
  "Grade",
  "Cert_Number",
  "Front_Image",
  "Back_Image",
  "Other_Images",
] as const;

type EditableProductionField =
  (typeof EDITABLE_PRODUCTION_FIELDS)[number];

type ImageRole =
  | "front"
  | "back"
  | "additional";

type OrganizedImageInput = {
  id?: unknown;
  url?: unknown;
  role?: unknown;
  rotation?: unknown;
};

type CleanOrganizedImage = {
  id: string;
  url: string;
  role: ImageRole;
  rotation: number;
};

type PreparedRotatedImage = {
  originalUrl: string;
  role: ImageRole;
  rotation: number;
  fileName: string;
  contentType: "image/jpeg";
  base64: string;
};

type AppsScriptResponse = {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
};

function cleanProductionRecord(
  value: unknown
): Partial<
  Record<EditableProductionField, string>
> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const source =
    value as Record<string, unknown>;

  const cleaned: Partial<
    Record<EditableProductionField, string>
  > = {};

  for (
    const field of EDITABLE_PRODUCTION_FIELDS
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        source,
        field
      )
    ) {
      continue;
    }

    const rawValue = source[field];

    if (Array.isArray(rawValue)) {
      cleaned[field] = rawValue
        .map((item) =>
          String(item ?? "").trim()
        )
        .filter(Boolean)
        .join("\n");

      continue;
    }

    cleaned[field] = String(
      rawValue ?? ""
    ).trim();
  }

  return cleaned;
}

function normalizeRotation(
  value: unknown
): number {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const normalized =
    ((parsed % 360) + 360) % 360;

  return [0, 90, 180, 270].includes(
    normalized
  )
    ? normalized
    : 0;
}

function cleanRole(
  value: unknown
): ImageRole {
  const role = String(value || "")
    .trim()
    .toLowerCase();

  if (role === "front") {
    return "front";
  }

  if (role === "back") {
    return "back";
  }

  return "additional";
}

function cleanOrganizedImages(
  value: unknown
): CleanOrganizedImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (
        item: OrganizedImageInput
      ): CleanOrganizedImage => ({
        id: String(
          item?.id || ""
        ).trim(),

        url: String(
          item?.url || ""
        ).trim(),

        role: cleanRole(item?.role),

        rotation: normalizeRotation(
          item?.rotation
        ),
      })
    )
    .filter((image) => image.url);
}

function makeRotatedFileName(
  role: ImageRole,
  index: number
) {
  const suffix =
    role === "additional"
      ? `additional-${index + 1}`
      : role;

  return `${suffix}-rotated.jpg`;
}

async function prepareRotatedImages(
  organizedImages: CleanOrganizedImage[]
): Promise<PreparedRotatedImage[]> {
  const imagesToRotate =
    organizedImages.filter(
      (image) => image.rotation !== 0
    );

  const prepared: PreparedRotatedImage[] =
    [];

  for (
    let index = 0;
    index < imagesToRotate.length;
    index++
  ) {
    const image = imagesToRotate[index];

    const imageResponse = await fetch(
      image.url,
      {
        cache: "no-store",
      }
    );

    if (!imageResponse.ok) {
      throw new Error(
        `Unable to download image for rotation. Status: ${imageResponse.status}`
      );
    }

    const sourceBuffer = Buffer.from(
      await imageResponse.arrayBuffer()
    );

    const rotatedBuffer = await sharp(
      sourceBuffer
    )
      .rotate(image.rotation)
      .jpeg({
        quality: 90,
        mozjpeg: true,
      })
      .toBuffer();

    prepared.push({
      originalUrl: image.url,
      role: image.role,
      rotation: image.rotation,

      fileName: makeRotatedFileName(
        image.role,
        index
      ),

      contentType: "image/jpeg",

      base64:
        `data:image/jpeg;base64,` +
        rotatedBuffer.toString("base64"),
    });
  }

  return prepared;
}

export async function POST(
  req: NextRequest
) {
  try {
    const url =
      process.env.TNCE_APPS_SCRIPT_URL;

    const adminSecret =
      process.env.TNCE_ADMIN_SECRET;

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing TNCE_APPS_SCRIPT_URL environment variable.",
        },
        { status: 500 }
      );
    }

    if (!adminSecret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing TNCE_ADMIN_SECRET environment variable.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    const submissionId = String(
      body?.submissionId || ""
    ).trim();

    const reviewNotes = String(
      body?.reviewNotes || ""
    ).trim();

    const productionRecord =
      cleanProductionRecord(
        body?.productionRecord
      );

    const organizedImages =
      cleanOrganizedImages(
        body?.organizedImages
      );

    if (!submissionId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing submissionId.",
        },
        { status: 400 }
      );
    }

    const rotatedImages =
      await prepareRotatedImages(
        organizedImages
      );

    const scriptResponse = await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8",
        },

        body: JSON.stringify({
          action: "publish",
          adminSecret,
          submissionId,
          reviewNotes,
          productionRecord,
          organizedImages,
          rotatedImages,
        }),

        cache: "no-store",
        redirect: "follow",
      }
    );

    const responseText =
      await scriptResponse.text();

    console.log(
      "================================="
    );

    console.log(
      "TNCE Publish Status:",
      scriptResponse.status
    );

    console.log(
      "TNCE Publish Final URL:",
      scriptResponse.url
    );

    console.log(
      "TNCE Publish Response:"
    );

    console.log(responseText);

    console.log(
      "================================="
    );

    let data: AppsScriptResponse;

    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          ok: false,

          error:
            `TNCE Apps Script returned non-JSON. ` +
            `Status: ${scriptResponse.status}. ` +
            `Final URL: ${scriptResponse.url}. ` +
            `First response text: ${responseText.slice(
              0,
              500
            )}`,
        },
        { status: 502 }
      );
    }

    if (
      !scriptResponse.ok ||
      !data.ok
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            data.error ||
            `Publish failed with status ${scriptResponse.status}.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      status: 200,

      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Publish failed.";

    console.error(
      "TNCE publish route error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}