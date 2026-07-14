"use client";

import { useRef, useState } from "react";

import type { TNCEUploadedImage } from "@/lib/tnce/types";

export type PendingTNCEUpload = TNCEUploadedImage & {
  id: string;
  previewUrl: string;
};

type Props = {
  frontImage: string;
  setFrontImage: (value: string) => void;

  backImage: string;
  setBackImage: (value: string) => void;

  otherImages: string;
  setOtherImages: (value: string) => void;

  uploadedImages: PendingTNCEUpload[];
  setUploadedImages: (
    value:
      | PendingTNCEUpload[]
      | ((
          current: PendingTNCEUpload[]
        ) => PendingTNCEUpload[])
  ) => void;
};

type UploadSlot = "front" | "back" | "other";

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_TOTAL_BASE64_LENGTH = 4_000_000;

function createId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(
        new Error("Unable to read the selected image.")
      );
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);

      image.onerror = () =>
        reject(
          new Error(
            "Unable to process the selected image."
          )
        );

      image.src = dataUrl;
    }
  );
}

async function prepareImageFile(
  file: File,
  slot: UploadSlot
): Promise<PendingTNCEUpload> {
  if (!file.type.startsWith("image/")) {
    throw new Error(
      `"${file.name}" is not a supported image file.`
    );
  }

  const sourceDataUrl = await fileToDataUrl(file);
  const sourceImage = await loadImage(sourceDataUrl);

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION /
      Math.max(
        sourceImage.naturalWidth,
        sourceImage.naturalHeight
      )
  );

  const width = Math.max(
    1,
    Math.round(sourceImage.naturalWidth * scale)
  );

  const height = Math.max(
    1,
    Math.round(sourceImage.naturalHeight * scale)
  );

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Your browser could not prepare the image."
    );
  }

  context.drawImage(sourceImage, 0, 0, width, height);

  const outputDataUrl = canvas.toDataURL(
    "image/jpeg",
    JPEG_QUALITY
  );

  const baseName =
    file.name.replace(/\.[^.]+$/, "") ||
    "uploaded-image";

  return {
    id: createId(),
    slot,
    fileName: `${slot}-${baseName}.jpg`,
    contentType: "image/jpeg",
    base64: outputDataUrl,
    previewUrl: outputDataUrl,
  };
}

function totalUploadSize(
  uploads: PendingTNCEUpload[]
) {
  return uploads.reduce(
    (total, image) =>
      total + String(image.base64 || "").length,
    0
  );
}

function ImagePreview({
  label,
  upload,
  url,
  onRemoveUpload,
}: {
  label: string;
  upload?: PendingTNCEUpload;
  url?: string;
  onRemoveUpload?: () => void;
}) {
  const preview =
    upload?.previewUrl || String(url || "").trim();

  if (!preview) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-700 bg-black">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">
          {label}
        </span>

        {upload && onRemoveUpload && (
          <button
            type="button"
            onClick={onRemoveUpload}
            className="text-xs font-bold text-red-300 hover:text-red-200"
          >
            Remove upload
          </button>
        )}
      </div>

      <div className="flex h-44 items-center justify-center p-3">
        <img
          src={preview}
          alt={label}
          className="max-h-full w-full object-contain"
        />
      </div>

      {upload && (
        <div className="truncate border-t border-neutral-800 px-3 py-2 text-xs text-neutral-500">
          {upload.fileName}
        </div>
      )}
    </div>
  );
}

function UploadBox({
  label,
  description,
  multiple = false,
  inputRef,
  onFiles,
}: {
  label: string;
  description: string;
  multiple?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);

        onFiles(
          Array.from(event.dataTransfer.files || [])
        );
      }}
      className={`rounded-lg border border-dashed p-3 transition ${
        dragging
          ? "border-[#d4af37] bg-[#181300]"
          : "border-neutral-700 bg-neutral-950"
      }`}
    >
      <input
  ref={inputRef}
  type="file"
  accept="image/*"
  capture="environment"
  multiple={multiple}
  className="hidden"
  onChange={(event) => {
    onFiles(
      Array.from(event.target.files || [])
    );

    event.target.value = "";
  }}
