"use client";

import { useEffect, useState } from "react";

import SubmissionActions from "./SubmissionActions";
import SubmissionDetails from "./SubmissionDetails";

import type {
  TNCEAdminSubmission,
  TNCEProductionFields,
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

const EMPTY_PRODUCTION_RECORD: TNCEProductionFields = {
  Card_Title: "",
  Serial_Number: "",
  Variation_Input: "",
  Card_History: "",
  Grade: "",
  Cert_Number: "",
  Front_Image: "",
  Back_Image: "",
  Other_Images: "",
};

function buildProductionRecord(
  submission: TNCEAdminSubmission | null
): TNCEProductionFields {
  if (!submission) {
    return { ...EMPTY_PRODUCTION_RECORD };
  }

  return {
    Card_Title: String(submission.Card_Title || ""),
    Serial_Number: String(
      submission.Serial_Number || ""
    ),
    Variation_Input: String(
      submission.Variation_Input || ""
    ),
    Card_History: String(
      submission.Card_History || ""
    ),
    Grade: String(submission.Grade || ""),
    Cert_Number:
  String(submission.Grade || "")
    .trim()
    .toLowerCase() === "raw"
    ? ""
    : String(submission.Cert_Number || ""),
    Front_Image: String(
      submission.Front_Image || ""
    ),
    Back_Image: String(
      submission.Back_Image || ""
    ),
    Other_Images: String(
      submission.Other_Images || ""
    ),
  };
}

function EmptyWorkspace() {
  return (
    <section className="flex min-h-[520px] items-center justify-center rounded-2xl border border-[#9c7a2d] bg-neutral-950 p-8 text-center">
      <div>
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <div className="tnce-pulse absolute h-24 w-24 rounded-full bg-[#d4af37]/20" />

          <img
            src="https://storage.googleapis.com/altered-card-database/2026-06-19_230015_2026_Tiffany_Cards_logo_TCE4395C68_front.png"
            alt="Tiffany Cards"
            className="relative h-16 w-16 object-contain"
          />
        </div>

        <h2 className="mt-5 text-2xl font-black text-white">
          Queue Complete
        </h2>

        <p className="mt-2 max-w-md text-sm text-neutral-400">
          No Pending Review submissions remain.
        </p>
      </div>
    </section>
  );
}

export default function TNCEWorkspace({
  submission,
  onStatusChange,
}: Props) {
  const [productionRecord, setProductionRecord] =
    useState<TNCEProductionFields>(
      buildProductionRecord(submission)
    );

    const [organizedImages, setOrganizedImages] =
  useState<any[]>([]);

const [contributorNotes, setContributorNotes] =
  useState<string>(
    String(submission?.Contributor_Notes || "")
  );

  useEffect(() => {
  const record =
    buildProductionRecord(submission);

  setProductionRecord(record);

setContributorNotes(
  String(submission?.Contributor_Notes || "")
);

const images: any[] = [];

let raw: any = {};

try {
  raw = JSON.parse(
    String(submission?.Raw_Submission_JSON || "{}")
  );
} catch {
  raw = {};
}

const uploadedUrls = String(
  submission?.Uploaded_Image_URLs || ""
)
  .split(/\r?\n/)
  .map((url) => url.trim())
  .filter(Boolean);

const uploadedFiles = Array.isArray(
  raw.uploadedImages
)
  ? raw.uploadedImages
  : [];

uploadedFiles.forEach((file: any, index: number) => {
  const url = uploadedUrls[index];

  if (!url) {
    return;
  }

  const role =
    file.slot === "front"
      ? "front"
      : file.slot === "back"
      ? "back"
      : "additional";

  images.push({
    id: `uploaded-${file.slot || "other"}-${index}`,
    url,
    role,
    rotation: 0,
  });
});

const pastedFront = String(
  raw.imageUrls?.front || ""
).trim();

if (pastedFront) {
  images.push({
    id: "submitted-front-url",
    url: pastedFront,
    role: "front",
    rotation: 0,
  });
}

const pastedBack = String(
  raw.imageUrls?.back || ""
).trim();

if (pastedBack) {
  images.push({
    id: "submitted-back-url",
    url: pastedBack,
    role: "back",
    rotation: 0,
  });
}

const pastedOther = Array.isArray(
  raw.imageUrls?.other
)
  ? raw.imageUrls.other
  : [];

pastedOther.forEach((url: string, index: number) => {
  const cleanUrl = String(url || "").trim();

  if (!cleanUrl) {
    return;
  }

  images.push({
    id: `submitted-other-url-${index}`,
    url: cleanUrl,
    role: "additional",
    rotation: 0,
  });
});

setOrganizedImages(images);

}, [submission?.Submission_ID]);

  if (!submission) {
    return <EmptyWorkspace />;
  }

  return (
  <section className="min-w-0 pb-[calc(7rem+env(safe-area-inset-bottom))] 2xl:pb-8">
      <div className="space-y-6">
        <div className="min-w-0">
  <SubmissionDetails
  submission={submission}
  productionRecord={productionRecord}
  organizedImages={organizedImages}
  contributorNotes={contributorNotes}
  onContributorNotesChange={setContributorNotes}
  onOrganizedImagesChange={setOrganizedImages}
  onProductionChange={setProductionRecord}
/>
        </div>

        <div className="min-w-0">
  <SubmissionActions
    submission={submission}
    productionRecord={productionRecord}
    organizedImages={organizedImages}
    contributorNotes={contributorNotes}
    onStatusChange={onStatusChange}
  />
</div>
      </div>
    </section>
  );
}