"use client";

import { useState } from "react";
import type { ImageItem } from "@/types/image";
import ImageCanvas from "./ImageCanvas";

type CardWorkspaceProps = {
  images: ImageItem[];
  leftIndex: number;
  rightIndex: number;
  onLeftSelect: (index: number) => void;
  onRightSelect: (index: number) => void;
};

export default function CardWorkspace({
  images,
  leftIndex,
  rightIndex,
  onLeftSelect,
  onRightSelect,
}: CardWorkspaceProps) {
  const [picked, setPicked] = useState(leftIndex);

  if (!images.length) return null;

  if (images.length === 1) {
    const image = images[0];

    return (
      <div className="flex h-full min-h-0 flex-col bg-black">
        <div className="border-b border-[#9c7a2d]/70 bg-[#111111] px-3 py-2 text-center text-base font-black uppercase tracking-wide text-[#d4af37]">
          {image.label}
        </div>

        <div className="min-h-0 flex-1">
          <ImageCanvas
            key={`single-${image.url}`}
            src={image.url}
            alt={image.label}
            zoomEnabled
          />
        </div>
      </div>
    );
  }

  const left = images[leftIndex];
  const right = images[rightIndex];

  if (!left || !right) return null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-black">
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2 md:divide-x md:divide-[#9c7a2d]/70">
        <div className="flex min-h-0 flex-col">
          <div className="border-b border-[#9c7a2d]/70 bg-[#111111] px-3 py-2 text-center text-base font-black uppercase tracking-wide text-[#d4af37]">
            {left.label}
          </div>

          <div className="min-h-0 flex-1">
            <ImageCanvas
              key={`left-${left.url}`}
              src={left.url}
              alt={left.label}
              zoomEnabled
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col border-t border-[#9c7a2d]/70 md:border-t-0">
          <div className="border-b border-[#9c7a2d]/70 bg-[#111111] px-3 py-2 text-center text-base font-black uppercase tracking-wide text-[#d4af37]">
            {right.label}
          </div>

          <div className="min-h-0 flex-1">
            <ImageCanvas
              key={`right-${right.url}`}
              src={right.url}
              alt={right.label}
              zoomEnabled
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-[#9c7a2d]/80 bg-[#111111] px-3 py-2">
        <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-[#d4af37]/80">
          💡 Select a thumbnail, then choose Set Left or Set Right.
        </div>

        <div className="mb-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => onLeftSelect(picked)}
            className="rounded border border-[#d4af37] bg-[#9c7a2d] px-4 py-1.5 text-xs font-black uppercase text-black transition hover:bg-[#b99236]"
          >
            Set Left
          </button>

          <button
            type="button"
            onClick={() => onRightSelect(picked)}
            className="rounded border border-[#d4af37] bg-[#9c7a2d] px-4 py-1.5 text-xs font-black uppercase text-black transition hover:bg-[#b99236]"
          >
            Set Right
          </button>
        </div>

        <div className="mx-auto flex max-w-6xl justify-center gap-3 overflow-x-auto px-1 py-1">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setPicked(index)}
              className={`shrink-0 rounded-lg border-2 bg-black p-1 transition ${
                picked === index
                  ? "border-[#d4af37] ring-2 ring-[#d4af37]"
                  : "border-neutral-700 hover:border-[#d4af37]"
              }`}
            >
              <img
                src={image.url}
                alt={image.label}
                className="h-24 w-16 object-contain"
              />

              <div
                className={`mt-0.5 max-w-20 truncate text-center text-xs ${
                  picked === index ? "text-[#d4af37]" : "text-gray-400"
                }`}
              >
                {image.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}