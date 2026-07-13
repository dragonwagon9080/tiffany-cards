import { TrackerMeta, TrackerTheme } from "./types";

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

  const reportBg = theme.report_bg_color || "#2563eb";
  const reportHover = theme.report_hover_color || "#1d4ed8";
  const reportBorder = theme.report_border_color || "#60a5fa";
  const reportText = theme.report_text_color || "#ffffff";

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
        <button
          type="button"
          onClick={onContribute}
          className="group relative overflow-hidden rounded-xl border-2 px-8 py-4 font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${reportBg}, #2563eb)`,
            borderColor: reportBorder,
            color: reportText,
            boxShadow: `0 0 18px ${reportBorder}55`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${reportHover}, #1d4ed8)`;
            e.currentTarget.style.boxShadow = `0 0 28px ${reportBorder}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${reportBg}, #2563eb)`;
            e.currentTarget.style.boxShadow = `0 0 18px ${reportBorder}55`;
          }}
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

          <span className="relative flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xl font-bold">
              +
            </span>

            <span>Contribute</span>
          </span>
        </button>
      </div>
    </div>
  );
}