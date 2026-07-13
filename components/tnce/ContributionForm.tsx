"use client";

import { useState } from "react";

import ContributorSection from "./ContributorSection";
import ContributionHeader from "./ContributionHeader";
import ImageSection from "./ImageSection";
import ModeBanner from "./ModeBanner";
import ProjectFields from "./ProjectFields";
import SubmitButton from "./SubmitButton";

import { TNCE_MODE_CONFIG, type ContributionMode } from "./modeConfig";

type Project = "rpa-tracker" | "cards-alert" | "tiffany-cards" | "guides";

type ActiveObject = {
  id?: string;
  title?: string;
  [key: string]: any;
};

type Props = {
  mode: ContributionMode;
  project: Project;
  projectLabel: string;
  activeObject: ActiveObject;
  onClose: () => void;
  onSuccess: (submissionId: string) => void;
};

function valueFromActiveObject(activeObject: ActiveObject, keys: string[]) {
  for (const key of keys) {
    if (activeObject[key]) return String(activeObject[key]);
  }

  return "";
}

export default function ContributionForm({
  mode,
  project,
  projectLabel,
  activeObject,
  onClose,
  onSuccess,
}: Props) {
  const modeConfig = TNCE_MODE_CONFIG[mode];

  const [contributorName, setContributorName] = useState("");
  const [contributorEmail, setContributorEmail] = useState("");

  const [cardTitle, setCardTitle] = useState(
    valueFromActiveObject(activeObject, [
      "Card_Title_Display",
      "Card_Title",
      "title",
    ])
  );

  const [serialNumber, setSerialNumber] = useState(
    valueFromActiveObject(activeObject, [
      "Serial_Number",
      "serialNumber",
      "serial",
    ])
  );

  const [grade, setGrade] = useState(
    valueFromActiveObject(activeObject, ["Grade", "grade"])
  );

  const [certNumber, setCertNumber] = useState(
    valueFromActiveObject(activeObject, ["Cert_Number", "certNumber", "cert"])
  );

  const [frontImage, setFrontImage] = useState("");
  const [backImage, setBackImage] = useState("");
  const [otherImages, setOtherImages] = useState("");
  const [auctionSourceUrl, setAuctionSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function submitContribution() {
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/tnce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project,

          // Kept for backward compatibility with the current TNCE payload.
          submissionType: modeConfig.submissionType,

          // This is the actual TNCE workflow mode:
          // new, update, or missing.
          submissionMode: mode,

          sourcePageUrl:
            typeof window !== "undefined" ? window.location.href : "",

          auctionSourceUrl: auctionSourceUrl.trim(),

          contributor: {
            name: contributorName,
            email: contributorEmail,
          },

          activeObject,

          fields: {
            Card_Title: cardTitle,
            Serial_Number: serialNumber,

            Card_id: valueFromActiveObject(activeObject, [
              "Card_id",
              "card_id",
              "id",
            ]),

            Variation_Input: valueFromActiveObject(activeObject, [
              "Variation_Input",
              "Variation",
              "variation",
            ]),

            Grade: grade,
            Cert_Number: certNumber,
            Auction_Source_URL: auctionSourceUrl.trim(),
          },

          imageUrls: {
            front: frontImage,
            back: backImage,
            other: otherImages
              .split(/\r?\n/)
              .map((url) => url.trim())
              .filter(Boolean),
          },

          uploadedImages: [],
          notes,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Submission failed.");
      }

      onSuccess(json.submissionId);
    } catch (error: any) {
      setSubmitError(error?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ContributionHeader
        mode={mode}
        projectLabel={projectLabel}
        onClose={onClose}
      />

      <div className="mt-6 grid gap-4">
        <ModeBanner mode={mode} />

        <ProjectFields
          project={project}
          activeObject={activeObject}
          cardTitle={cardTitle}
          setCardTitle={setCardTitle}
          serialNumber={serialNumber}
          setSerialNumber={setSerialNumber}
          grade={grade}
          setGrade={setGrade}
          certNumber={certNumber}
          setCertNumber={setCertNumber}
        />

        <ImageSection
          frontImage={frontImage}
          setFrontImage={setFrontImage}
          backImage={backImage}
          setBackImage={setBackImage}
          otherImages={otherImages}
          setOtherImages={setOtherImages}
        />

        <label className="grid gap-1 text-sm">
          Auction / Source URL
          <input
            type="url"
            value={auctionSourceUrl}
            onChange={(event) => setAuctionSourceUrl(event.target.value)}
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="https://www.ebay.com/... or https://goldin.co/..."
          />

          <span className="text-xs leading-5 text-neutral-400">
            Paste the auction, marketplace, social-media, or other webpage where
            the card was found. Leave blank when the card was submitted directly
            by its owner or another collector.
          </span>
        </label>

        <label className="grid gap-1 text-sm">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="Tell us what should be added, corrected, or reviewed."
          />
        </label>

        <ContributorSection
          contributorName={contributorName}
          setContributorName={setContributorName}
          contributorEmail={contributorEmail}
          setContributorEmail={setContributorEmail}
        />

        {submitError && (
          <div className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
            {submitError}
          </div>
        )}

        <SubmitButton
          submitting={submitting}
          onClick={submitContribution}
        />
      </div>
    </>
  );
}