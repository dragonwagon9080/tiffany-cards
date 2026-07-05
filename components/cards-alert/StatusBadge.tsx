type StatusConfig = {
  status_label?: string;
  display_name?: string;
  text_color?: string;
  border_color?: string;
  bg_color?: string;
  badge_style?: string;
  active?: boolean | string;
};

function normalize(value: any) {
  return String(value || "").trim().toLowerCase();
}

export default function StatusBadge({
  status,
  statuses = [],
  size = "small",
}: {
  status?: string;
  statuses?: StatusConfig[];
  size?: "small" | "large";
}) {
  if (!status) return null;

  const match = statuses.find(
    (item) => normalize(item.status_label) === normalize(status)
  );
console.log("Status:", status);
console.log("Statuses:", statuses);
console.log("Match:", match);
  const displayName = match?.display_name || status;

  const textColor = match?.text_color || "#ffffff";
  const borderColor = match?.border_color || "#d4af37";
  const glowColor = match?.bg_color || borderColor;
  const badgeStyle = (match?.badge_style || "outline").toLowerCase();

  const style: React.CSSProperties = {
    color: textColor,
    borderColor,
  };

  switch (badgeStyle) {
    case "solid":
      style.backgroundColor = borderColor;
      style.color = "#ffffff";
      break;

    case "glow":
      style.boxShadow = `0 0 12px ${glowColor}`;
      break;

    case "gradient":
      style.background = `linear-gradient(135deg, ${borderColor}, ${glowColor})`;
      style.color = "#ffffff";
      break;

    case "outline":
    default:
      // Black background with colored border
      break;
  }

  return (
    <div
      className={`inline-block rounded-lg border-2 bg-black px-3 py-1 ${
        size === "large"
          ? "text-lg md:text-xl font-bold"
          : "text-sm font-semibold"
      }`}
      style={style}
    >
      <span className="text-white">
        Reported as Possibly:&nbsp;
      </span>

      <span
        style={{
          color: style.color,
          fontWeight: 800,
          letterSpacing: ".05em",
        }}
      >
        {displayName.toUpperCase()}
      </span>
    </div>
  );
}