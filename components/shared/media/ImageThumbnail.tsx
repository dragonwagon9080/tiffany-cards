"use client";

import Image from "next/image";
import type { ImageItem } from "@/types/image";

type ImageThumbnailProps = {
  image: ImageItem;
  selected?: boolean;
  onClick: () => void;
};

export default function ImageThumbnail({
  image,
  selected = false,
  onClick,
}: ImageThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center transition ${
        selected ? "scale-105" : "hover:scale-105"
      }`}
    >
      <div
        className={`overflow-hidden rounded-lg border-2 transition ${
          selected
            ? "border-[#d4af37]"
            : "border-neutral-700 group-hover:border-[#d4af37]"
        }`}
      >
        <Image
          src={image.url}
          alt={image.label}
          width={90}
height={126}
className="h-24 w-[68px] object-contain bg-black"
          unoptimized
        />
      </div>

      <span
        className={`mt-2 text-center text-xs font-medium ${
          selected ? "text-[#d4af37]" : "text-gray-400"
        }`}
      >
        {image.label}
      </span>
    </button>
  );
}