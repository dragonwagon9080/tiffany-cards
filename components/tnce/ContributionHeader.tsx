"use client";

import {
  TNCE_MODE_CONFIG,
  type ContributionMode,
} from "./modeConfig";

type Project =
  | "rpa-tracker"
  | "cards-alert"
  | "tiffany-cards"
  | "guides";

type Props = {
  mode: ContributionMode;
  project?: Project;
  projectLabel: string;
  onClose: () => void;
};

export default function ContributionHeader({
  mode,
  project = "rpa-tracker",
  projectLabel,
  onClose,
}: Props) {
  const config = TNCE_MODE_CONFIG[mode];

  const isCardsAlert = project === "cards-alert";
  const isTiffanyCards = project === "tiffany-cards";
  const isGuides = project === "guides";

  const title = isCardsAlert
    ? mode === "update"
      ? "+ Update Existing Card"
      : mode === "missing"
        ? "+ Submit Similar Card"
        : "+ Report New Card"
    : config.title;

  const description = isCardsAlert
    ? mode === "update"
      ? "Submit new evidence, details, images, or corrections for an existing Cards Alert entry."
      : mode === "missing"
        ? "Submit a similar card using the current card as a starting point."
        : "Report a questionable card that is not currently listed in Cards Alert."
    : config.description;

  const titleClass = isCardsAlert
    ? "text-red-400"
    : isTiffanyCards
      ? "text-[#d4af37]"
      : isGuides
        ? "text-green-400"
        : config.accent === "gold"
          ? "text-[#d4af37]"
          : "text-blue-400";

  const closeClass = isCardsAlert
    ? "border-red-700 text-red-300 hover:bg-red-950"
    : isTiffanyCards
      ? "border-[#9c7a2d] text-[#d4af37] hover:bg-[#181300]"
      : isGuides
        ? "border-green-700 text-green-300 hover:bg-green-950"
        : "border-blue-700 text-blue-300 hover:bg-blue-950";

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-neutral-400">
          {projectLabel}
        </div>

        <h2
          className={`mt-1 text-2xl font-bold ${titleClass}`}
        >
          {title}
        </h2>

        <p className="mt-2 text-sm text-neutral-300">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className={`rounded-full border px-3 py-1 text-sm transition ${closeClass}`}
        aria-label="Close contribution form"
      >
        X
      </button>
    </div>
  );
}