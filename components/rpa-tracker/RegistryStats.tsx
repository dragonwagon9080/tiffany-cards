import { TrackerMeta, TrackerTheme } from "./types";
import TNCEContributeButton from "@/components/shared/TNCEContributeButton";

type Props = {
  meta: TrackerMeta | null;
  theme: TrackerTheme;
  onContribute?: () => void;
};

export default function RegistryStats({
  meta,
  theme,
  onContribute,
}: Props) {
  if (!meta) return null;

  const cardBg = theme.card_bg_color || "#18181b";
  const cardBorder = theme.card_border_color || "#3f3f46";

  const statsText = theme.stats_text_color || "#a1a1aa";
  const statsNumber = theme.stats_number_color || "#ffffff";

    return (
    <div className="mb-8 grid gap-4 md:grid-cols-3">
      <div
        className="rounded-xl border p-5 text-center"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
        }}
      >
        <div
          className="text-3xl font-bold"
          style={{ color: statsNumber }}
        >
          {meta.groupCount.toLocaleString()}
        </div>

        <div
          className="mt-2 text-xs font-bold uppercase tracking-widest"
          style={{ color: statsText }}
        >
          Registries
        </div>
      </div>

      <div
        className="rounded-xl border p-5 text-center"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
        }}
      >
        <div
          className="text-3xl font-bold"
          style={{ color: statsNumber }}
        >
          {meta.cardCount.toLocaleString()}
        </div>

        <div
          className="mt-2 text-xs font-bold uppercase tracking-widest"
          style={{ color: statsText }}
        >
          Cards Tracked
        </div>
      </div>

      <div className="flex h-full items-center justify-center">
        <TNCEContributeButton
  theme={theme}
  onClick={onContribute}
/>
      </div>
    </div>
  );
}