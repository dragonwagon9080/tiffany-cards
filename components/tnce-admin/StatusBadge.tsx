import type { TNCEReviewStatus } from "@/lib/tnce/types";

type Props = {
  status: TNCEReviewStatus;
};

const STATUS_STYLES: Record<TNCEReviewStatus, string> = {
  "Pending Review":
    "border-amber-500/50 bg-amber-950/40 text-amber-300",

  "Needs Info":
    "border-sky-500/50 bg-sky-950/40 text-sky-300",

  Rejected:
    "border-red-500/50 bg-red-950/40 text-red-300",

  Published:
    "border-emerald-500/50 bg-emerald-950/40 text-emerald-300",
};

export default function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
        STATUS_STYLES[status]
      }`}
    >
      {status}
    </span>
  );
}