/>

      <div className="text-sm font-bold text-white">
        {label}
      </div>

      <div className="mt-1 text-xs leading-5 text-neutral-400">
        {description}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 rounded-lg border border-[#9c7a2d] bg-black px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#d4af37] transition hover:border-[#d4af37] hover:bg-[#181300]"
      >
        Add {multiple ? "Images" : "Image"}
      </button>
    </div>
  );
}

export default function ImageSection({
  frontImage,
  setFrontImage,
  backImage,
  setBackImage,
  otherImages,
  setOtherImages,
  uploadedImages,
  setUploadedImages,
}: Props) {
  const frontInputRef =
    useRef<HTMLInputElement>(null);

  const backInputRef =
    useRef<HTMLInputElement>(null);

  const otherInputRef =
    useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");

  const frontUpload = uploadedImages.find(
    (image) => image.slot === "front"
  );

  const backUpload = uploadedImages.find(
    (image) => image.slot === "back"
  );

  const otherUploads = uploadedImages.filter(
    (image) => image.slot === "other"
  );

  async function addFiles(
    files: File[],
    slot: UploadSlot
  ) {
    setError("");

    if (files.length === 0) return;

    try {
      const filesToProcess =
        slot === "other" ? files : files.slice(0, 1);

      const prepared: PendingTNCEUpload[] = [];

      for (const file of filesToProcess) {
        prepared.push(
          await prepareImageFile(file, slot)
        );
      }

      setUploadedImages((current) => {
        const withoutExistingSlot =
          slot === "other"
            ? current
            : current.filter(
                (image) => image.slot !== slot
              );

        const next = [
          ...withoutExistingSlot,
          ...prepared,
        ];

        if (
          totalUploadSize(next) >
          MAX_TOTAL_BASE64_LENGTH
        ) {
          setError(
            "The selected uploads are too large together. Remove an image or upload fewer images."
          );

          return current;
        }

        return next;
      });
    } catch (uploadError: any) {
      setError(
        uploadError?.message ||
          "Unable to prepare the selected image."
      );
    }
  }

  function removeUpload(id: string) {
    setUploadedImages((current) =>
      current.filter((image) => image.id !== id)
    );
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div>
        <h3 className="text-sm font-black uppercase tracking-wide text-white">
          Card Images
        </h3>

        <p className="mt-1 text-xs leading-5 text-neutral-400">
          Upload images from your phone or computer, drag
          images into the boxes, or paste image URLs.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-3">
          <UploadBox
            label="Add Front Image"
            description="Choose a photo, use your phone camera, or drag the front image here."
            inputRef={frontInputRef}
            onFiles={(files) =>
              addFiles(files, "front")
            }
          />

          <ImagePreview
            label="Front Preview"
            upload={frontUpload}
            url={frontImage}
            onRemoveUpload={
              frontUpload
                ? () => removeUpload(frontUpload.id)
                : undefined
            }
          />

          <label className="grid gap-1 text-sm">
            Front Image URL
            <input
              type="url"
              value={frontImage}
              onChange={(event) =>
                setFrontImage(event.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="grid gap-3">
          <UploadBox
            label="Add Back Image"
            description="Choose a photo, use your phone camera, or drag the back image here."
            inputRef={backInputRef}
            onFiles={(files) =>
              addFiles(files, "back")
            }
          />

          <ImagePreview
            label="Back Preview"
            upload={backUpload}
            url={backImage}
            onRemoveUpload={
              backUpload
                ? () => removeUpload(backUpload.id)
                : undefined
            }
          />

          <label className="grid gap-1 text-sm">
            Back Image URL
            <input
              type="url"
              value={backImage}
              onChange={(event) =>
                setBackImage(event.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="https://..."
            />
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <UploadBox
          label="Add Additional Images"
          description="Choose or drag one or more additional card, label, patch, or auction images."
          multiple
          inputRef={otherInputRef}
          onFiles={(files) =>
            addFiles(files, "other")
          }
        />

        {otherUploads.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {otherUploads.map((upload, index) => (
              <ImagePreview
                key={upload.id}
                label={`Additional ${index + 1}`}
                upload={upload}
                onRemoveUpload={() =>
                  removeUpload(upload.id)
                }
              />
            ))}
          </div>
        )}

        <label className="grid gap-1 text-sm">
          Additional Image URLs
          <textarea
            value={otherImages}
            onChange={(event) =>
              setOtherImages(event.target.value)
            }
            className="min-h-24 rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="Paste one image URL per line"
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
    </section>
  );
}