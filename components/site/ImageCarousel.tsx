"use client";

/* =========================================================
   IMAGE CAROUSEL
   - One image at a time
   - Auto changes every 6 seconds
   - Left/right arrows
   - Thumbnail previews
   - Click image to enlarge in same window
   ========================================================= */

import { useEffect, useState } from "react";

export default function ImageCarousel({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((current) =>
        current === images.length - 1 ? 0 : current + 1
      );
    }, 6000);

    return () => window.clearInterval(timer);
  }, [images.length]);

  if (!images.length) return null;

  const currentImage = images[currentIndex];

  function goPrevious() {
    setCurrentIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  }

  function goNext() {
    setCurrentIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  }

  return (
    <>
      <div className="w-full">
        <div className="relative inline-block w-full">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="block w-full"
            aria-label={`Enlarge ${title} image`}
          >
            <img
              src={currentImage}
              alt={`${title} image ${currentIndex + 1}`}
              className="mx-auto max-h-[620px] w-full object-contain"
            />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrevious}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/80 text-2xl font-bold text-[#d4af37] transition hover:bg-[#d4af37] hover:text-black"
                aria-label="Previous image"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/80 text-2xl font-bold text-[#d4af37] transition hover:bg-[#d4af37] hover:text-black"
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`rounded-md border-2 p-1 transition ${
                  index === currentIndex
                    ? "border-[#d4af37]"
                    : "border-transparent hover:border-[#d4af37]/60"
                }`}
                aria-label={`Show image ${index + 1}`}
              >
                <img
                  src={image}
                  alt={`${title} thumbnail ${index + 1}`}
                  className="h-16 w-16 object-contain"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            className="absolute right-5 top-5 rounded-full border border-[#d4af37] px-4 py-2 text-xl font-bold text-[#d4af37]"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>

          <img
            src={currentImage}
            alt={`${title} enlarged`}
            className="max-h-[92vh] max-w-[95vw] object-contain"
          />
        </div>
      )}
    </>
  );
}