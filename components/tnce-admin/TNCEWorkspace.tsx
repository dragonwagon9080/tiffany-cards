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
    Cert_Number: String(
      submission.Cert_Number || ""
    ),
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

  useEffect(() => {
    setProductionRecord(
      buildProductionRecord(submission)
    );
  }, [submission?.Submission_ID]);

  if (!submission) {
    return <EmptyWorkspace />;
  }

  return (
    <section className="min-w-0">
      <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0">
          <SubmissionDetails
            submission={submission}
            productionRecord={productionRecord}
            onProductionChange={setProductionRecord}
          />
        </div>

        <aside className="min-w-0">
          <div className="2xl:sticky 2xl:top-6">
            <SubmissionActions
              submission={submission}
              productionRecord={productionRecord}
              onStatusChange={onStatusChange}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}