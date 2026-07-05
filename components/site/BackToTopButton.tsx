"use client";

/* =========================================================
   BACK TO TOP BUTTON
   - Appears after user scrolls down
   - Smooth scrolls to top
   - Global component for every page
   ========================================================= */

import { useEffect, useState } from "react";

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 400);
    }

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#d4af37] bg-black text-2xl font-bold text-[#d4af37] shadow-xl transition hover:scale-110 hover:bg-[#d4af37] hover:text-black"
    >
      ↑
    </button>
  );
}