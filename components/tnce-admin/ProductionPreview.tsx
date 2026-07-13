"use client";

import type { TNCEAdminSubmission } from "@/lib/tnce/types";

type Props = {
  submission: TNCEAdminSubmission;
  reviewNotes: string;
  applying: boolean;
  onCancel: () => void;
  onApply: () => void;
};

type RawPayload = {
  activeObject?: Record<string, any>;
  fields?: Record<string, any>;
  imageUrls?: {
    front?: string;
    back?: string;
    other?: string[];
  };
  auctionSourceUrl?: string;
};

function clean(value: any) {
  return String(value ?? "").trim();
}

function parseRawPayload(value: string): RawPayload {
  if (!value) return {};

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function splitImages(value: any) {
  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }

  return clean(value)
    .split(/\r?\n|,/)
    .map(clean)
    .filter(Boolean);
}

function uniqueImages(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = value.toLowerCase();

    if (!value || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function formatHistoryEntry(submission: TNCEAdminSubmission) {
  const date = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const source =
    clean(submission.Auction_Source_URL) || "User submitted";

  return [date, clean(submission.Grade), source]
    .filter(Boolean)
    .join(" ");
}

function ChangeRow({
  label,
  currentValue,
  newValue,
}: {
  label: string;
  currentValue?: string;
  newValue?: string;
}) {
  const current = clean(currentValue);
  const next = clean(newValue);

  if (!next || current === next) return null;

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-4">
      <div className="text-xs font-black uppercase tracking-widest text-emerald-300">
        {label}
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <div className="min-w-0 overflow-hidden rounded-lg border border-neutral-800 bg-black p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Current
          </div>

          <div className="mt-1 max-w-full break-all text-sm leading-6 text-neutral-300">
            {current || "Blank"}
          </div>
        </div>

        <div className="hidden text-xl text-emerald-400 sm:block">→</div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-emerald-700/50 bg-black p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            New
          </div>

          <div className="mt-1 max-w-full break-all text-sm font-semibold leading-6 text-white">
            {next}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductionPreview({
  submission,
  reviewNotes,
  applying,
  onCancel,
  onApply,
}: Props) {
  const rawPayload = parseRawPayload(
    submission.Raw_Submission_JSON
  );

  const activeObject = rawPayload.activeObject || {};
  const submittedFields = rawPayload.fields || {};
  const submittedImages = rawPayload.imageUrls || {};

  const isExistingUpdate = Boolean(
    clean(submission.Existing_Card_ID)
  );

  const currentGrade = clean(activeObject.Grade);
  const currentCert = clean(activeObject.Cert_Number);
  const currentFront = clean(activeObject.Front_Image);
  const currentBack = clean(activeObject.Back_Image);

  const submittedGrade =
    clean(submittedFields.Grade) ||
    clean(submission.Grade);

  const submittedCert =
    clean(submittedFields.Cert_Number) ||
    clean(submission.Cert_Number);

  const submittedFront =
    clean(submittedImages.front) ||
    clean(submission.Front_Image);

  const submittedBack =
    clean(submittedImages.back) ||
    clean(submission.Back_Image);

  const newAdditionalImages = uniqueImages([
    ...splitImages(submittedImages.other),
    ...splitImages(submission.Uploaded_Image_URLs),
  ]);

  const currentOtherImages = splitImages(
    activeObject.Other_Images
  );

  const finalOtherImages = uniqueImages([
    ...newAdditionalImages,
    ...(submittedFront &&
    submittedFront !== currentFront &&
    currentFront
      ? [currentFront]
      : []),
    ...(submittedBack &&
    submittedBack !== currentBack &&
    currentBack
      ? [currentBack]
      : []),
    ...currentOtherImages,
  ]).filter(
    (url) => url !== submittedFront && url !== submittedBack
  );

  const historyEntry = formatHistoryEntry(submission);

  const changedCount = [
    submittedGrade && submittedGrade !== currentGrade,
    submittedCert && submittedCert !== currentCert,
    submittedFront && submittedFront !== currentFront,
    submittedBack && submittedBack !== currentBack,
    newAdditionalImages.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/90 px-3 py-4 sm:px-4 sm:py-6">
      <div className="flex max-h-[94vh] w-full max-w-5xl min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d4af37] bg-neutral-950 text-white shadow-[0_0_50px_rgba(212,175,55,.18)]">
        <div className="shrink-0 border-b border-[#9c7a2d]/60 bg-neutral-950/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-[#d4af37]">
                Production Preview
              </div>

              <h2 className="mt-2 break-words text-2xl font-black text-white sm:text-3xl">
                {isExistingUpdate
                  ? "Update Existing Production Card"
                  : submission.Submission_Mode === "missing"
                    ? "⭐ Add Missing Registry Card"
                    : "Add New Production Card"}
              </h2>

              <p className="mt-2 text-sm text-neutral-400">
                Review the exact production action before applying it to the DB sheet.
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={applying}
              className="shrink-0 rounded-full border border-neutral-700 bg-black px-3 py-1.5 text-sm font-bold text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-50"
            >
              X
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="grid min-w-0 gap-6 p-5 sm:p-7">
            <section className="min-w-0 overflow-hidden rounded-xl border border-neutral-800 bg-black p-5">
              <div className="text-xs font-black uppercase tracking-widest text-[#d4af37]">
                Production Target
              </div>

              <h3 className="mt-3 break-words text-xl font-black text-white">
                {submission.Card_Title ||
                  submission.Active_Object_Title ||
                  "Untitled submission"}
              </h3>

              <div className="mt-4 flex min-w-0 flex-wrap gap-3 text-sm">
                {submission.Variation_Input && (
                  <span className="rounded-full border border-blue-600/50 bg-blue-950/30 px-3 py-1 font-bold text-blue-300">
                    {submission.Variation_Input}
                  </span>
                )}

                {submission.Serial_Number && (
                  <span className="rounded-full border border-[#d4af37]/50 bg-[#181300] px-3 py-1 font-bold text-[#f1d36b]">
                    {submission.Serial_Number}
                  </span>
                )}

                {submission.Existing_Card_ID && (
                  <span className="max-w-full break-all rounded-full border border-neutral-700 px-3 py-1 font-mono text-neutral-300">
                    {submission.Existing_Card_ID}
                  </span>
                )}
              </div>
            </section>

            {isExistingUpdate ? (
              <section className="min-w-0">
                <div className="mb-4 flex min-w-0 items-center justify-between gap-4">
                  <h3 className="text-lg font-black uppercase tracking-wide text-white">
                    Detected Changes
                  </h3>

                  <span className="shrink-0 rounded-full border border-emerald-700 bg-emerald-950/30 px-3 py-1 text-sm font-bold text-emerald-300">
                    {changedCount} change
                    {changedCount === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid min-w-0 gap-4">
                  <ChangeRow
                    label="Grade"
                    currentValue={currentGrade}
                    newValue={submittedGrade}
                  />

                  <ChangeRow
                    label="Cert Number"
                    currentValue={currentCert}
                    newValue={submittedCert}
                  />

                  <ChangeRow
                    label="Front Image"
                    currentValue={currentFront}
                    newValue={submittedFront}
                  />

                  <ChangeRow
                    label="Back Image"
                    currentValue={currentBack}
                    newValue={submittedBack}
                  />

                  {newAdditionalImages.length > 0 && (
                    <div className="min-w-0 overflow-hidden rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-4">
                      <div className="text-xs font-black uppercase tracking-widest text-emerald-300">
                        Other Images
                      </div>

                      <p className="mt-2 text-sm text-neutral-300">
                        {newAdditionalImages.length} new additional image
                        {newAdditionalImages.length === 1 ? "" : "s"} will be placed at the top.
                      </p>

                      <p className="mt-1 text-sm text-neutral-400">
                        Final Other Images count: {finalOtherImages.length}
                      </p>
                    </div>
                  )}

                  <div className="min-w-0 overflow-hidden rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Card History
                    </div>

                    <p className="mt-2 text-sm text-neutral-300">
                      The following entry will be added to the top:
                    </p>

                    <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded-lg border border-neutral-800 bg-black p-3">
                      <div className="max-w-full whitespace-normal break-all text-sm leading-6 text-white">
                        {historyEntry}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="min-w-0 overflow-hidden rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-5">
                <h3 className="text-lg font-black uppercase tracking-wide text-emerald-300">
                  New DB Row
                </h3>

                <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                  {[
                    ["Card Title", submission.Card_Title],
                    ["Serial Number", submission.Serial_Number],
                    ["Variation", submission.Variation_Input],
                    ["Grade", submission.Grade],
                    ["Cert Number", submission.Cert_Number],
                    [
                      "Front Image",
                      submission.Front_Image
                        ? "Included"
                        : "Not included",
                    ],
                    [
                      "Back Image",
                      submission.Back_Image
                        ? "Included"
                        : "Not included",
                    ],
                    [
                      "Other Images",
                      `${splitImages(
                        submission.Other_Images
                      ).length} image(s)`,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="min-w-0 overflow-hidden rounded-lg border border-neutral-800 bg-black p-3"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                        {label}
                      </div>

                      <div className="mt-1 max-w-full break-all text-sm leading-6 text-white">
                        {value || "Blank"}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 min-w-0 max-w-full overflow-hidden rounded-lg border border-[#d4af37]/40 bg-[#181300] p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37]">
                    Initial Card History
                  </div>

                  <div className="mt-1 max-w-full whitespace-normal break-all text-sm leading-6 text-[#f1d36b]">
                    {historyEntry}
                  </div>
                </div>
              </section>
            )}

            {reviewNotes && (
              <section className="min-w-0 overflow-hidden rounded-xl border border-blue-700/50 bg-blue-950/20 p-4">
                <div className="text-xs font-black uppercase tracking-widest text-blue-300">
                  Review Notes
                </div>

                <p className="mt-2 max-w-full whitespace-pre-wrap break-words text-sm text-neutral-200">
                  {reviewNotes}
                </p>
              </section>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-800 bg-neutral-950/95 p-5 backdrop-blur sm:p-6">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={applying}
              className="min-w-0 rounded-xl border border-neutral-700 bg-black px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:bg-neutral-900 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onApply}
              disabled={applying}
              className="min-w-0 rounded-xl border border-[#d4af37] bg-[#9c7a2d] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:bg-[#b99236] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {applying
                ? "Applying Changes..."
                : "✔ Apply Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}