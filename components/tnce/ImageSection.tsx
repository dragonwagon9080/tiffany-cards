"use client";

import {
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

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

  setUploadedImages: Dispatch<
    SetStateAction<PendingTNCEUpload[]>
  >;
};

type UploadSlot = "front" | "back" | "other";
type ImageMethod = "upload" | "links";

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

      image.onerror = () => {
        reject(
          new Error(
            "Unable to process the selected image."
          )
        );
      };

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

  context.drawImage(
    sourceImage,
    0,
    0,
    width,
    height
  );

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
  inputRef: RefObject<HTMLInputElement | null>;
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
        {multiple ? "Add Images" : "Add Image"}
      </button>
    </div>
  );
}

function ImagePreview({
  label,
  upload,
  onRemove,
}: {
  label: string;
  upload: PendingTNCEUpload;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-700 bg-black">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">
          {label}
        </span>

        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-bold text-red-300 hover:text-red-200"
        >
          Remove
        </button>
      </div>

      <div className="flex h-40 items-center justify-center p-3">
        <img
          src={upload.previewUrl}
          alt={label}
          className="max-h-full w-full object-contain"
        />
      </div>
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
  const [method, setMethod] =
    useState<ImageMethod>("upload");

  const [error, setError] = useState("");

  const frontInputRef =
    useRef<HTMLInputElement>(null);

  const backInputRef =
    useRef<HTMLInputElement>(null);

  const otherInputRef =
    useRef<HTMLInputElement>(null);

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
        slot === "other"
          ? files
          : files.slice(0, 1);

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

  function switchToLinks() {
    if (uploadedImages.length > 0) {
      const confirmed = window.confirm(
        "Switch to image URLs? Your selected image uploads will be removed."
      );

      if (!confirmed) return;
    }

    setUploadedImages([]);
    setError("");
    setMethod("links");
  }

  function switchToUploads() {
    const hasLinks = Boolean(
      frontImage.trim() ||
        backImage.trim() ||
        otherImages.trim()
    );

    if (hasLinks) {
      const confirmed = window.confirm(
        "Switch to image uploads? Your pasted image URLs will be cleared."
      );

      if (!confirmed) return;
    }

    setFrontImage("");
    setBackImage("");
    setOtherImages("");
    setError("");
    setMethod("upload");
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-white">
        Card Images
      </h3>

      <p className="mt-1 text-xs leading-5 text-neutral-400">
        Upload photos from your phone or computer, or
        provide image links.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={switchToUploads}
          className={`rounded-lg border px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
            method === "upload"
              ? "border-[#d4af37] bg-[#181300] text-[#f1d36b]"
              : "border-neutral-700 bg-black text-neutral-400 hover:text-white"
          }`}
        >
          📷 Upload Images
        </button>

        <button
          type="button"
          onClick={switchToLinks}
          className={`rounded-lg border px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
            method === "links"
              ? "border-[#d4af37] bg-[#181300] text-[#f1d36b]"
              : "border-neutral-700 bg-black text-neutral-400 hover:text-white"
          }`}
        >
          🔗 Link Images
        </button>
      </div>

      {method === "upload" ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-3">
              <UploadBox
                label="📷 Add Front Image"
                description="Take a photo or select one from your photo library."
                inputRef={frontInputRef}
                onFiles={(files) =>
                  addFiles(files, "front")
                }
              />

              {frontUpload && (
                <ImagePreview
                  label="Front"
                  upload={frontUpload}
                  onRemove={() =>
                    removeUpload(frontUpload.id)
                  }
                />
              )}
            </div>

            <div className="grid gap-3">
              <UploadBox
                label="📷 Add Back Image"
                description="Take a photo or select one from your photo library."
                inputRef={backInputRef}
                onFiles={(files) =>
                  addFiles(files, "back")
                }
              />

              {backUpload && (
                <ImagePreview
                  label="Back"
                  upload={backUpload}
                  onRemove={() =>
                    removeUpload(backUpload.id)
                  }
                />
              )}
            </div>
          </div>

          <UploadBox
            label="📷 Add Additional Images"
            description="Take photos or select one or more additional images."
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
                  onRemove={() =>
                    removeUpload(upload.id)
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
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
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
    </section>
  );
}