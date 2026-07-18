"use client";

import { useEffect, useState } from "react";

import type {
  TNCEAdminActionRequest,
  TNCEAdminSubmission,
  TNCEProductionFields,
  TNCEReviewStatus,
} from "@/lib/tnce/types";

import type {
  OrganizedImage,
} from "@/components/shared/ImageOrganizer";

type Props = {
  submission: TNCEAdminSubmission | null;
  productionRecord: TNCEProductionFields;
  organizedImages: OrganizedImage[];

  onStatusChange?: (
    submissionId: string,
    status: TNCEReviewStatus,
    reviewNotes: string
  ) => void;
};

type ReviewAction =
  | "needs-info"
  | "reject"
  | "reset-pending";

export default function SubmissionActions({
  submission,
  productionRecord,
  organizedImages,
  onStatusChange,
}: Props) {
  const [reviewNotes, setReviewNotes] = useState("");

  const [activeAction, setActiveAction] =
    useState<ReviewAction | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setReviewNotes(submission?.Review_Notes || "");
    setActiveAction(null);
    setMessage("");
  }, [submission?.Submission_ID]);

  if (!submission) return null;

  const currentSubmission = submission;

  async function submitStatusAction(
    action: ReviewAction,
    status: TNCEReviewStatus
  ) {
    const cleanedNotes = reviewNotes.trim();

    if (
      (action === "needs-info" ||
        action === "reject") &&
      !cleanedNotes
    ) {
      setMessage(
        "A review note is required for this action."
      );
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const payload: TNCEAdminActionRequest = {
        submissionId:
          currentSubmission.Submission_ID,
        action,
        reviewNotes: cleanedNotes,
      };

      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );

      onStatusChange?.(
        payload.submissionId,
        status,
        cleanedNotes
      );

      setActiveAction(null);
      setReviewNotes("");
    } catch (error: any) {
      setMessage(
        error?.message || "TNCE action failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function publishSubmission() {
    if (submitting) return;

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/tnce/admin/publish",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
  submissionId:
    currentSubmission.Submission_ID,

  reviewNotes: reviewNotes.trim(),

  productionRecord,

  organizedImages: organizedImages.map(
    (image) => ({
      id: image.id,
      url: image.url,
      role: image.role,
      rotation: image.rotation || 0,
    })
  ),
}),
        }
      );

      const text = await response.text();

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Publish API returned invalid JSON. First response text: ${text.slice(
            0,
            300
          )}`
        );
      }

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "Publishing failed."
        );
      }

      onStatusChange?.(
        currentSubmission.Submission_ID,
        "Published",
        reviewNotes.trim()
      );

      setReviewNotes("");
    } catch (error: any) {
      const errorMessage =
        error?.message || "Publishing failed.";

      setMessage(errorMessage);
      window.alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
  <>
  {submitting && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="flex flex-col items-center rounded-2xl border border-[#d4af37] bg-neutral-950 px-10 py-8 shadow-2xl">
      <div className="relative flex items-center justify-center">
  <div className="absolute h-28 w-28 rounded-full bg-[#d4af37]/20 tnce-pulse" />

  <img
    src="https://storage.googleapis.com/altered-card-database/2026-06-19_230015_2026_Tiffany_Cards_logo_TCE4395C68_front.png"
    alt="Tiffany Cards"
    className="relative h-20 w-20 object-contain"
  />
</div>

      <div className="mt-6 text-xl font-black text-white">
        Publishing...
      </div>

      <div className="mt-2 text-sm text-neutral-400">
        Updating production database...
      </div>
    </div>
  </div>
)}
<section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-white">
        Review Actions
      </h2>

      <label className="mt-3 grid gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">
          Review Notes
        </span>

        <textarea
          value={reviewNotes}
          onChange={(event) =>
            setReviewNotes(event.target.value)
          }
          className="min-h-24 resize-y rounded-xl border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#d4af37]"
          placeholder="Verification details or information needed."
        />
      </label>

      {currentSubmission.TNCE_Status ===
      "Pending Review" ? (
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={publishSubmission}
            disabled={submitting}
            className="rounded-xl border border-[#d4af37] bg-[#9c7a2d] px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:bg-[#b99236] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Publishing..."
              : "✔ Publish"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveAction("needs-info")
              }
              disabled={submitting}
              className="rounded-xl border border-sky-500/60 bg-sky-800 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              Needs Info
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveAction("reject")
              }
              disabled={submitting}
              className="rounded-xl border border-red-500/60 bg-red-800 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            setActiveAction("reset-pending")
          }
          disabled={submitting}
          className="mt-4 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-300 transition hover:bg-neutral-900 hover:text-white disabled:opacity-60"
        >
          Return to Pending Review
        </button>
      )}

      {activeAction && (
        <div className="mt-4 rounded-xl border border-[#d4af37]/50 bg-[#181300] p-3">
          <div className="text-sm font-bold text-[#f1d36b]">
            Confirm Review Action
          </div>

          <p className="mt-2 text-sm text-neutral-300">
            {activeAction === "needs-info" &&
              "Move this submission to Needs Info?"}

            {activeAction === "reject" &&
              "Reject and archive this submission?"}

            {activeAction === "reset-pending" &&
              "Return this submission to Pending Review?"}
          </p>

          {(activeAction === "needs-info" ||
            activeAction === "reject") &&
            !reviewNotes.trim() && (
              <p className="mt-2 text-xs font-bold text-amber-300">
                A review note is required.
              </p>
            )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                if (activeAction === "needs-info") {
                  submitStatusAction(
                    "needs-info",
                    "Needs Info"
                  );
                }

                if (activeAction === "reject") {
                  submitStatusAction(
                    "reject",
                    "Rejected"
                  );
                }

                if (
                  activeAction === "reset-pending"
                ) {
                  submitStatusAction(
                    "reset-pending",
                    "Pending Review"
                  );
                }
              }}
              className="rounded-lg bg-[#d4af37] px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide text-black disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Confirm"}
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveAction(null)
              }
              disabled={submitting}
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-xl border border-red-700 bg-red-950/30 p-3 text-sm text-red-200">
          {message}
        </div>
      )}
    </section>
</>
);
}