"use client";

import { useState } from "react";

import ProductionPreview from "./ProductionPreview";

import type {
  TNCEAdminActionRequest,
  TNCEAdminSubmission,
  TNCEReviewStatus,
} from "@/lib/tnce/types";

type Props = {
  submission: TNCEAdminSubmission | null;
  onStatusChange?: (
    submissionId: string,
    status: TNCEReviewStatus,
    reviewNotes: string
  ) => void;
};

type ReviewAction = "needs-info" | "reject" | "reset-pending";

export default function SubmissionActions({
  submission,
  onStatusChange,
}: Props) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [activeAction, setActiveAction] =
    useState<ReviewAction | null>(null);

  const [showProductionPreview, setShowProductionPreview] =
    useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  if (!submission) return null;

  const currentSubmission = submission;

  async function submitStatusAction(
    action: ReviewAction,
    status: TNCEReviewStatus
  ) {
    const cleanedNotes = reviewNotes.trim();

    if (
      (action === "needs-info" || action === "reject") &&
      !cleanedNotes
    ) {
      setMessage("A review note is required for this action.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const payload: TNCEAdminActionRequest = {
        submissionId: currentSubmission.Submission_ID,
        action,
        reviewNotes: cleanedNotes,
      };

      // Live status endpoints will be connected next.
      await new Promise((resolve) => setTimeout(resolve, 300));

      onStatusChange?.(
        payload.submissionId,
        status,
        cleanedNotes
      );

      setMessage(`Submission marked ${status}.`);
      setActiveAction(null);
      setReviewNotes("");
    } catch (error: any) {
      setMessage(error?.message || "TNCE action failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function applyProductionChanges() {
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/tnce/admin/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId: currentSubmission.Submission_ID,
          reviewNotes: reviewNotes.trim(),
        }),
      });

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
        throw new Error(data.error || "Publishing failed.");
      }

      onStatusChange?.(
        currentSubmission.Submission_ID,
        "Published",
        reviewNotes.trim()
      );

      setShowProductionPreview(false);
      setReviewNotes("");

      const changedFields = Array.isArray(data.changedFields)
        ? data.changedFields.join(", ")
        : "";

      setMessage(
        [
          data.message || "Submission published successfully.",
          data.productionRow
            ? `DB row: ${data.productionRow}.`
            : "",
          changedFields
            ? `Changes: ${changedFields}.`
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
    } catch (error: any) {
  const errorMessage = error?.message || "Publishing failed.";

  setMessage(errorMessage);
  window.alert(errorMessage);
} finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6">
        <h2 className="text-lg font-black uppercase tracking-wide text-white">
          Review Actions
        </h2>

        <p className="mt-2 text-sm text-neutral-400">
          Publish the submission, request additional information, or reject it.
        </p>

        <label className="mt-5 grid gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            Review Notes
          </span>

          <textarea
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            className="min-h-28 rounded-xl border border-neutral-700 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#d4af37]"
            placeholder="Add verification details, rejection reason, or information needed."
          />
        </label>

        {currentSubmission.TNCE_Status === "Pending Review" ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setShowProductionPreview(true)}
              className="rounded-xl border border-[#d4af37] bg-[#9c7a2d] px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-black transition hover:bg-[#b99236]"
            >
              ✔ Publish
            </button>

            <button
              type="button"
              onClick={() => setActiveAction("needs-info")}
              className="rounded-xl border border-sky-500/60 bg-sky-800 px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:bg-sky-700"
            >
              Needs Info
            </button>

            <button
              type="button"
              onClick={() => setActiveAction("reject")}
              className="rounded-xl border border-red-500/60 bg-red-800 px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActiveAction("reset-pending")}
            className="mt-5 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-sm font-bold uppercase tracking-wide text-neutral-300 transition hover:bg-neutral-900 hover:text-white"
          >
            Return to Pending Review
          </button>
        )}

        {activeAction && (
          <div className="mt-5 rounded-xl border border-[#d4af37]/50 bg-[#181300] p-4">
            <h3 className="font-bold text-[#f1d36b]">
              Confirm Review Action
            </h3>

            <p className="mt-2 text-sm text-neutral-300">
              {activeAction === "needs-info" &&
                "Move this submission to Needs Info?"}

              {activeAction === "reject" &&
                "Reject and archive this submission?"}

              {activeAction === "reset-pending" &&
                "Return this submission to the Pending Review queue?"}
            </p>

            {(activeAction === "needs-info" ||
              activeAction === "reject") &&
              !reviewNotes.trim() && (
                <p className="mt-2 text-sm font-bold text-amber-300">
                  A review note is required.
                </p>
              )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  if (activeAction === "needs-info") {
                    submitStatusAction("needs-info", "Needs Info");
                  }

                  if (activeAction === "reject") {
                    submitStatusAction("reject", "Rejected");
                  }

                  if (activeAction === "reset-pending") {
                    submitStatusAction(
                      "reset-pending",
                      "Pending Review"
                    );
                  }
                }}
                className="flex-1 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide text-black transition hover:bg-[#f1d36b] disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Confirm"}
              </button>

              <button
                type="button"
                onClick={() => setActiveAction(null)}
                disabled={submitting}
                className="rounded-lg border border-neutral-700 bg-black px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-neutral-900"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-xl border border-neutral-700 bg-black p-4 text-sm text-neutral-200">
            {message}
          </div>
        )}
      </section>

      {showProductionPreview && (
        <ProductionPreview
          submission={currentSubmission}
          reviewNotes={reviewNotes}
          applying={submitting}
          onCancel={() => setShowProductionPreview(false)}
          onApply={applyProductionChanges}
        />
      )}
    </>
  );
}