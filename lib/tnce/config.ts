import type { TNCEProject } from "./types";

console.log(
  "TNCE URL:",
  process.env.TNCE_APPS_SCRIPT_URL
);

export const TNCE_APPS_SCRIPT_URL =
  process.env.TNCE_APPS_SCRIPT_URL || "";

export const TNCE_PROJECTS: Record<
  TNCEProject,
  {
    label: string;
    uploadFolder: string;
  }
> = {
  "rpa-tracker": {
    label: "RPA Tracker",
    uploadFolder: "contributions/rpa-tracker",
  },

  "cards-alert": {
    label: "Cards Alert",
    uploadFolder: "contributions/cards-alert",
  },

  "tiffany-cards": {
    label: "Tiffany Cards",
    uploadFolder: "contributions/tiffany-cards",
  },

  guides: {
    label: "Guides",
    uploadFolder: "contributions/guides",
  },
};