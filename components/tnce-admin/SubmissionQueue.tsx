"use client";

import StatusBadge from "./StatusBadge";

import type {
  TNCEAdminSubmission,
  TNCEReviewStatus,
} from "@/lib/tnce/types";

type Props = {
  submissions: TNCEAdminSubmission[];
  selectedSubmissionId?: string;
  onSelect: (submission: TNCEAdminSubmission) => void;
};

function formatSubmittedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "Unknown date";
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
  if (mode === "missing") return "⭐ Missing Card";
  if (mode === "update") return "📝 Update";
  if (mode === "new") return "➕ New Registry";

  return mode || "Submission";
}

function statusRank(status: TNCEReviewStatus) {
  const ranks: Record<TNCEReviewStatus, number> = {
    "Pending Review": 0,
    "Needs Info": 1,
    Rejected: 2,
    Published: 3,
  };

  return ranks[status];
}

export default function SubmissionQueue({
  submissions,
  selectedSubmissionId,
  onSelect,
}: Props) {
  const sortedSubmissions = [...submissions].sort((a, b) => {
    const statusDifference =
      statusRank(a.TNCE_Status) - statusRank(b.TNCE_Status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const aTime = new Date(a.Submitted_At).getTime();
    const bTime = new Date(b.Submitted_At).getTime();

    return bTime - aTime;
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide text-white">
              Submission Queue
            </h2>

            <p className="mt-1 text-sm text-neutral-400">
              Select a contribution to review.
            </p>
          </div>

          <div className="rounded-full border border-[#9c7a2d] bg-black px-3 py-1 text-sm font-bold text-[#d4af37]">
            {sortedSubmissions.length}
          </div>
        </div>
      </div>

      {sortedSubmissions.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="text-lg font-bold text-white">
            No submissions found
          </div>

          <p className="mt-2 text-sm text-neutral-400">
            Try changing the project, status, or search filters.
          </p>
        </div>
      ) : (
        <div className="max-h-[760px] divide-y divide-neutral-800 overflow-y-auto">
          {sortedSubmissions.map((submission) => {
            const isSelected =
              selectedSubmissionId === submission.Submission_ID;

            return (
              <button
                key={submission.Submission_ID}
                type="button"
                onClick={() => onSelect(submission)}
                className={`block w-full px-5 py-4 text-left transition ${
                  isSelected
                    ? "bg-[#181300] shadow-[inset_4px_0_0_#d4af37]"
                    : "bg-neutral-950 hover:bg-neutral-900"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <StatusBadge status={submission.TNCE_Status} />

                  <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                    {modeLabel(submission.Submission_Mode)}
                  </span>
                </div>

                <div className="mt-3 text-base font-bold leading-snug text-white">
                  {submission.Card_Title || submission.Active_Object_Title}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {submission.Variation_Input && (
                    <span className="text-blue-300">
                      {submission.Variation_Input}
                    </span>
                  )}

                  {submission.Serial_Number && (
                    <span className="font-bold text-[#d4af37]">
                      {submission.Serial_Number}
                    </span>
                  )}

                  {submission.Grade && (
                    <span className="text-neutral-300">
                      {submission.Grade}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-1 text-xs text-neutral-500">
                  <div>
                    {submission.Contributor_Name || "Anonymous contributor"}
                  </div>

                  <div>{formatSubmittedAt(submission.Submitted_At)}</div>

                  <div className="truncate font-mono">
                    {submission.Submission_ID}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}