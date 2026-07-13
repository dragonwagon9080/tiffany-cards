"use client";

import type { TNCEProject } from "@/lib/tnce/types";

type Props = {
  value: TNCEProject | "all";
  onChange: (value: TNCEProject | "all") => void;
};

const PROJECTS: {
  value: TNCEProject | "all";
  label: string;
}[] = [
  {
    value: "all",
    label: "All Projects",
  },
  {
    value: "rpa-tracker",
    label: "RPA Tracker",
  },
  {
    value: "cards-alert",
    label: "Cards Alert",
  },
  {
    value: "tiffany-cards",
    label: "Tiffany Cards",
  },
  {
    value: "guides",
    label: "Interactive Guides",
  },
];

export default function ProjectSelector({
  value,
  onChange,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
        Project
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value as TNCEProject | "all")
        }
        className="h-11 rounded-lg border border-[#9c7a2d] bg-neutral-950 px-4 text-white outline-none transition hover:border-[#d4af37] focus:border-[#d4af37]"
      >
        {PROJECTS.map((project) => (
          <option
            key={project.value}
            value={project.value}
          >
            {project.label}
          </option>
        ))}
      </select>
    </div>
  );
}