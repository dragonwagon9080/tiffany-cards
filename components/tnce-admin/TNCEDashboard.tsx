"use client";

import { useEffect, useMemo, useState } from "react";

import ProjectSelector from "./ProjectSelector";
import SubmissionQueue from "./SubmissionQueue";
import TNCEWorkspace from "./TNCEWorkspace";

import { getTNCEAdminQueue } from "@/lib/tnce/admin";

import type {
  TNCEAdminStats,
  TNCEAdminSubmission,
  TNCEProject,
  TNCEReviewStatus,
} from "@/lib/tnce/types";

const EMPTY_STATS: TNCEAdminStats = {
  total: 0,
  pending: 0,
  needsInfo: 0,
  rejected: 0,
  published: 0,
};

const STATUS_OPTIONS: {
  value: TNCEReviewStatus | "all";
  label: string;
}[] = [
  {
    value: "Pending Review",
    label: "Pending Review",
  },
  {
    value: "Needs Info",
    label: "Needs Info",
  },
  {
    value: "Rejected",
    label: "Rejected",
  },
  {
    value: "Published",
    label: "Published",
  },
  {
    value: "all",
    label: "All Submissions",
  },
];

function StatCard({
  label,
  value,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-[#d4af37] bg-[#181300] shadow-[0_0_18px_rgba(212,175,55,.18)]"
          : "border-neutral-800 bg-neutral-950 hover:border-neutral-700 hover:bg-neutral-900"
      }`}
    >
      <div
        className={`text-3xl font-black ${
          active ? "text-[#d4af37]" : "text-white"
        }`}
      >
        {value.toLocaleString()}
      </div>

      <div className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
        {label}
      </div>
    </button>
  );
}

function formatRefreshedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function projectMatches(
  submission: TNCEAdminSubmission,
  project: TNCEProject | "all"
) {
  return project === "all" || submission.Project === project;
}

function statusMatches(
  submission: TNCEAdminSubmission,
  status: TNCEReviewStatus | "all"
) {
  return status === "all" || submission.TNCE_Status === status;
}

function searchMatches(
  submission: TNCEAdminSubmission,
  search: string
) {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  const searchable = [
    submission.Card_Title,
    submission.Serial_Number,
    submission.Variation_Input,
    submission.Grade,
    submission.Cert_Number,
    submission.Existing_Card_ID,
    submission.Submission_ID,
    submission.Active_Object_Title,
    submission.Active_Object_ID,
    submission.Contributor_Name,
    submission.Contributor_Email,
    submission.Contributor_Notes,
    submission.Auction_Source_URL,
    submission.Source_Page_URL,
    submission.Review_Notes,
  ]
    .join(" ")
    .toLowerCase();

  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchable.includes(term));
}

function buildStats(
  items: TNCEAdminSubmission[]
): TNCEAdminStats {
  return {
    total: items.length,

    pending: items.filter(
      (submission) =>
        submission.TNCE_Status === "Pending Review"
    ).length,

    needsInfo: items.filter(
      (submission) =>
        submission.TNCE_Status === "Needs Info"
    ).length,

    rejected: items.filter(
      (submission) =>
        submission.TNCE_Status === "Rejected"
    ).length,

    published: items.filter(
      (submission) =>
        submission.TNCE_Status === "Published"
    ).length,
  };
}

export default function TNCEDashboard() {
  const [submissions, setSubmissions] = useState<
    TNCEAdminSubmission[]
  >([]);

  const [stats, setStats] =
    useState<TNCEAdminStats>(EMPTY_STATS);

  const [
    selectedSubmissionId,
    setSelectedSubmissionId,
  ] = useState("");

  const [project, setProject] = useState<
    TNCEProject | "all"
  >("all");

  const [status, setStatus] = useState<
    TNCEReviewStatus | "all"
  >("Pending Review");

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState("");

  async function loadSubmissions() {
    setLoading(true);
    setLoadError("");

    try {
      const response = await getTNCEAdminQueue();

      if (!response.ok) {
        throw new Error(
          response.error ||
            "Unable to load TNCE submissions."
        );
      }

      const items = response.submissions || [];

      setSubmissions(items);
      setStats(response.stats || buildStats(items));
      setRefreshedAt(
        response.refreshedAt ||
          new Date().toISOString()
      );

      setSelectedSubmissionId((currentId) => {
        if (
          currentId &&
          items.some(
            (submission) =>
              submission.Submission_ID === currentId
          )
        ) {
          return currentId;
        }

        const firstPending = items.find(
          (submission) =>
            submission.TNCE_Status === "Pending Review"
        );

        return (
          firstPending?.Submission_ID ||
          items[0]?.Submission_ID ||
          ""
        );
      });
    } catch (error: any) {
      setLoadError(
        error?.message ||
          "Unable to load TNCE submissions."
      );

      setSubmissions([]);
      setStats(EMPTY_STATS);
      setSelectedSubmissionId("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(
      (submission) =>
        projectMatches(submission, project) &&
        statusMatches(submission, status) &&
        searchMatches(submission, search)
    );
  }, [submissions, project, status, search]);

  const selectedSubmission = useMemo(() => {
    const selected = filteredSubmissions.find(
      (submission) =>
        submission.Submission_ID ===
        selectedSubmissionId
    );

    return selected || filteredSubmissions[0] || null;
  }, [filteredSubmissions, selectedSubmissionId]);

  useEffect(() => {
    const nextId =
      selectedSubmission?.Submission_ID || "";

    if (nextId !== selectedSubmissionId) {
      setSelectedSubmissionId(nextId);
    }
  }, [selectedSubmission, selectedSubmissionId]);

  function selectStatus(
    nextStatus: TNCEReviewStatus | "all"
  ) {
    setStatus(nextStatus);
    setSelectedSubmissionId("");
  }

  function resetFilters() {
    setProject("all");
    setStatus("Pending Review");
    setSearchDraft("");
    setSearch("");
    setSelectedSubmissionId("");
  }

  function handleStatusChange(
  submissionId: string,
  nextStatus: TNCEReviewStatus,
  reviewNotes: string
) {
  const currentIndex = filteredSubmissions.findIndex(
    (submission) =>
      submission.Submission_ID === submissionId
  );

  /*
   * Prefer the card immediately after the current card.
   * If the current card is last, use the card immediately before it.
   */
  const nextSubmission =
    filteredSubmissions[currentIndex + 1] ||
    filteredSubmissions[currentIndex - 1] ||
    null;

  setSubmissions((current) => {
    const updated = current.map((submission) => {
      if (submission.Submission_ID !== submissionId) {
        return submission;
      }

      return {
        ...submission,
        TNCE_Status: nextStatus,

        Review_Notes:
          nextStatus === "Pending Review"
            ? ""
            : reviewNotes,

        Reviewed_At:
          nextStatus === "Pending Review"
            ? ""
            : new Date().toISOString(),

        Reviewer:
          nextStatus === "Pending Review"
            ? ""
            : submission.Reviewer || "Admin",
      };
    });

    setStats(buildStats(updated));

    return updated;
  });

  /*
   * When publishing from Pending Review, the published card
   * leaves the visible queue and the next visible card opens.
   */
  if (
    status === "Pending Review" &&
    nextStatus !== "Pending Review"
  ) {
    setSelectedSubmissionId(
      nextSubmission?.Submission_ID || ""
    );

    return;
  }

  /*
   * For other filtered views, keep the changed card selected
   * when it remains visible.
   */
  if (
    status === "all" ||
    status === nextStatus
  ) {
    setSelectedSubmissionId(submissionId);

    return;
  }

  setSelectedSubmissionId(
    nextSubmission?.Submission_ID || ""
  );
}

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px]">
        <header className="overflow-hidden rounded-2xl border border-[#9c7a2d] bg-neutral-950">
          <div className="border-b border-[#9c7a2d]/60 bg-gradient-to-r from-[#181300] via-neutral-950 to-[#181300] px-5 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.28em] text-[#d4af37]">
                  Tiffany Cards Network Contribution
                  Engine
                </div>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  TNCE Studio
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
                  Review contributions, inspect submitted
                  evidence, prepare production records, and
                  publish approved updates.
                </p>
              </div>

              <div className="flex flex-col gap-2 text-sm text-neutral-400 lg:items-end">
                {refreshedAt && (
                  <div>
                    Last refreshed:{" "}
                    <span className="font-semibold text-neutral-200">
                      {formatRefreshedAt(refreshedAt)}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={loadSubmissions}
                  disabled={loading}
                  className="rounded-lg border border-[#9c7a2d] bg-black px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-[#d4af37] transition hover:border-[#d4af37] hover:bg-[#181300] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Refreshing..."
                    : "Refresh Queue"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Pending"
              value={stats.pending}
              active={status === "Pending Review"}
              onClick={() =>
                selectStatus("Pending Review")
              }
            />

            <StatCard
              label="Needs Info"
              value={stats.needsInfo}
              active={status === "Needs Info"}
              onClick={() =>
                selectStatus("Needs Info")
              }
            />

            <StatCard
              label="Rejected"
              value={stats.rejected}
              active={status === "Rejected"}
              onClick={() => selectStatus("Rejected")}
            />

            <StatCard
              label="Published"
              value={stats.published}
              active={status === "Published"}
              onClick={() => selectStatus("Published")}
            />
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[260px_240px_minmax(260px,1fr)_auto] lg:items-end">
            <ProjectSelector
              value={project}
              onChange={(value) => {
                setProject(value);
                setSelectedSubmissionId("");
              }}
            />

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  selectStatus(
                    event.target.value as
                      | TNCEReviewStatus
                      | "all"
                  )
                }
                className="h-11 rounded-lg border border-[#9c7a2d] bg-neutral-950 px-4 text-white outline-none transition hover:border-[#d4af37] focus:border-[#d4af37]"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchDraft);
                setSelectedSubmissionId("");
              }}
            >
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
                Search
              </label>

              <div className="flex gap-2">
                <input
                  value={searchDraft}
                  onChange={(event) =>
                    setSearchDraft(event.target.value)
                  }
                  className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-700 bg-black px-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#d4af37]"
                  placeholder="Card, serial, cert, contributor..."
                />

                <button
                  type="submit"
                  className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-blue-500"
                >
                  Search
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={resetFilters}
              className="h-11 rounded-lg border border-neutral-700 bg-black px-5 text-sm font-bold uppercase tracking-wide text-neutral-300 transition hover:bg-neutral-900 hover:text-white"
            >
              Reset
            </button>
          </div>
        </section>

        {loadError && (
          <div className="mt-6 rounded-xl border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">
            {loadError}
          </div>
        )}

        {loading && submissions.length === 0 ? (
          <div className="mt-6 flex min-h-[500px] items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950">
            <div className="text-center">
              <div className="text-xl font-bold text-white">
                Loading TNCE queue...
              </div>

              <p className="mt-2 text-sm text-neutral-400">
                Retrieving contribution submissions.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[370px_minmax(0,1fr)]">
            <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              <SubmissionQueue
                submissions={filteredSubmissions}
                selectedSubmissionId={
                  selectedSubmission?.Submission_ID ||
                  ""
                }
                onSelect={(submission) =>
                  setSelectedSubmissionId(
                    submission.Submission_ID
                  )
                }
              />
            </div>

            <TNCEWorkspace
              submission={selectedSubmission}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}
      </div>
    </main>
  );
}