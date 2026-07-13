"use client";

import { TNCE_MODE_CONFIG, type ContributionMode } from "./modeConfig";

type Props = {
  mode: ContributionMode;
  projectLabel: string;
  onClose: () => void;
};

export default function ContributionHeader({
  mode,
  projectLabel,
  onClose,
}: Props) {
  const config = TNCE_MODE_CONFIG[mode];

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-neutral-400">
          {projectLabel}
        </div>

        <h2
          className={
            config.accent === "gold"
              ? "mt-1 text-2xl font-bold text-[#d4af37]"
              : "mt-1 text-2xl font-bold text-blue-400"
          }
        >
          {config.title}
        </h2>

        <p className="mt-2 text-sm text-neutral-300">{config.description}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-full border border-neutral-600 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
      >
        X
      </button>
    </div>
  );
}