"use client";

import { useMemo, useState } from "react";

import type {
  CardsAlertProductionFields,
  TNCEAdminSubmission,
  TNCEProductionFields,
  TNCEProject,
} from "@/lib/tnce/types";

type ImageRole =
  | "front"
  | "back"
  | "additional";

type PublishImage = {
  id: string;
  url: string;
  role: ImageRole;
  rotation: number;
};

type Props = {
  submissions: TNCEAdminSubmission[];
  project: TNCEProject | "all";
  onComplete: () => Promise<void> | void;
};

type PublishFailure = {
  submissionId: string;
  error: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function splitLines(value: unknown) {
  return clean(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRawSubmission(
  submission: TNCEAdminSubmission
) {
  try {
    return JSON.parse(
      clean(submission.Raw_Submission_JSON) ||
        "{}"
    );
  } catch {
    return {};
  }
}

function buildRpaRecord(
  submission: TNCEAdminSubmission
): TNCEProductionFields {
  const grade = clean(submission.Grade);

  return {
    Card_Title: clean(
      submission.Card_Title
    ),

    Serial_Number: clean(
      submission.Serial_Number
    ),

    Variation_Input: clean(
      submission.Variation_Input
    ),

    Card_History: clean(
      submission.Card_History
    ),

    Grade: grade,

    Cert_Number:
      grade.toLowerCase() === "raw"
        ? ""
        : clean(submission.Cert_Number),

    Front_Image: clean(
      submission.Front_Image
    ),

    Back_Image: clean(
      submission.Back_Image
    ),

    Other_Images: clean(
      submission.Other_Images
    ),
  };
}

function buildRpaImages(
  submission: TNCEAdminSubmission
): PublishImage[] {
  const images: PublishImage[] = [];
  const raw = parseRawSubmission(submission);

  const addImage = (
    url: unknown,
    role: ImageRole,
    id: string
  ) => {
    const cleanedUrl = clean(url);

    if (
      !cleanedUrl ||
      images.some(
        (image) =>
          image.url === cleanedUrl
      )
    ) {
      return;
    }

    images.push({
      id,
      url: cleanedUrl,
      role,
      rotation: 0,
    });
  };

  const uploadedUrls = splitLines(
    submission.Uploaded_Image_URLs
  );

  const uploadedFiles =
    Array.isArray(raw.uploadedImages)
      ? raw.uploadedImages
      : [];

  uploadedFiles.forEach(
    (file: any, index: number) => {
      const url =
        uploadedUrls[index] ||
        clean(file?.publicUrl);

      const slot = clean(
        file?.slot
      ).toLowerCase();

      const role: ImageRole =
        slot === "front"
          ? "front"
          : slot === "back"
            ? "back"
            : "additional";

      addImage(
        url,
        role,
        `uploaded-${slot || "other"}-${index}`
      );
    }
  );

  addImage(
    raw.imageUrls?.front,
    "front",
    "submitted-front-url"
  );

  addImage(
    raw.imageUrls?.back,
    "back",
    "submitted-back-url"
  );

  const otherUrls =
    Array.isArray(raw.imageUrls?.other)
      ? raw.imageUrls.other
      : [];

  otherUrls.forEach(
    (url: unknown, index: number) => {
      addImage(
        url,
        "additional",
        `submitted-other-url-${index}`
      );
    }
  );

  return images;
}

function buildCardsAlertRecord(
  submission: TNCEAdminSubmission
): CardsAlertProductionFields {
  return {
    Year: clean(submission.Year),
    First: clean(submission.First),
    Last: clean(submission.Last),
    Num: clean(submission.Num),
    Brand: clean(submission.Brand),
    Parallel: clean(
      submission.Parallel
    ),

    Serial_Number: clean(
      submission.Serial_Number
    ),

    Grade: clean(submission.Grade),

    Cert_Number: clean(
      submission.Cert_Number
    ),

    Status: clean(submission.Status),

    Description: clean(
      submission.Description
    ),

    Sport: clean(submission.Sport),

    Year_Added: clean(
      submission.Year_Added
    ),

    Site_Link: clean(
      submission.Current_Source_URLs ||
        submission.Site_Link
    ),

    Front_Image: clean(
      submission.Front_Image
    ),

    Back_Image: clean(
      submission.Back_Image
    ),

    Additional_Images: clean(
      submission.Additional_Images
    ),

    Found_By: clean(
      submission.Found_By ||
        submission.Contributor_Name
    ),
  };
}

function buildCardsAlertImages(
  submission: TNCEAdminSubmission
): PublishImage[] {
  const images: PublishImage[] = [];

  const addImage = (
    url: unknown,
    role: ImageRole,
    id: string
  ) => {
    const cleanedUrl = clean(url);

    if (
      !cleanedUrl ||
      images.some(
        (image) =>
          image.url === cleanedUrl
      )
    ) {
      return;
    }

    images.push({
      id,
      url: cleanedUrl,
      role,
      rotation: 0,
    });
  };

  addImage(
    submission.Front_Image,
    "front",
    "cards-alert-front"
  );

  addImage(
    submission.Back_Image,
    "back",
    "cards-alert-back"
  );

  splitLines(
    submission.Additional_Images
  ).forEach((url, index) => {
    addImage(
      url,
      "additional",
      `cards-alert-additional-${index}`
    );
  });

  return images;
}

function buildPublishPayload(
  submission: TNCEAdminSubmission
) {
  if (
    submission.Project ===
    "cards-alert"
  ) {
    return {
      project: submission.Project,

      submissionId:
        submission.Submission_ID,

      reviewNotes: clean(
        submission.Review_Notes
      ),

      contributorNotes: clean(
        submission.Contributor_Notes
      ),

      productionRecord:
        buildCardsAlertRecord(
          submission
        ),

      organizedImages:
        buildCardsAlertImages(
          submission
        ),
    };
  }

  return {
    project: submission.Project,

    submissionId:
      submission.Submission_ID,

    reviewNotes: clean(
      submission.Review_Notes
    ),

    contributorNotes: clean(
      submission.Contributor_Notes
    ),

    productionRecord:
      buildRpaRecord(submission),

    organizedImages:
      buildRpaImages(submission),
  };
}

async function publishOne(
  submission: TNCEAdminSubmission
) {
  const response = await fetch(
    "/api/tnce/admin/publish",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        buildPublishPayload(
          submission
        )
      ),
    }
  );

  const text = await response.text();

  let result: any;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      `Publish API returned invalid JSON: ${text.slice(
        0,
        300
      )}`
    );
  }

  if (
    !response.ok ||
    !result?.ok
  ) {
    throw new Error(
      result?.error ||
        "Publishing failed."
    );
  }

  return result;
}

