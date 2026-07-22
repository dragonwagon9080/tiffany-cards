"use client";

import {
  TNCE_MODE_CONFIG,
  type ContributionMode,
} from "./modeConfig";

import {
  PROJECT_THEME,
  type TNCEProject,
} from "@/lib/tnce/projectTheme";

type Props = {
  mode: ContributionMode;
  project?: TNCEProject;
};

export default function ModeBanner({
  mode,
  project = "rpa-tracker",
}: Props) {
  const config = TNCE_MODE_CONFIG[mode];
  const theme = PROJECT_THEME[project];

  return (
    <div
      className={`rounded-xl border ${theme.border} ${theme.background} p-4 text-sm ${theme.text}`}
    >
      {config.banner}
    </div>
  );
}