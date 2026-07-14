"use client";

import type {
  TNCEAdminSubmission,
  TNCEProductionFields,
} from "@/lib/tnce/types";

type Props = {
  submission: TNCEAdminSubmission;
  productionRecord: TNCEProductionFields;
  reviewNotes: string;
  applying: boolean;
  onCancel: () => void;
  onApply: () => void;
};

type FieldName = keyof TNCEProductionFields;

const FIELD_LABELS: Record<FieldName, string> = {
  Card_Title: "Card Title",
  Serial_Number: "Serial Number",
  Variation_Input: "Variation",
  Card_History: "Card History",
  Grade: "Grade",
  Cert_Number: "Cert Number",
  Front_Image: "Front Image",
  Back_Image: "Back Image",
  Other_Images: "Other Images",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function PreviewRow({
  label,
  submittedValue,
  productionValue,
}: {
  label: string;
  submittedValue: string;
  productionValue: string;
}) {
  const changed =
    clean(submittedValue) !== clean(productionValue);

  return (
    <div
      className={`rounded-xl border p-3 ${
        changed
          ? "border-[#d4af37]/70 bg-[#181300]"
          : "border-neutral-800 bg-black"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-wide text-neutral-400">
          {label}
        </div>

        {changed && (
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#d4af37]">
            Edited
          </div>
        )}
      </div>

      {changed && (
        <div className="mt-2 break-all text-xs text-neutral-500 line-through">
          {submittedValue || "Blank"}
        </div>
      )}

      <div className="mt-1 whitespace-pre-wrap break-all text-sm text-white">
        {productionValue || "Blank"}
      </div>
    </div>
  );
}

export default function ProductionPreview({
  submission,
  productionRecord,
  reviewNotes,
  applying,
  onCancel,
  onApply,
}: Props) {
  const original: TNCEProductionFields = {
    Card_Title: submission.Card_Title || "",
    Serial_Number: submission.Serial_Number || "",
    Variation_Input:
      submission.Variation_Input || "",
    Card_History: submission.Card_History || "",
    Grade: submission.Grade || "",
    Cert_Number: submission.Cert_Number || "",
    Front_Image: submission.Front_Image || "",
    Back_Image: submission.Back_Image || "",
    Other_Images: submission.Other_Images || "",
  };

  const fields = Object.keys(
    FIELD_LABELS
  ) as FieldName[];

  const changedFields = fields.filter(
    (field) =>
      clean(original[field]) !==
      clean(productionRecord[field])
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#d4af37] bg-neutral-950 text-white">
        <div className="flex items-start justify-between gap-5 border-b border-neutral-800 px-5 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-[#d4af37]">
              Production Preview
            </div>

            <h2 className="mt-1 text-xl font-black">
              Confirm Published Record
            </h2>

            <p className="mt-1 text-sm text-neutral-400">
              {changedFields.length} manually edited field
              {changedFields.length === 1 ? "" : "s"}.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="rounded-full border border-neutral-700 bg-black px-3 py-1.5 text-sm font-bold text-neutral-300"
          >
            X
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <PreviewRow
                key={field}
                label={FIELD_LABELS[field]}
                submittedValue={original[field]}
                productionValue={
                  productionRecord[field]
                }
              />
            ))}
          </div>

          {reviewNotes.trim() && (
            <div className="mt-4 rounded-xl border border-blue-700/50 bg-blue-950/20 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-blue-300">
                Review Notes
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-200">
                {reviewNotes}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-3 border-t border-neutral-800 p-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="rounded-xl border border-neutral-700 bg-black px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onApply}
            disabled={applying}
            className="rounded-xl border border-[#d4af37] bg-[#9c7a2d] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:bg-[#b99236] disabled:opacity-60"
          >
            {applying
              ? "Applying Changes..."
              : "✔ Apply Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}