export default function PublishAllPending({
  submissions,
  project,
  onComplete,
}: Props) {
  const [publishing, setPublishing] =
    useState(false);

  const [current, setCurrent] =
    useState(0);

  const [total, setTotal] =
    useState(0);

  const [currentTitle, setCurrentTitle] =
    useState("");

  const pendingSubmissions =
    useMemo(() => {
      return submissions.filter(
        (submission) => {
          const supportedProject =
            submission.Project ===
              "cards-alert" ||
            submission.Project ===
              "rpa-tracker";

          const projectMatches =
            project === "all" ||
            submission.Project ===
              project;

          return (
            supportedProject &&
            projectMatches &&
            submission.TNCE_Status ===
              "Pending Review"
          );
        }
      );
    }, [submissions, project]);

  async function publishAll() {
    if (
      publishing ||
      pendingSubmissions.length === 0
    ) {
      return;
    }

    const projectLabel =
      project === "cards-alert"
        ? "Cards Alert"
        : project === "rpa-tracker"
          ? "RPA Tracker"
          : "Cards Alert and RPA Tracker";

    const confirmed =
      window.confirm(
        `Publish all ${pendingSubmissions.length} pending ${projectLabel} submissions?\n\n` +
          "This uses the saved submission values currently loaded in TNCE Studio. " +
          "Unsaved edits in the open editor are not included."
      );

    if (!confirmed) {
      return;
    }

    setPublishing(true);
    setCurrent(0);
    setTotal(
      pendingSubmissions.length
    );

    const failures: PublishFailure[] =
      [];
    let publishedCount = 0;

    try {
      for (
        let index = 0;
        index <
        pendingSubmissions.length;
        index++
      ) {
        const submission =
          pendingSubmissions[index];

        setCurrent(index + 1);

        setCurrentTitle(
          clean(
            submission.Active_Object_Title ||
              submission.Card_Title ||
              [
                submission.Year,
                submission.First,
                submission.Last,
                submission.Num
                  ? `#${submission.Num}`
                  : "",
                submission.Brand,
              ]
                .filter(Boolean)
                .join(" ")
          ) ||
            submission.Submission_ID
        );

        try {
          await publishOne(
            submission
          );

          publishedCount++;
        } catch (error: any) {
          failures.push({
            submissionId:
              submission.Submission_ID,

            error:
              error?.message ||
              "Publishing failed.",
          });
        }
      }

      await onComplete();

      if (
        failures.length === 0
      ) {
        window.alert(
          `Publish All complete.\n\n${publishedCount} submissions published successfully.`
        );
      } else {
        const failureList = failures
          .slice(0, 10)
          .map(
            (failure) =>
              `${failure.submissionId}: ${failure.error}`
          )
          .join("\n");

        const remaining =
          failures.length > 10
            ? `\n...and ${
                failures.length - 10
              } more failures.`
            : "";

        window.alert(
          `Publish All finished.\n\n` +
            `${publishedCount} published successfully.\n` +
            `${failures.length} failed.\n\n` +
            failureList +
            remaining
        );
      }
    } finally {
      setPublishing(false);
      setCurrent(0);
      setTotal(0);
      setCurrentTitle("");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={publishAll}
        disabled={
          publishing ||
          pendingSubmissions.length === 0
        }
        className="rounded-lg border border-emerald-500 bg-emerald-800 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {publishing
          ? `Publishing ${current} of ${total}`
          : `Publish All Pending (${pendingSubmissions.length})`}
      </button>

      {publishing && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#d4af37] bg-neutral-950 px-7 py-8 text-center shadow-2xl">
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
              <div className="tnce-pulse absolute h-28 w-28 rounded-full bg-[#d4af37]/20" />

              <img
                src="https://storage.googleapis.com/altered-card-database/2026-06-19_230015_2026_Tiffany_Cards_logo_TCE4395C68_front.png"
                alt="Tiffany Cards"
                className="relative h-20 w-20 object-contain"
              />
            </div>

            <div className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#d4af37]">
              TNCE Studio
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Publishing {current} of{" "}
              {total}
            </h2>

            <p className="mt-3 break-words text-sm text-neutral-300">
              {currentTitle}
            </p>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#9c7a2d] to-[#f1d36b] transition-[width] duration-300"
                style={{
                  width:
                    total > 0
                      ? `${Math.round(
                          (current /
                            total) *
                            100
                        )}%`
                      : "0%",
                }}
              />
            </div>

            <p className="mt-4 text-xs text-neutral-500">
              Please keep this page open
              until publishing completes.
            </p>
          </div>
        </div>
      )}
    </>
  );
}