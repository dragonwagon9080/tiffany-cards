"use client";

import ProductionEditor from "./ProductionEditor";
import StatusBadge from "./StatusBadge";

import type {
  TNCEAdminSubmission,
  TNCEProductionFields,
} from "@/lib/tnce/types";

type Props = {
  submission: TNCEAdminSubmission | null;
  productionRecord: TNCEProductionFields;
  onProductionChange: (
    value: TNCEProductionFields
  ) => void;
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
  if (mode === "missing") {
    return "⭐ Missing Registry Card";
  }

  if (mode === "update") {
    return "📝 Existing Card Update";
  }

  if (mode === "new") {
    return "➕ New Registry";
  }

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
    <div className="grid gap-1 border-b border-neutral-800 py-2.5 last:border-b-0 sm:grid-cols-[150px_1fr] sm:gap-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
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

function UrlRow({
  label,
  url,
}: {
  label: string;
  url?: string;
}) {
  const cleanedUrl = String(url || "").trim();

  if (!cleanedUrl) return null;

  return (
    <div className="border-b border-neutral-800 py-2.5 last:border-b-0">
      <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>

      <a
        href={cleanedUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={cleanedUrl}
        className="mt-1 block truncate text-sm text-[#d4af37] underline decoration-[#d4af37]/50 underline-offset-2 transition hover:text-[#f1d36b]"
      >
        {cleanedUrl}
      </a>
    </div>
  );
}

export default function SubmissionDetails({
  submission,
  productionRecord,
  onProductionChange,
}: Props) {
  if (!submission) {
    return null;
  }

  const originalProductionRecord: TNCEProductionFields = {
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

  const additionalImages = splitImages(
    productionRecord.Other_Images
  );

  const uploadedImages = splitImages(
    submission.Uploaded_Image_URLs
  );

  const allAdditionalImages = Array.from(
    new Set([...additionalImages, ...uploadedImages])
  );

  const verificationUrl =
    String(submission.Auction_Source_URL || "").trim() ||
    String(submission.Source_Page_URL || "").trim();

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
              {modeLabel(submission.Submission_Mode)}
            </div>

            <h2 className="mt-1 truncate text-xl font-black leading-tight text-white">
              {productionRecord.Card_Title ||
                submission.Active_Object_Title ||
                "Untitled submission"}
            </h2>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {productionRecord.Variation_Input && (
                <span className="rounded-full border border-blue-500/40 bg-blue-950/30 px-2.5 py-1 font-bold text-blue-300">
                  {productionRecord.Variation_Input}
                </span>
              )}

              {productionRecord.Serial_Number && (
                <span className="rounded-full border border-[#d4af37]/50 bg-[#181300] px-2.5 py-1 font-bold text-[#f1d36b]">
                  {productionRecord.Serial_Number}
                </span>
              )}

              {productionRecord.Grade && (
                <span className="rounded-full border border-neutral-700 bg-black px-2.5 py-1 font-bold text-neutral-200">
                  {productionRecord.Grade}
                </span>
              )}
            </div>
          </div>

          <StatusBadge status={submission.TNCE_Status} />
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)]">
        <div className="space-y-5">
          <div>
            <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-white">
              Images
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {productionRecord.Front_Image ? (
                <a
                  href={productionRecord.Front_Image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-neutral-800 bg-black"
                >
                  <div className="border-b border-neutral-800 px-3 py-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
                    Front
                  </div>

                  <div className="flex h-64 items-center justify-center p-3">
                    <img
                      src={productionRecord.Front_Image}
                      alt="Production card front"
                      className="max-h-full w-full object-contain transition group-hover:scale-[1.02]"
                    />
                  </div>
                </a>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-black p-4 text-sm text-neutral-500">
                  No front image
                </div>
              )}

              {productionRecord.Back_Image ? (
                <a
                  href={productionRecord.Back_Image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-neutral-800 bg-black"
                >
                  <div className="border-b border-neutral-800 px-3 py-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
                    Back
                  </div>

                  <div className="flex h-64 items-center justify-center p-3">
                    <img
                      src={productionRecord.Back_Image}
                      alt="Production card back"
                      className="max-h-full w-full object-contain transition group-hover:scale-[1.02]"
                    />
                  </div>
                </a>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-black p-4 text-sm text-neutral-500">
                  No back image
                </div>
              )}
            </div>

            {allAdditionalImages.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {allAdditionalImages.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-lg border border-neutral-800 bg-black"
                  >
                    <div className="flex h-28 items-center justify-center p-2">
                      <img
                        src={url}
                        alt={`Additional image ${index + 1}`}
                        className="max-h-full w-full object-contain transition group-hover:scale-[1.03]"
                      />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-800 bg-black p-4">
            <h3 className="text-xs font-black uppercase tracking-wide text-white">
              Contributor Notes
            </h3>

            <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap text-sm leading-5 text-neutral-300">
              {submission.Contributor_Notes ||
                "No notes provided."}
            </p>
          </div>
          <div className="rounded-xl border border-[#9c7a2d] bg-[#181300] p-4">
  <h3 className="text-sm font-black uppercase tracking-wide text-[#f1d36b]">
    Verification
  </h3>

  {verificationUrl ? (
    <UrlRow
      label="Auction / Source URL"
      url={verificationUrl}
    />
  ) : (
    <div className="mt-2 text-sm text-neutral-500">
      No verification URL provided.
    </div>
  )}

  <UrlRow
    label="Front Image"
    url={productionRecord.Front_Image}
  />

  <UrlRow
    label="Back Image"
    url={productionRecord.Back_Image}
  />

  {allAdditionalImages.map((url, index) => (
    <UrlRow
      key={`${url}-verify-${index}`}
      label={`Other Image ${index + 1}`}
      url={url}
    />
  ))}
</div>
        </div>

        <aside className="space-y-4">
          
                    <details className="rounded-xl border border-neutral-800 bg-black p-4">
            <summary className="cursor-pointer text-sm font-black uppercase tracking-wide text-white">
              Submission Information
            </summary>

            <div className="mt-3">
              <DetailRow
                label="Submission ID"
                value={submission.Submission_ID}
                mono
              />

              <DetailRow
                label="Submitted"
                value={formatDate(
                  submission.Submitted_At
                )}
              />

              <DetailRow
                label="Project"
                value={submission.Project}
              />

              <DetailRow
                label="Mode"
                value={submission.Submission_Mode}
              />

              <DetailRow
                label="Existing Card ID"
                value={submission.Existing_Card_ID}
                mono
              />

              <DetailRow
                label="Contributor"
                value={
                  submission.Contributor_Name ||
                  "Anonymous"
                }
              />

              <DetailRow
                label="Email"
                value={submission.Contributor_Email}
              />
            </div>
          </details>
          <ProductionEditor
  original={originalProductionRecord}
  value={productionRecord}
  onChange={onProductionChange}
/>
        </aside>
      </div>
    </section>
  );
}