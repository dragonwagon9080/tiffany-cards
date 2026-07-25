"use client";

import { useEffect, useState } from "react";

import CardsAlertWorkspace from "./CardsAlertWorkspace";
import SubmissionActions from "./SubmissionActions";
import SubmissionDetails from "./SubmissionDetails";

import type { OrganizedImage } from "@/components/shared/ImageOrganizer";
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
    reviewNotes: string,
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
  submission: TNCEAdminSubmission | null,
): TNCEProductionFields {
  if (!submission) {
    return {
      ...EMPTY_PRODUCTION_RECORD,
    };
  }

  const grade = String(submission.Grade || "");

  return {
    Card_Title: String(submission.Card_Title || ""),
    Serial_Number: String(submission.Serial_Number || ""),
    Variation_Input: String(submission.Variation_Input || ""),
    Card_History: String(submission.Card_History || ""),
    Grade: grade,
    Cert_Number:
      grade.trim().toLowerCase() === "raw"
        ? ""
        : String(submission.Cert_Number || ""),
    Front_Image: String(submission.Front_Image || ""),
    Back_Image: String(submission.Back_Image || ""),
    Other_Images: String(submission.Other_Images || ""),
  };
}

function buildRpaImages(
  submission: TNCEAdminSubmission | null,
): OrganizedImage[] {
  if (!submission) return [];

  const images: OrganizedImage[] = [];
  let raw: any = {};

  try {
    raw = JSON.parse(String(submission.Raw_Submission_JSON || "{}"));
  } catch {
    raw = {};
  }

  const uploadedUrls = String(submission.Uploaded_Image_URLs || "")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);

  const uploadedFiles = Array.isArray(raw.uploadedImages)
    ? raw.uploadedImages
    : [];

  uploadedFiles.forEach((file: any, index: number) => {
    const url = uploadedUrls[index] || String(file.publicUrl || "").trim();

    if (!url) return;

    images.push({
      id: `uploaded-${file.slot || "other"}-${index}`,
      url,
      role:
        file.slot === "front"
          ? "front"
          : file.slot === "back"
            ? "back"
            : "additional",
      rotation: 0,
    });
  });

  const addUrl = (
    url: unknown,
    role: "front" | "back" | "additional",
    id: string,
  ) => {
    const cleaned = String(url || "").trim();

    if (cleaned && !images.some((image) => image.url === cleaned)) {
      images.push({
        id,
        url: cleaned,
        role,
        rotation: 0,
      });
    }
  };

  addUrl(raw.imageUrls?.front, "front", "submitted-front-url");
  addUrl(raw.imageUrls?.back, "back", "submitted-back-url");

  const other = Array.isArray(raw.imageUrls?.other) ? raw.imageUrls.other : [];

  other.forEach((url: string, index: number) =>
    addUrl(url, "additional", `submitted-other-url-${index}`),
  );

  return images;
}

function EmptyWorkspace() {
  return (
    <section className="flex min-h-[520px] items-center justify-center rounded-2xl border border-[#9c7a2d] bg-neutral-950 p-8 text-center">
      <div>
        <h2 className="text-2xl font-black text-white">Queue Complete</h2>
        <p className="mt-2 text-sm text-neutral-400">
          No submissions match the current filters.
        </p>
      </div>
    </section>
  );
}

export default function TNCEWorkspace({ submission, onStatusChange }: Props) {
  const [productionRecord, setProductionRecord] =
    useState<TNCEProductionFields>(buildProductionRecord(submission));
  const [organizedImages, setOrganizedImages] = useState<OrganizedImage[]>(
    buildRpaImages(submission),
  );
  const [contributorNotes, setContributorNotes] = useState(
    String(submission?.Contributor_Notes || ""),
  );

  useEffect(() => {
    if (submission?.Project === "cards-alert") {
      return;
    }

    setProductionRecord(buildProductionRecord(submission));
    setOrganizedImages(buildRpaImages(submission));
    setContributorNotes(String(submission?.Contributor_Notes || ""));
  }, [submission?.Submission_ID, submission?.Project]);

  if (!submission) {
    return <EmptyWorkspace />;
  }

  if (submission.Project === "cards-alert") {
    return (
      <CardsAlertWorkspace
        submission={submission}
        onStatusChange={onStatusChange}
      />
    );
  }

  return (
    <section className="min-w-0 pb-[calc(7rem+env(safe-area-inset-bottom))] 2xl:pb-8">
      <div className="space-y-6">
        <SubmissionDetails
          submission={submission}
          productionRecord={productionRecord}
          organizedImages={organizedImages}
          contributorNotes={contributorNotes}
          onContributorNotesChange={setContributorNotes}
          onOrganizedImagesChange={setOrganizedImages}
          onProductionChange={setProductionRecord}
        />

        <SubmissionActions
          submission={submission}
          productionRecord={productionRecord}
          organizedImages={organizedImages}
          contributorNotes={contributorNotes}
          onStatusChange={onStatusChange}
        />
      </div>
    </section>
  );
}