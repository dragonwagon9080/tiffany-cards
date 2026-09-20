"use client";

import {
  useState,
} from "react";

type ReviewStatus =
  | "Confirmed Match"
  | "Not a Match"
  | "Needs Review";

type Props = {
  matchId?: string;
  initialStatus?: string;
};

export default function MatchReviewControls({
  matchId,
  initialStatus,
}: Props) {
  const [status, setStatus] =
    useState(
      String(
        initialStatus ||
          "Pending Review"
      ).trim()
    );

  const [savingStatus, setSavingStatus] =
    useState<ReviewStatus | null>(
      null
    );

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function saveReview(
    reviewStatus: ReviewStatus
  ) {
    const cleanedMatchId =
      String(matchId || "").trim();

    if (!cleanedMatchId) {
      setError(
        "This match is missing its Match ID."
      );
      setMessage("");
      return;
    }

    setSavingStatus(reviewStatus);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/seller-tracker",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "reviewMatch",
            matchId: cleanedMatchId,
            reviewStatus,
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            "Unable to save review status."
        );
      }

      const savedStatus =
        String(
          data.reviewStatus ||
            reviewStatus
        ).trim();

      setStatus(savedStatus);
      setMessage(
        `Review saved: ${savedStatus}`
      );
    } catch (saveError: any) {
      setError(
        saveError?.message ||
          "Unable to save review status."
      );
    } finally {
      setSavingStatus(null);
    }
  }

  const isSaving =
    savingStatus !== null;

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/40 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
            Manual Review Decision
          </p>

          <p className="mt-1 text-sm text-zinc-300">
            Current status:{" "}
            <span
              className={`font-bold ${
                status === "Confirmed Match"
                  ? "text-emerald-400"
                  : status === "Not a Match"
                    ? "text-red-400"
                    : status === "Needs Review" ||
                        status === "Pending Review"
                      ? "text-amber-400"
                      : "text-white"
              }`}
            >
              {status}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              saveReview(
                "Confirmed Match"
              )
            }
            className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-950/70 px-4 py-2.5 text-sm font-bold text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingStatus ===
            "Confirmed Match"
              ? "Saving..."
              : "Confirmed Match"}
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              saveReview(
                "Not a Match"
              )
            }
            className="inline-flex items-center justify-center rounded-lg border border-red-800 bg-red-950/70 px-4 py-2.5 text-sm font-bold text-red-200 transition hover:border-red-600 hover:bg-red-900/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingStatus ===
            "Not a Match"
              ? "Saving..."
              : "Not a Match"}
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              saveReview(
                "Needs Review"
              )
            }
            className="inline-flex items-center justify-center rounded-lg border border-amber-800 bg-amber-950/70 px-4 py-2.5 text-sm font-bold text-amber-200 transition hover:border-amber-600 hover:bg-amber-900/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingStatus ===
            "Needs Review"
              ? "Saving..."
              : "Needs Review"}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`mt-3 text-sm font-semibold ${
            status === "Confirmed Match"
              ? "text-emerald-300"
              : status === "Not a Match"
                ? "text-red-300"
                : status === "Needs Review" ||
                    status === "Pending Review"
                  ? "text-amber-300"
                  : "text-zinc-300"
          }`}
        >
          {message}
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
