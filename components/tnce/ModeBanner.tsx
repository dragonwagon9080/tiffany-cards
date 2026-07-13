"use client";

import { TNCE_MODE_CONFIG, type ContributionMode } from "./modeConfig";

type Props = {
  mode: ContributionMode;
};

export default function ModeBanner({ mode }: Props) {
  const config = TNCE_MODE_CONFIG[mode];

  const className =
    config.accent === "gold"
      ? "rounded-xl border border-[#d4af37]/60 bg-[#181300] p-4 text-sm text-[#f1d36b]"
      : "rounded-xl border border-blue-500/40 bg-blue-950/20 p-4 text-sm text-blue-200";

  return <div className={className}>{config.banner}</div>;
}