import Link from "next/link";
import { TrackerMeta, TrackerTheme } from "./types";

type Props = {
  meta: TrackerMeta | null;
  theme: TrackerTheme;
};

export default function RegistryStats({ meta, theme }: Props) {
  if (!meta) return null;

  const cardBg = theme.card_bg_color || "#18181b";
  const cardBorder = theme.card_border_color || "#3f3f46";

  const statsText = theme.stats_text_color || "#a1a1aa";
  const statsNumber = theme.stats_number_color || "#ffffff";

  const reportBg = theme.report_bg_color || "#1e3a8a";
  const reportHover = theme.report_hover_color || "#dc2626";
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
          style={{
            color: statsNumber,
          }}
        >
          {meta.groupCount.toLocaleString()}
        </div>

        <div
          className="mt-2 text-xs font-bold uppercase tracking-widest"
          style={{
            color: statsText,
          }}
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
          style={{
            color: statsNumber,
          }}
        >
          {meta.cardCount.toLocaleString()}
        </div>

        <div
          className="mt-2 text-xs font-bold uppercase tracking-widest"
          style={{
            color: statsText,
          }}
        >
          Cards Tracked
        </div>
      </div>

      <div className="flex items-center justify-center">
        <Link
          href="/rpa-tracker/submit"
          className="rounded border px-5 py-3 text-center text-sm font-bold uppercase tracking-wide transition"
          style={{
            backgroundColor: reportBg,
            borderColor: reportBorder,
            color: reportText,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = reportHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = reportBg;
          }}
        >
          Add / Remove Card
        </Link>
      </div>
    </div>
  );
}