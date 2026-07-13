"use client";

import type { TNCEAdminSubmission } from "@/lib/tnce/types";
import StatusBadge from "./StatusBadge";

type Props = {
  submission: TNCEAdminSubmission | null;
};

function splitImages(value: string) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function modeLabel(mode: string) {
  if (mode === "missing") return "⭐ Missing Registry Card";
  if (mode === "update") return "📝 Existing Card Update";
  if (mode === "new") return "➕ New Registry";

  return mode || "Submission";
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="grid gap-1 border-b border-neutral-800 py-3 last:border-b-0 sm:grid-cols-[170px_1fr] sm:gap-4">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>

      <div
        className={`break-words text-sm text-neutral-200 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default function SubmissionDetails({ submission }: Props) {
  if (!submission) {
    return (
      <section className="flex min-h-[520px] items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center">
        <div>
          <h2 className="text-xl font-bold text-white">
            Select a submission
          </h2>

          <p className="mt-2 max-w-md text-sm text-neutral-400">
            Choose a contribution from the queue to review its card data,
            images, contributor notes, and submission history.
          </p>
        </div>
      </section>
    );
  }

  const additionalImages = splitImages(submission.Other_Images);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
              {modeLabel(submission.Submission_Mode)}
            </div>

            <h2 className="mt-2 text-2xl font-black leading-tight text-white">
              {submission.Card_Title || submission.Active_Object_Title}
            </h2>

            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {submission.Variation_Input && (
                <span className="rounded-full border border-blue-500/40 bg-blue-950/30 px-3 py-1 font-bold text-blue-300">
                  {submission.Variation_Input}
                </span>
              )}

              {submission.Serial_Number && (
                <span className="rounded-full border border-[#d4af37]/50 bg-[#181300] px-3 py-1 font-bold text-[#f1d36b]">
                  {submission.Serial_Number}
                </span>
              )}

              {submission.Grade && (
                <span className="rounded-full border border-neutral-700 bg-black px-3 py-1 font-bold text-neutral-200">
                  {submission.Grade}
                </span>
              )}
            </div>
          </div>

          <StatusBadge status={submission.TNCE_Status} />
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-white">
              Images
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {submission.Front_Image ? (
                <a
                  href={submission.Front_Image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-neutral-800 bg-black"
                >
                  <div className="border-b border-neutral-800 px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-400">
                    Front
                  </div>

                  <div className="flex min-h-72 items-center justify-center p-4">
                    <img
                      src={submission.Front_Image}
                      alt="Submitted card front"
                      className="max-h-96 w-full object-contain transition duration-200 group-hover:scale-[1.02]"
                    />
                  </div>
                </a>
              ) : (
                <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-black p-4 text-sm text-neutral-500">
                  No front image
                </div>
              )}

              {submission.Back_Image ? (
                <a
                  href={submission.Back_Image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-neutral-800 bg-black"
                >
                  <div className="border-b border-neutral-800 px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-400">
                    Back
                  </div>

                  <div className="flex min-h-72 items-center justify-center p-4">
                    <img
                      src={submission.Back_Image}
                      alt="Submitted card back"
                      className="max-h-96 w-full object-contain transition duration-200 group-hover:scale-[1.02]"
                    />
                  </div>
                </a>
              ) : (
                <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-black p-4 text-sm text-neutral-500">
                  No back image
                </div>
              )}
            </div>

            {additionalImages.length > 0 && (
              <div className="mt-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Additional Images
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {additionalImages.map((url, index) => (
                    <a
                      key={`${url}-${index}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group overflow-hidden rounded-lg border border-neutral-800 bg-black"
                    >
                      <div className="flex h-40 items-center justify-center p-3">
                        <img
                          src={url}
                          alt={`Additional image ${index + 1}`}
                          className="max-h-full w-full object-contain transition duration-200 group-hover:scale-[1.03]"
                        />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-800 bg-black p-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-white">
              Contributor Notes
            </h3>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
              {submission.Contributor_Notes || "No notes provided."}
            </p>
          </div>

          {submission.Review_Notes && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-blue-300">
                Review Notes
              </h3>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-200">
                {submission.Review_Notes}
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-black p-4">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-white">
              Production Data
            </h3>

            <DetailRow label="Card Title" value={submission.Card_Title} />
            <DetailRow
              label="Serial Number"
              value={submission.Serial_Number}
            />
            <DetailRow
              label="Variation"
              value={submission.Variation_Input}
            />
            <DetailRow label="Card History" value={submission.Card_History} />
            <DetailRow label="Grade" value={submission.Grade} />
            <DetailRow label="Cert Number" value={submission.Cert_Number} />
            <DetailRow
              label="Existing Card ID"
              value={submission.Existing_Card_ID}
              mono
            />
          </div>

          <div className="rounded-xl border border-neutral-800 bg-black p-4">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-white">
              Submission
            </h3>

            <DetailRow
              label="Submission ID"
              value={submission.Submission_ID}
              mono
            />
            <DetailRow
              label="Submitted"
              value={formatDate(submission.Submitted_At)}
            />
            <DetailRow label="Project" value={submission.Project} />
            <DetailRow label="Mode" value={submission.Submission_Mode} />
            <DetailRow
              label="Active Object"
              value={submission.Active_Object_Title}
            />
            <DetailRow
              label="Active Object ID"
              value={submission.Active_Object_ID}
              mono
            />
          </div>

          <div className="rounded-xl border border-neutral-800 bg-black p-4">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-white">
              Contributor
            </h3>

            <DetailRow
              label="Name"
              value={submission.Contributor_Name || "Anonymous"}
            />
            <DetailRow
              label="Email"
              value={submission.Contributor_Email}
            />
          </div>

          {submission.Source_Page_URL && (
            <a
              href={submission.Source_Page_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-[#9c7a2d] bg-[#181300] px-4 py-3 text-center text-sm font-bold text-[#f1d36b] transition hover:border-[#d4af37] hover:bg-[#241c00]"
            >
              Open Source Page
            </a>
          )}
        </aside>
      </div>
    </section>
  );
}