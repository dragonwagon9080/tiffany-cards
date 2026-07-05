import RegistryCard from "./RegistryCard";
import {
  RegistryGroup,
  TrackerTheme,
} from "./types";

export default function RegistryGrid({
  groups,
  theme,
}: {
  groups: RegistryGroup[];
  theme: TrackerTheme;
}) {
  if (!groups.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center">
        <h2 className="text-xl font-bold text-white">
          No Registries Found
        </h2>

        <p className="mt-3 text-zinc-400">
          Try changing your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {groups.map((group) => (
        <RegistryCard
          key={group.Slug}
          group={group}
          theme={theme}
        />
      ))}
    </div>
  );
}