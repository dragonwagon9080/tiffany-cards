import { NextRequest, NextResponse } from "next/server";

import {
  createSignedImageUploads,
  type TNCEImageSlot,
} from "@/lib/tnce/server/uploadImages";

export const runtime = "nodejs";

type UploadRequestBody = {
  project?: string;
  submissionId?: string;
  files?: Array<{
  id?: string;
  slot?: TNCEImageSlot;
  fileName?: string;
  contentType?: string;
}>;
};

export async function POST(request: NextRequest) {
  try {
    const body =
      (await request.json()) as UploadRequestBody;

    const project = String(
      body.project || ""
    ).trim();

    const submissionId = String(
      body.submissionId || ""
    ).trim();

    const files = Array.isArray(body.files)
  ? body.files.map((file) => ({
      id: String(file.id || ""),
      slot: file.slot || "other",
      fileName: String(
        file.fileName || "image.jpg"
      ),
      contentType: String(
        file.contentType || ""
      ),
    }))
  : [];

    if (!project) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing project.",
        },
        {
          status: 400,
        }
      );
    }

    if (!submissionId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing submission ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No images received.",
        },
        {
          status: 400,
        }
      );
    }

    const signedFiles =
      await createSignedImageUploads({
        project,
        submissionId,
        images: files,
      });

    return NextResponse.json({
      ok: true,
      files: signedFiles,
    });
  } catch (error) {
    console.error(
      "TNCE signed upload error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare image uploads.",
      },
      {
        status: 500,
      }
    );
  }
}