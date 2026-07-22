type Theme = {
  report_bg_color?: string;
  report_hover_color?: string;
  report_border_color?: string;
  report_text_color?: string;
};

type Props = {
  theme: Theme;
  label?: string;
  onClick?: () => void;
};

export default function TNCEContributeButton({
  theme,
  label = "+ Contribute",
  onClick,
}: Props) {
  const reportBg = theme.report_bg_color || "#2563eb";
  const reportHover = theme.report_hover_color || "#1d4ed8";
  const reportBorder = theme.report_border_color || reportBg;
  const reportText = theme.report_text_color || "#ffffff";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border-2 px-8 py-4 font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
      style={{
        background: `linear-gradient(135deg, ${reportBg}, ${reportHover})`,
        borderColor: reportBorder,
        color: reportText,
        boxShadow: `0 0 18px ${reportBorder}55`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `linear-gradient(135deg, ${reportHover}, ${reportBg})`;
        e.currentTarget.style.boxShadow = `0 0 28px ${reportBorder}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `linear-gradient(135deg, ${reportBg}, ${reportHover})`;
        e.currentTarget.style.boxShadow = `0 0 18px ${reportBorder}55`;
      }}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

      <span className="relative flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xl font-bold">
          +
        </span>

        <span>{label.replace(/^\+\s*/, "")}</span>
      </span>
    </button>
  );
}