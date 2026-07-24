import "server-only";

import { randomUUID } from "crypto";

import {
  storage,
  tnceUploadBucket,
} from "@/lib/tnce/storage";

export type TNCEImageSlot = "front" | "back" | "other";

export interface UploadImageRequest {
  project: string;
  submissionId: string;
  images: Array<{
  id: string;
  slot: TNCEImageSlot;
  fileName: string;
  contentType: string;
}>;
}

export interface SignedUploadResult {
  id: string;
  slot: TNCEImageSlot;
  fileName: string;
  contentType: string;
  objectPath: string;
  uploadUrl: string;
  publicUrl: string;
}

const ALLOWED_PROJECTS = new Set([
  "rpa-tracker",
  "cards-alert",
  "tiffany-cards",
  "guides",
]);

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function safePathPart(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extensionForContentType(contentType: string) {
  switch (contentType) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "jpg";
  }
}

function validateRequest(request: UploadImageRequest) {
  if (!ALLOWED_PROJECTS.has(request.project)) {
    throw new Error("Invalid TNCE project.");
  }

  if (!request.submissionId.trim()) {
    throw new Error("Missing submission ID.");
  }

  if (request.images.length === 0) {
    throw new Error("No images were provided.");
  }

  if (request.images.length > 20) {
    throw new Error("A maximum of 20 images may be uploaded.");
  }

  for (const image of request.images) {
    if (!["front", "back", "other"].includes(image.slot)) {
      throw new Error("Invalid image slot.");
    }

    if (!ALLOWED_IMAGE_TYPES.has(image.contentType)) {
      throw new Error(
        `"${image.fileName}" is not a supported image format.`
      );
    }
  }
}

export async function createSignedImageUploads(
  request: UploadImageRequest
): Promise<SignedUploadResult[]> {
  validateRequest(request);

  const safeProject = safePathPart(request.project);
  const safeSubmissionId = safePathPart(request.submissionId);

  if (!safeProject || !safeSubmissionId) {
    throw new Error("Invalid upload destination.");
  }

  const bucket = storage.bucket(tnceUploadBucket);

  return Promise.all(
    request.images.map(async (image, index) => {
      const uploadId = randomUUID();
      const extension = extensionForContentType(image.contentType);
      const sequence = String(index + 1).padStart(2, "0");

      const finalFileName =
        `${sequence}-${image.slot}-${uploadId.slice(0, 8)}.${extension}`;

      const objectPath =
        `contributions/${safeProject}/${safeSubmissionId}/${finalFileName}`;

      const file = bucket.file(objectPath);

      const [uploadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType: image.contentType,
      });

      return {
        id: image.id,
        slot: image.slot,
        fileName: finalFileName,
        contentType: image.contentType,
        objectPath,
        uploadUrl,
        publicUrl:
          `https://storage.googleapis.com/` +
          `${tnceUploadBucket}/${objectPath}`,
      };
    })
  );
}