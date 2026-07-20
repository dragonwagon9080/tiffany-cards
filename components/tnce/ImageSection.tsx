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
  setUploadedImages: Dispatch<SetStateAction<PendingTNCEUpload[]>>;
};

type UploadSlot = "front" | "back" | "other";
type ImageMethod = "upload" | "links";

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_TOTAL_BASE64_LENGTH = 4_000_000;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(new Error("Unable to read the selected image."));

    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Unable to process the selected image."));

    image.src = dataUrl;
  });
}

async function prepareImageFile(
  file: File,
  slot: UploadSlot
): Promise<PendingTNCEUpload> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" is not a supported image file.`);
  }

  const sourceDataUrl = await fileToDataUrl(file);
  const sourceImage = await loadImage(sourceDataUrl);

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION /
      Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight)
  );

  const width = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
  const height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Your browser could not prepare the image.");
  }

  context.drawImage(sourceImage, 0, 0, width, height);

  const outputDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "uploaded-image";

  return {
    id: createId(),
    slot,
    fileName: `${slot}-${baseName}.jpg`,
    contentType: "image/jpeg",
    base64: outputDataUrl,
    previewUrl: outputDataUrl,
  };
}

async function rotateImageClockwise(
  upload: PendingTNCEUpload
): Promise<PendingTNCEUpload> {
  const sourceImage = await loadImage(upload.base64 || upload.previewUrl);
  const canvas = document.createElement("canvas");

  canvas.width = sourceImage.naturalHeight;
  canvas.height = sourceImage.naturalWidth;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Your browser could not rotate the image.");
  }

  context.translate(canvas.width, 0);
  context.rotate(Math.PI / 2);
  context.drawImage(sourceImage, 0, 0);

  const rotatedDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

  return {
    ...upload,
    contentType: "image/jpeg",
    base64: rotatedDataUrl,
    previewUrl: rotatedDataUrl,
  };
}

