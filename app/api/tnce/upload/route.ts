import { NextRequest, NextResponse } from "next/server";

import {
  createSignedImageUploads,
  type TNCEImageSlot,
} from "@/lib/tnce/server/uploadImages";

export const runtime = "nodejs";

type UploadRequestBody = {
  project?: string;
  submissionId?: string;
  images?: Array<{
    slot?: TNCEImageSlot;
    fileName?: string;
    contentType?: string;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UploadRequestBody;

    const project = String(body.project || "").trim();
    const submissionId = String(body.submissionId || "").trim();

    const images = Array.isArray(body.images)
      ? body.images.map((image) => ({
          slot: image.slot || "other",
          fileName: String(image.fileName || "image.jpg"),
          contentType: String(image.contentType || ""),
        }))
      : [];

    if (!project) {
      return NextResponse.json(
        { error: "Missing project." },
        { status: 400 }
      );
    }

    if (!submissionId) {
      return NextResponse.json(
        { error: "Missing submission ID." },
        { status: 400 }
      );
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "No images received." },
        { status: 400 }
      );
    }

    const uploads = await createSignedImageUploads({
      project,
      submissionId,
      images,
    });

    return NextResponse.json({
      ok: true,
      uploads,
    });
  } catch (error) {
    console.error("TNCE signed upload error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare image uploads.",
      },
      { status: 500 }
    );
  }
}