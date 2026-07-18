"use client";

import { useEffect, useState } from "react";

export type ImageRole =
  | "front"
  | "back"
  | "additional";

export type OrganizedImage = {
  id: string;
  url: string;
  role: ImageRole;
  rotation?: number;

  // Where this image came from
  source?: "import" | "upload" | "url";

  // Original image before any edits
  originalUrl?: string;
};

type Props = {
  images: OrganizedImage[];
  onChange: (images: OrganizedImage[]) => void;
  editable?: boolean;
};

function roleLabel(role: ImageRole) {
  if (role === "front") return "Front";
  if (role === "back") return "Back";
  return "Additional";
}

export default function ImageOrganizer({
  images,
  onChange,
  editable = true,
}: Props) {

      const [rotations, setRotations] = useState<
    Record<string, number>
  >({});

useEffect(() => {
  const nextRotations: Record<string, number> = {};

  images.forEach((image) => {
    nextRotations[image.id] =
      image.rotation || 0;
  });

  setRotations(nextRotations);
}, [images]);

  function changeRole(
    imageId: string,
    nextRole: ImageRole
  ) {
    const selected = images.find(
      (image) => image.id === imageId
    );

    if (!selected) return;

    const updated = images.map((image) => {
      if (image.id === imageId) {
        return {
          ...image,
          role: nextRole,
        };
      }

      if (
        nextRole !== "additional" &&
        image.role === nextRole
      ) {
        return {
          ...image,
          role: "additional" as const,
        };
      }

      return image;
    });

    onChange(updated);
  }

  function rotateImage(imageId: string) {
  const image = images.find(
    (item) => item.id === imageId
  );

  if (!image) return;

  const currentRotation =
    rotations[imageId] ??
    image.rotation ??
    0;

  const nextRotation =
    (currentRotation + 90) % 360;

  /*
   * Keep the immediate preview rotation.
   */
  setRotations((current) => ({
    ...current,
    [imageId]: nextRotation,
  }));

  /*
   * Also send the rotation to the parent workspace
   * so it can eventually be included when publishing.
   */
  onChange(
    images.map((item) =>
      item.id === imageId
        ? {
            ...item,
            rotation: nextRotation,
          }
        : item
    )
  );
}

  function removeImage(imageId: string) {
    onChange(
      images.filter(
        (image) => image.id !== imageId
      )
    );
  }

  if (images.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-700 bg-black p-6 text-center text-sm text-neutral-500">
        No images available.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image, index) => (
        <div
          key={image.id}
          className="overflow-hidden rounded-xl border border-neutral-800 bg-black"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
            <span className="text-xs font-black uppercase tracking-wide text-neutral-400">
              {roleLabel(image.role)}
            </span>

            <span className="text-xs text-neutral-600">
              Image {index + 1}
            </span>
          </div>

          <a
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-56 items-center justify-center overflow-hidden p-3"
          >
            <img
              src={image.url}
              alt={`${roleLabel(image.role)} image`}
              style={{
  transform: `rotate(${
    rotations[image.id] ??
    image.rotation ??
    0
  }deg)`,
}}
              className="max-h-full max-w-full object-contain transition-transform duration-200"
            />
          </a>

          {editable && (
            <div className="grid gap-2 border-t border-neutral-800 p-3">
              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-neutral-400">
                Image Role

                <select
                  value={image.role}
                  onChange={(event) =>
                    changeRole(
                      image.id,
                      event.target
                        .value as ImageRole
                    )
                  }
                  className="h-10 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-[#d4af37]"
                >
                  <option value="front">
                    Front
                  </option>

                  <option value="back">
                    Back
                  </option>

                  <option value="additional">
                    Additional
                  </option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    rotateImage(image.id)
                  }
                  className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 text-sm font-bold text-white transition hover:border-[#d4af37] hover:text-[#f1d36b]"
                >
                  ⟳ Rotate
                </button>

                <button
                  type="button"
                  onClick={() =>
                    removeImage(image.id)
                  }
                  className="h-10 rounded-lg border border-red-800 bg-red-950/40 text-sm font-bold text-red-200 transition hover:bg-red-900/60"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}