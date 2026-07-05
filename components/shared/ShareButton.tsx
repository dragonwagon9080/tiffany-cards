"use client";

import { useState } from "react";

type Props = {
  type: "card" | "registry" | "alert" | "guide";
  title: string;
  url: string;
};

export default function ShareButton({
  type,
  title,
  url,
}: Props) {
  const [copied, setCopied] = useState(false);

  function buildText() {
    switch (type) {
      case "card":
        return `Check out this card's complete grading history on RPA Tracker.\n\n${title}\n\n${url}`;

      case "registry":
        return `Check out this complete registry on RPA Tracker.\n\n${title}\n\n${url}`;

      case "alert":
        return `Check out this listing on Cards Alert.\n\n${title}\n\n${url}`;

      case "guide":
        return `Check out this guide on Tiffany Cards.\n\n${title}\n\n${url}`;

      default:
        return `${title}\n\n${url}`;
    }
  }

  async function handleShare() {
    const text = buildText();

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(text);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {}
  }

  return (
    <button
      onClick={handleShare}
      className="rounded-md border border-[#d4af37] bg-black px-4 py-1.5 text-sm font-bold text-[#d4af37] transition hover:bg-[#d4af37] hover:text-black"
    >
      {copied ? "✓ Copied!" : "Share ↗︎"}
    </button>
  );
}