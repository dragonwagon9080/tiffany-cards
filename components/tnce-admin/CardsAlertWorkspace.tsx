"use client";

import { useEffect, useMemo, useState } from "react";

import ImageOrganizer, {
  type OrganizedImage,
} from "@/components/shared/ImageOrganizer";
import SubmissionActions from "./SubmissionActions";

import type {
  CardsAlertProductionFields,
  TNCEAdminSubmission,
  TNCEReviewStatus,
} from "@/lib/tnce/types";

type Props = {
  submission: TNCEAdminSubmission;
  onStatusChange?: (
    submissionId: string,
    status: TNCEReviewStatus,
    reviewNotes: string,
  ) => void;
};

const FIELD_GROUPS = [
  {
    title: "Card Identity",
    fields: [
      ["Year", "Year"],
      ["Sport", "Sport"],
      ["First", "First Name"],
      ["Last", "Last Name"],
      ["Num", "Card #"],
      ["Brand", "Brand"],
      ["Parallel", "Parallel"],
      ["Serial_Number", "Serial #"],
      ["Status", "Reason for Report"],
    ],
  },
  {
    title: "Current Card",
    fields: [
      ["Grade", "Current Grade"],
      ["Cert_Number", "Current Cert #"],
      ["Year_Added", "Year Added"],
      ["Site_Link", "Current Source URLs"],
      ["Found_By", "Found By"],
      ["Description", "Description / Opinion"],
    ],
  },
] as const;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function splitLines(value: unknown) {
  return clean(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildRecord(
  submission: TNCEAdminSubmission,
): CardsAlertProductionFields {
  return {
    Year: clean(submission.Year),
    First: clean(submission.First),
    Last: clean(submission.Last),
    Num: clean(submission.Num),
    Brand: clean(submission.Brand),
    Parallel: clean(submission.Parallel),
    Serial_Number: clean(submission.Serial_Number),
    Grade: clean(submission.Grade),
    Cert_Number: clean(submission.Cert_Number),
    Status: clean(submission.Status),
    Description: clean(submission.Description),
    Sport: clean(submission.Sport),
    Year_Added: clean(submission.Year_Added),
    Site_Link: clean(submission.Current_Source_URLs || submission.Site_Link),
    Front_Image: clean(submission.Front_Image),
    Back_Image: clean(submission.Back_Image),
    Additional_Images: clean(submission.Additional_Images),
    Found_By: clean(submission.Found_By || submission.Contributor_Name),
  };
}

function buildImages(submission: TNCEAdminSubmission): OrganizedImage[] {
  const images: OrganizedImage[] = [];

  const add = (
    url: string,
    role: "front" | "back" | "additional",
    id: string,
  ) => {
    if (!url) return;

    images.push({
      id,
      url,
      role,
      rotation: 0,
    });
  };

  add(clean(submission.Front_Image), "front", "cards-alert-front");
  add(clean(submission.Back_Image), "back", "cards-alert-back");

  splitLines(submission.Additional_Images).forEach((url, index) =>
    add(url, "additional", `cards-alert-additional-${index}`),
  );

  return images;
}

function Field({
  label,
  value,
  currentValue,
  multiline = false,
  onChange,
}: {
  label: string;
  value: string;
  currentValue: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const changed = clean(value) !== clean(currentValue);

  return (
    <div
      className={`rounded-xl border p-3 ${
        changed
          ? "border-red-500/60 bg-red-950/20"
          : "border-neutral-800 bg-black"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-wide text-white">
          {label}
        </span>
        {changed && (
          <span className="text-[10px] font-black uppercase text-red-300">
            Changed
          </span>
        )}
      </div>

      {currentValue && (
        <div className="mb-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-500">
          Current: {currentValue}
        </div>
      )}

      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm text-white outline-none focus:border-red-500"
        />
      )}
    </div>
  );
}

function EvidenceImages({
  title,
  front,
  back,
  other,
}: {
  title: string;
  front: string;
  back: string;
  other: string;
}) {
  const images = [clean(front), clean(back), ...splitLines(other)].filter(
    Boolean,
  );

  if (!images.length) return null;

  return (
    <section className="rounded-xl border border-neutral-800 bg-black p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-white">
        {title}
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {images.map((url, index) => (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950"
          >
            <img
              src={url}
              alt={`${title} ${index + 1}`}
              className="aspect-[3/4] h-full w-full object-contain"
            />
          </a>
        ))}
      </div>
    </section>
  );
}

export default function CardsAlertWorkspace({
  submission,
  onStatusChange,
}: Props) {
  const [productionRecord, setProductionRecord] =
    useState<CardsAlertProductionFields>(buildRecord(submission));
  const [organizedImages, setOrganizedImages] = useState<OrganizedImage[]>(
    buildImages(submission),
  );
  const [contributorNotes, setContributorNotes] = useState(
    clean(submission.Contributor_Notes),
  );

  useEffect(() => {
    setProductionRecord(buildRecord(submission));
    setOrganizedImages(buildImages(submission));
    setContributorNotes(clean(submission.Contributor_Notes));
  }, [submission.Submission_ID]);

  const existing = submission.Existing_Production_Record || {};

  const actionLabel =
    submission.Submission_Action === "removal"
      ? "Request Removal"
      : submission.Submission_Action === "similar"
        ? "Report Similar Card"
        : submission.Submission_Action === "update"
          ? "Update Existing Card"
          : "Add New Card";

  const previousSources = splitLines(submission.Previous_Source_URLs);

  const previousSummary = useMemo(
    () =>
      [
        submission.Previous_Grade && `Grade: ${submission.Previous_Grade}`,
        submission.Previous_Cert_Number &&
          `Cert: ${submission.Previous_Cert_Number}`,
      ]
        .filter(Boolean)
        .join(" • "),
    [submission.Previous_Grade, submission.Previous_Cert_Number],
  );

  function updateImages(images: OrganizedImage[]) {
    setOrganizedImages(images);

    setProductionRecord((current) => ({
      ...current,
      Front_Image: images.find((image) => image.role === "front")?.url || "",
      Back_Image: images.find((image) => image.role === "back")?.url || "",
      Additional_Images: images
        .filter((image) => image.role === "additional")
        .map((image) => image.url)
        .join("\n"),
    }));
  }

  return (
    <section className="min-w-0 space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] 2xl:pb-8">
      <header className="rounded-2xl border border-red-700/60 bg-red-950/20 p-5">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
          Cards Alert • {actionLabel}
        </div>
        <h2 className="mt-2 text-2xl font-black text-white">
          {[
            productionRecord.Year,
            productionRecord.First,
            productionRecord.Last,
            productionRecord.Num ? `#${productionRecord.Num}` : "",
            productionRecord.Brand,
          ]
            .filter(Boolean)
            .join(" ") || submission.Active_Object_Title}
        </h2>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-400">
          <span>Submission: {submission.Submission_ID}</span>
          <span>Contributor: {submission.Contributor_Name || "Anonymous"}</span>
          {submission.Contributor_Email && (
            <span>Contact: {submission.Contributor_Email}</span>
          )}
        </div>
      </header>

      {FIELD_GROUPS.map((group) => (
        <section
          key={group.title}
          className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
        >
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-red-300">
            {group.title}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {group.fields.map(([name, label]) => (
              <div
                key={name}
                className={
                  name === "Brand" ||
                  name === "Description" ||
                  name === "Site_Link"
                    ? "md:col-span-2"
                    : ""
                }
              >
                <Field
                  label={label}
                  value={productionRecord[name]}
                  currentValue={clean(
                    existing[name === "Serial_Number" ? "Card_Serial" : name],
                  )}
                  multiline={name === "Description" || name === "Site_Link"}
                  onChange={(value) =>
                    setProductionRecord((current) => ({
                      ...current,
                      [name]: value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-red-300">
          Current Card Images
        </h3>
        <ImageOrganizer images={organizedImages} onChange={updateImages} />
      </section>

      <section className="rounded-2xl border border-neutral-700 bg-neutral-950 p-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-white">
          Previous Evidence
        </h3>

        {previousSummary && (
          <p className="mt-3 text-sm text-neutral-300">{previousSummary}</p>
        )}

        {previousSources.length > 0 && (
          <div className="mt-3 space-y-1">
            {previousSources.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all text-sm text-[#d4af37] underline"
              >
                {url}
              </a>
            ))}
          </div>
        )}

        {!previousSummary && previousSources.length === 0 && (
          <p className="mt-3 text-sm text-neutral-500">
            No previous grading or source details were submitted.
          </p>
        )}
      </section>

      <EvidenceImages
        title="Previous Card Images"
        front={clean(submission.Previous_Front_Image)}
        back={clean(submission.Previous_Back_Image)}
        other={clean(submission.Previous_Additional_Images)}
      />

      <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-white">
            Contributor Notes
          </span>
          <textarea
            value={contributorNotes}
            onChange={(event) => setContributorNotes(event.target.value)}
            rows={4}
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
      </section>

      <SubmissionActions
        submission={submission}
        productionRecord={productionRecord}
        organizedImages={organizedImages}
        contributorNotes={contributorNotes}
        onStatusChange={onStatusChange}
      />
    </section>
  );
}