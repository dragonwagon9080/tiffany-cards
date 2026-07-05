"use client";

import Link from "next/link";
import { RegistryGroup, TrackerTheme } from "./types";

export default function RegistryCard({
  group,
  theme,
}: {
  group: RegistryGroup;
  theme: TrackerTheme;
}) {
  const buttonBg = theme.button_bg_color || "#2563eb";
  const buttonText = theme.button_text_color || "#ffffff";

  const gold = "#d4af37";

  const cardBg = theme.card_bg_color || "#18181b";
  const cardBorder = theme.card_border_color || "#3f3f46";

  const hoverBorder =
    theme.card_hover_border_color || "#60a5fa";

  const glow =
    theme.card_glow_color || "rgba(59,130,246,.75)";

  return (
    <Link
      href={`/rpa-tracker/group/${group.Slug}`}
      className="group overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1"
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hoverBorder;
        e.currentTarget.style.boxShadow = `0 0 32px ${glow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = cardBorder;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* IMAGE */}
      <div className="bg-black p-4">
        <div className="flex h-72 items-center justify-center">
          {group.Main_Page_Image ? (
            <img
              src={group.Main_Page_Image}
              alt={group.Card_Title_Display || group.Card_Title}
              className="max-h-full w-auto object-contain transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="text-zinc-500">
              No Image
            </div>
          )}
        </div>
      </div>

      {/* DETAILS */}
      <div className="space-y-3 p-4">
        <h2 className="line-clamp-2 text-lg font-bold text-white">
          {group.Card_Title_Display || group.Card_Title}
        </h2>

        {group.Material && (
          <div
            className="text-sm font-bold"
            style={{ color: gold }}
          >
            {group.Material}
          </div>
        )}

        {group.Description && (
          <div className="line-clamp-3 text-sm text-zinc-400">
            {group.Description}
          </div>
        )}

        <div
          className="rounded-lg px-4 py-2 text-center text-sm font-bold"
          style={{
            backgroundColor: buttonBg,
            color: buttonText,
          }}
        >
          {group.Count} tracked card
          {group.Count === 1 ? "" : "s"}
        </div>
      </div>
    </Link>
  );
}