function totalUploadSize(uploads: PendingTNCEUpload[]) {
  return uploads.reduce(
    (total, image) => total + String(image.base64 || "").length,
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
        onFiles(Array.from(event.dataTransfer.files || []));
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
          onFiles(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />

      <div className="text-sm font-bold text-white">{label}</div>
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
  rotating,
  onRotate,
  onRemove,
  onAssign,
}: {
  label: string;
  upload: PendingTNCEUpload;
  rotating: boolean;
  onRotate: () => void;
  onRemove: () => void;
  onAssign: (slot: UploadSlot) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-700 bg-black">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-3 py-2">
        <span className="text-xs font-black uppercase tracking-wide text-[#f1d36b]">
          {label}
        </span>

        <span className="rounded-full border border-[#9c7a2d] bg-[#181300] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#f1d36b]">
          {upload.slot}
        </span>
      </div>

      <div className="flex h-44 items-center justify-center p-3">
        <img
          src={upload.previewUrl}
          alt={label}
          className="max-h-full w-full object-contain"
        />
      </div>

      <div className="grid gap-2 border-t border-neutral-800 p-3">
        <button
          type="button"
          onClick={onRotate}
          disabled={rotating}
          className="rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:border-[#d4af37] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rotating ? "Rotating..." : "↻ Rotate"}
        </button>

        <div className="grid grid-cols-3 gap-2">
          {(["front", "back", "other"] as UploadSlot[]).map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => onAssign(slot)}
              className={`rounded-lg border px-2 py-2 text-[11px] font-black uppercase tracking-wide transition ${
                upload.slot === slot
                  ? "border-[#d4af37] bg-[#181300] text-[#f1d36b]"
                  : "border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-200 transition hover:bg-red-950/70"
        >
          🗑 Delete
        </button>
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
  const [method, setMethod] = useState<ImageMethod>("upload");
  const [error, setError] = useState("");
  const [rotatingId, setRotatingId] = useState("");
  const [linkInput, setLinkInput] = useState("");
const [addingLinks, setAddingLinks] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: File[], slot: UploadSlot) {
    setError("");
    if (files.length === 0) return;

    try {
      const filesToProcess = slot === "other" ? files : files.slice(0, 1);
      const prepared: PendingTNCEUpload[] = [];

      for (const file of filesToProcess) {
        prepared.push(await prepareImageFile(file, slot));
      }

      setUploadedImages((current) => {
        let next = [...current];

        for (const image of prepared) {
          if (image.slot === "front" || image.slot === "back") {
            next = next.map((existing) =>
              existing.slot === image.slot
                ? { ...existing, slot: "other" }
                : existing
            );
          }

          next.push(image);
        }

        if (totalUploadSize(next) > MAX_TOTAL_BASE64_LENGTH) {
          setError(
            "The selected uploads are too large together. Remove an image or upload fewer images."
          );
          return current;
        }

        return next;
      });
    } catch (uploadError: any) {
      setError(
        uploadError?.message || "Unable to prepare the selected image."
      );
    }
  }

  function removeUpload(id: string) {
    setUploadedImages((current) =>
      current.filter((image) => image.id !== id)
    );
  }

  function assignUpload(id: string, slot: UploadSlot) {
    setUploadedImages((current) =>
      current.map((image) => {
        if (image.id === id) {
          return {
            ...image,
            slot,
            fileName: image.fileName.replace(
              /^(front|back|other)-/,
              `${slot}-`
            ),
          };
        }

        if (
          (slot === "front" || slot === "back") &&
          image.slot === slot
        ) {
          return {
            ...image,
            slot: "other",
            fileName: image.fileName.replace(
              /^(front|back|other)-/,
              "other-"
            ),
          };
        }

        return image;
      })
    );
  }

  async function rotateUpload(id: string) {
    if (rotatingId) return;

    const target = uploadedImages.find((image) => image.id === id);
    if (!target) return;

    setRotatingId(id);
    setError("");

    try {
      const rotated = await rotateImageClockwise(target);

      setUploadedImages((current) => {
        const next = current.map((image) =>
          image.id === id ? rotated : image
        );

        if (totalUploadSize(next) > MAX_TOTAL_BASE64_LENGTH) {
          setError(
            "The rotated images are too large together. Delete an image or upload fewer images."
          );
          return current;
        }

        return next;
      });
    } catch (rotateError: any) {
      setError(rotateError?.message || "Unable to rotate the image.");
    } finally {
      setRotatingId("");
    }
  }

function parseImageUrls(value: string) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean)
    )
  );
}

function fileNameFromUrl(url: string, index: number) {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").filter(Boolean).pop();

    if (name) {
      return name.replace(/[^\w.-]+/g, "-");
    }
  } catch {
    // Use fallback below.
  }

  return `linked-image-${index + 1}.jpg`;
}

async function linkedImageToUpload(
  url: string,
  index: number
): Promise<PendingTNCEUpload> {
  const response = await fetch("/api/tnce/fetch-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const result = await response.json();

  if (!response.ok || !result?.dataUrl) {
    throw new Error(
      result?.error || `Unable to retrieve linked image ${index + 1}.`
    );
  }

  const sourceImage = await loadImage(result.dataUrl);

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION /
      Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight)
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
    throw new Error("Your browser could not prepare the linked image.");
  }

  context.drawImage(sourceImage, 0, 0, width, height);

  const outputDataUrl = canvas.toDataURL(
    "image/jpeg",
    JPEG_QUALITY
  );

  return {
    id: createId(),
    slot: "other",
    fileName: `other-${fileNameFromUrl(url, index).replace(
      /\.[^.]+$/,
      ""
    )}.jpg`,
    contentType: "image/jpeg",
    base64: outputDataUrl,
    previewUrl: outputDataUrl,
  };
}

async function addLinkedImages() {
  const urls = parseImageUrls(linkInput);

  if (urls.length === 0) {
    setError("Paste at least one image URL.");
    return;
  }

  setAddingLinks(true);
  setError("");

  try {
    const prepared: PendingTNCEUpload[] = [];

    for (let index = 0; index < urls.length; index += 1) {
      prepared.push(
        await linkedImageToUpload(urls[index], index)
      );
    }

    setUploadedImages((current) => {
      const next = [...current, ...prepared];

      if (totalUploadSize(next) > MAX_TOTAL_BASE64_LENGTH) {
        setError(
          "The linked images are too large together. Add fewer images."
        );

        return current;
      }

      return next;
    });

    setLinkInput("");
    setMethod("upload");
  } catch (linkError: any) {
    setError(
      linkError?.message || "Unable to add the linked images."
    );
  } finally {
    setAddingLinks(false);
  }
}

  function switchToLinks() {
    if (uploadedImages.length > 0) {
      const confirmed = window.confirm(
        "Switch to image URLs? Your selected and imported images will be removed."
      );
      if (!confirmed) return;
    }

    setUploadedImages([]);
    setError("");
    setMethod("links");
  }

  function switchToUploads() {
    const hasLinks = Boolean(
      frontImage.trim() || backImage.trim() || otherImages.trim()
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
      {uploadedImages.length > 0 && (
  <div className="mb-6 rounded-xl border border-[#9c7a2d] bg-[#181300] p-4">
    <h3 className="text-sm font-black uppercase tracking-wide text-[#f1d36b]">
      Review & Organize Images
    </h3>

    <p className="mt-1 text-xs leading-5 text-neutral-400">
      Rotate images, remove unwanted photos, and assign each image as the Front, Back, or Additional image before submitting.
    </p>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {uploadedImages.map((upload, index) => (
        <ImagePreview
          key={upload.id}
          label={`Image ${index + 1}`}
          upload={upload}
          rotating={rotatingId === upload.id}
          onRotate={() => rotateUpload(upload.id)}
          onRemove={() => removeUpload(upload.id)}
          onAssign={(slot) => assignUpload(upload.id, slot)}
        />
      ))}
    </div>
  </div>
)}
      <h3 className="text-sm font-black uppercase tracking-wide text-white">
        Add Images
      </h3>

      <p className="mt-1 text-xs leading-5 text-neutral-400">
        Add images by uploading them from your device or by providing image URLs.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
  type="button"
  onClick={() => otherInputRef.current?.click()}
  className="rounded-lg border border-[#d4af37] bg-[#181300] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-[#f1d36b] transition hover:bg-[#2b2205]"
>
  📷 Upload Images
</button>

<input
  ref={otherInputRef}
  type="file"
  accept="image/*"
  multiple
  className="hidden"
  onChange={(event) => {
    addFiles(Array.from(event.target.files || []), "other");
    event.target.value = "";
  }}
/>
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
          
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
  <label className="grid gap-1 text-sm">
    Image URLs

    <textarea
      value={linkInput}
      onChange={(event) => setLinkInput(event.target.value)}
      className="min-h-28 rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
      placeholder={`Paste one image URL per line

https://example.com/front.jpg
https://example.com/back.jpg`}
    />
  </label>

  <p className="text-xs leading-5 text-neutral-400">
    Add one or more image URLs. The images will appear above so
    you can rotate, delete, and assign them as Front, Back, or
    Other.
  </p>

  <button
    type="button"
    onClick={addLinkedImages}
    disabled={addingLinks}
    className="rounded-lg border border-[#d4af37] bg-[#181300] px-4 py-3 text-xs font-black uppercase tracking-wide text-[#f1d36b] transition hover:bg-[#2b2205] disabled:cursor-not-allowed disabled:opacity-50"
  >
    {addingLinks ? "Adding Images..." : "🔗 Add Linked Images"}
  </button>
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