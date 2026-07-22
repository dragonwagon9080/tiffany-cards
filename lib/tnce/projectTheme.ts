export type TNCEProject =
  | "rpa-tracker"
  | "cards-alert"
  | "tiffany-cards"
  | "guides";

export const PROJECT_THEME = {
  "rpa-tracker": {
    border: "border-blue-500/40",
    background: "bg-blue-950/20",
    text: "text-blue-200",
    title: "text-blue-400",
  },

  "cards-alert": {
    border: "border-red-500/40",
    background: "bg-red-950/20",
    text: "text-red-200",
    title: "text-red-400",
  },

  "tiffany-cards": {
    border: "border-[#d4af37]/60",
    background: "bg-[#181300]",
    text: "text-[#f1d36b]",
    title: "text-[#d4af37]",
  },

  guides: {
    border: "border-green-500/40",
    background: "bg-green-950/20",
    text: "text-green-200",
    title: "text-green-400",
  },
} as const;