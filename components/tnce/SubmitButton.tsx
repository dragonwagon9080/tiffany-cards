"use client";

type Props = {
  submitting: boolean;
  label?: string;
  onClick: () => void;
};

export default function SubmitButton({
  submitting,
  label = "Submit for Review",
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {submitting ? "Submitting..." : label}
    </button>
  );
}