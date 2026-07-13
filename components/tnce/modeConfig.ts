export type ContributionMode = "new" | "update" | "missing";

export const TNCE_MODE_CONFIG = {
  new: {
    submissionType: "new",
    title: "➕ Add New Registry",
    description: "Submit a brand new registry for review.",
    banner: "Add a new card or registry that is not currently tracked.",
    accent: "blue",
  },

  update: {
    submissionType: "update",
    title: "📝 Submit Registry Update",
    description: "Update this registry with new grading, cert, image, or history information.",
    banner: "This page was detected automatically. Update only what changed.",
    accent: "blue",
  },

  missing: {
  submissionType: "missing",
    title: "⭐ Contribute Missing Card",
    description: "Submit information for a missing card in this registry.",
    banner:
  "⭐ You selected a missing registry spot. The serial number and variation have already been detected. Simply add the grade, certification number, images, and any additional information you have.",
    accent: "gold",
  },
} as const;