"use client";

import { useEffect, useState } from "react";

import ContributorSection from "./ContributorSection";
import ContributionHeader from "./ContributionHeader";
import ImageSection, {
  type PendingTNCEUpload,
} from "./ImageSection";
import ImageOrganizer, {
  type OrganizedImage,
} from "@/components/shared/ImageOrganizer";
import ModeBanner from "./ModeBanner";
import ProjectFields from "./ProjectFields";
import SubmitButton from "./SubmitButton";
import { parseAuctionTitle } from "@/lib/tnce/auctionParser";
import {
  detectMarketplace,
} from "@/lib/tnce/marketplaceDetector";

import {
  TNCE_MODE_CONFIG,
  type ContributionMode,
} from "./modeConfig";

type Project =
  | "rpa-tracker"
  | "cards-alert"
  | "tiffany-cards"
  | "guides";

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

type AuctionImportResult = {
  ok: boolean;
  marketplace?: string;
  sourceUrl?: string;
  listingId?: string;
  title?: string;
  seller?: string;
  price?: string;
  currency?: string;
  endDate?: string;
  frontImage?: string;
  additionalImages?: string[];
  aspects?: Record<string, string[]>;
  error?: string;
};

function valueFromActiveObject(
  activeObject: ActiveObject,
  keys: string[]
) {
  for (const key of keys) {
    if (activeObject[key]) {
      return String(activeObject[key]);
    }
  }

  return "";
}

function cleanCardTitle(value: unknown) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  return text
    .replace(
      /\s+(?:\(\d+\)\s*)?\d+\s*\/\s*(?:\d+|xx)\s*$/i,
      ""
    )
    .trim();
}

function cardTitleFromActiveObject(
  activeObject: ActiveObject
) {
  return cleanCardTitle(
    valueFromActiveObject(activeObject, [
      "Card_Title",
      "Card_Title_Display",
      "title",
    ])
  );
}

function uniqueLines(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

async function importImageAsUpload(
  url: string,
  slot: "front" | "back" | "other",
  index: number
): Promise<PendingTNCEUpload> {
  const response = await fetch(
    "/api/tnce/import-image",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    }
  );

  const result = await response.json();

  if (
    !response.ok ||
    !result.ok ||
    !result.base64
  ) {
    throw new Error(
      result.error ||
        `Unable to import listing image ${
          index + 1
        }.`
    );
  }

  const id = `${Date.now()}-${index}-${Math.random()
    .toString(36)
    .slice(2)}`;

  return {
    id,
    slot,
    fileName: `${slot}-listing-image-${
      index + 1
    }.jpg`,
    contentType: "image/jpeg",
    base64: result.base64,
    previewUrl: result.base64,
  };
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

  const [contributorName, setContributorName] =
    useState("");

  const [contributorEmail, setContributorEmail] =
    useState("");

 const [cardTitle, setCardTitle] = useState(
  cleanCardTitle(
    valueFromActiveObject(activeObject, [
      "Card_Title",
      "Card_Title_Display",
      "title",
    ])
  )
);

  const [serialNumber, setSerialNumber] =
    useState(
      valueFromActiveObject(activeObject, [
        "Serial_Number",
        "serialNumber",
        "serial",
      ])
    );
const [variation, setVariation] = useState(
  valueFromActiveObject(activeObject, [
    "Variation_Input",
    "Variation",
    "variation",
  ])
);

  const [grade, setGrade] = useState(
    valueFromActiveObject(activeObject, [
      "Grade",
      "grade",
    ])
  );

  const [certNumber, setCertNumber] = useState(
    valueFromActiveObject(activeObject, [
      "Cert_Number",
      "certNumber",
      "cert",
    ])
  );

  const [frontImage, setFrontImage] =
    useState("");

  const [backImage, setBackImage] =
    useState("");

  const [otherImages, setOtherImages] =
    useState("");

  const [uploadedImages, setUploadedImages] =
    useState<PendingTNCEUpload[]>([]);

const [
  organizedImages,
  setOrganizedImages,
] = useState<OrganizedImage[]>([]);

  const [
    auctionSourceUrl,
    setAuctionSourceUrl,
  ] = useState("");

  const marketplace = detectMarketplace(
  auctionSourceUrl
);

  const [importing, setImporting] =
    useState(false);

  const [importError, setImportError] =
    useState("");

  const [
    importedListing,
    setImportedListing,
  ] = useState<AuctionImportResult | null>(
    null
  );

  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState("");

useEffect(() => {
  setCardTitle(
  cleanCardTitle(
    valueFromActiveObject(activeObject, [
      "Card_Title",
      "Card_Title_Display",
      "title",
    ])
  )
);
setVariation(
  valueFromActiveObject(activeObject, [
    "Variation_Input",
    "Variation",
    "variation",
  ])
);

  setSerialNumber(
    valueFromActiveObject(activeObject, [
      "Serial_Number",
      "serialNumber",
      "serial",
    ])
  );

  setGrade(
    valueFromActiveObject(activeObject, [
      "Grade",
      "grade",
    ])
  );

  setCertNumber(
    valueFromActiveObject(activeObject, [
      "Cert_Number",
      "certNumber",
      "cert",
    ])
  );

  setFrontImage("");
  setBackImage("");
  setOtherImages("");
  setUploadedImages([]);
  setOrganizedImages([]);
  setAuctionSourceUrl("");
  setImportedListing(null);
  setImportError("");
  setNotes("");
  setSubmitError("");
}, [
  activeObject?.Card_id,
  activeObject?.Card_Title,
  activeObject?.Card_Title_Display,
  activeObject?.Serial_Number,
  activeObject?.Variation_Input,
  activeObject?.Variation,
]);

  async function importAuctionListing() {
    const sourceUrl =
      auctionSourceUrl.trim();

    if (!sourceUrl) {
      setImportError(
        "Paste an auction or marketplace URL first."
      );

      return;
    }

    if (importing) return;

    setImporting(true);
    setImportError("");
    setImportedListing(null);

    try {
      const response = await fetch(
        "/api/tnce/import-auction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: sourceUrl,
          }),
        }
      );

      const text = await response.text();

      let data: AuctionImportResult;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Auction import returned invalid JSON. First response text: ${text.slice(
            0,
            300
          )}`
        );
      }

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "Unable to import this listing."
        );
      }
const parsedTitle = parseAuctionTitle(
  data.title
);

      const importedFront =
  String(data.frontImage || "").trim();

const importedAdditional =
  Array.isArray(data.additionalImages)
    ? data.additionalImages
        .map((url) => String(url || "").trim())
        .filter(Boolean)
    : [];

const importedBack =
  importedAdditional[0] || "";

const remainingImportedImages =
  importedAdditional.slice(1);

const importedUploads: PendingTNCEUpload[] = [];

if (importedFront) {
  importedUploads.push(
    await importImageAsUpload(
      importedFront,
      "front",
      0
    )
  );
}

if (importedBack) {
  importedUploads.push(
    await importImageAsUpload(
      importedBack,
      "back",
      1
    )
  );
}

for (
  let i = 0;
  i < remainingImportedImages.length;
  i++
) {
  importedUploads.push(
    await importImageAsUpload(
      remainingImportedImages[i],
      "other",
      i + 2
    )
  );
}

      setAuctionSourceUrl(
        String(data.sourceUrl || sourceUrl)
      );

      /*
       * New-card submissions can use the auction title.
       * Existing and missing registry submissions keep the
       * canonical registry card title already supplied by RPA.
       */
      if (
        mode === "new" ||
        !cardTitle.trim()
      ) {
        setCardTitle(
  cleanCardTitle(
    String(data.title || cardTitle)
  )
);
      }

      /*
 * Keep Registry Map values when they already exist.
 * Only fill blank serial and grade fields from the
 * imported listing title.
 */
if (
  parsedTitle.serialNumber &&
  (
    mode === "new" ||
    mode === "missing" ||
    !serialNumber.trim()
  )
) {
  setSerialNumber(
    parsedTitle.serialNumber
  );
}

if (
  parsedTitle.grade &&
  !grade.trim()
) {
  setGrade(parsedTitle.grade);
}

      setFrontImage("");
setBackImage("");
setOtherImages("");
setUploadedImages(importedUploads);

      setImportedListing(data);
    } catch (error: any) {
      setImportError(
        error?.message ||
          "Unable to import this listing."
      );
    } finally {
      setImporting(false);
    }
  }

  async function submitContribution() {
    if (submitting) return;

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

          submissionType:
            modeConfig.submissionType,

          submissionMode: mode,

          sourcePageUrl:
            typeof window !== "undefined"
              ? window.location.href
              : "",

          auctionSourceUrl:
            auctionSourceUrl.trim(),

          contributor: {
            name: contributorName.trim(),
            email: contributorEmail.trim(),
          },

          activeObject,

          fields: {
  Card_Title: cleanCardTitle(cardTitle),
  Serial_Number: serialNumber.trim(),

            Card_id: valueFromActiveObject(
              activeObject,
              [
                "Card_id",
                "card_id",
                "id",
              ]
            ),

            Variation_Input: variation.trim(),

            Grade: grade,
            Cert_Number: certNumber,

            Auction_Source_URL:
              auctionSourceUrl.trim(),
          },

          imageUrls: {
            front: frontImage.trim(),
            back: backImage.trim(),

            other: otherImages
              .split(/\r?\n/)
              .map((url) => url.trim())
              .filter(Boolean),
          },

          uploadedImages: uploadedImages.map(
            (image) => ({
              fileName: image.fileName,
              contentType: image.contentType,
              base64: image.base64,
              slot: image.slot,
            })
          ),

          notes,
        }),
      });

      const text = await res.text();

      let json: any;

      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(
          `Submission returned invalid JSON. First response text: ${text.slice(
            0,
            300
          )}`
        );
      }

      if (!res.ok || !json.ok) {
        throw new Error(
          json.error || "Submission failed."
        );
      }

      onSuccess(json.submissionId);
    } catch (error: any) {
      setSubmitError(
        error?.message || "Submission failed."
      );
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

      <div className="mt-6 grid gap-4 pb-32 sm:pb-12">
        <ModeBanner mode={mode} />

        <section className="rounded-xl border border-[#9c7a2d] bg-[#181300] p-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#f1d36b]">
  Import Auction / Source URL
</h3>

          <p className="mt-1 text-xs leading-5 text-neutral-400">
  Paste an auction or marketplace URL to import available card
  information and images automatically.
</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="url"
              value={auctionSourceUrl}
              onChange={(event) => {
                setAuctionSourceUrl(
                  event.target.value
                );

                setImportError("");
                setImportedListing(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  importAuctionListing();
                }
              }}
              className="h-11 min-w-0 rounded-lg border border-neutral-700 bg-black px-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#d4af37]"
              placeholder="https://www.ebay.com/... or https://goldin.co/..."
            />

            <button
              type="button"
              onClick={importAuctionListing}
              disabled={
                importing ||
                !auctionSourceUrl.trim()
              }
              className="h-11 rounded-lg border border-[#d4af37] bg-[#9c7a2d] px-5 text-sm font-extrabold uppercase tracking-wide text-black transition hover:bg-[#b99236] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing
  ? "Importing..."
  : "⚡ Import URL"}
            </button>
          </div>

<div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
  ...
</div>

{auctionSourceUrl.trim() && (
  <div className="mt-2">
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
        marketplace === "ebay"
          ? "bg-blue-900 text-blue-200"
          : marketplace === "goldin"
          ? "bg-yellow-900 text-yellow-200"
          : marketplace === "heritage"
          ? "bg-purple-900 text-purple-200"
          : marketplace === "fanatics"
          ? "bg-red-900 text-red-200"
          : marketplace === "pwcc"
          ? "bg-indigo-900 text-indigo-200"
          : "bg-neutral-800 text-neutral-300"
      }`}
    >
      {marketplace === "unknown"
        ? "❓ Source URL Entered"
        : `✔ ${marketplace.toUpperCase()} Detected`}
    </span>
  </div>
)}

{importing && (
  <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#d4af37]/40 bg-black p-3">
    ...
  </div>
)}

          {importing && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#d4af37]/40 bg-black p-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-[#d4af37]" />

              <div className="text-sm text-neutral-300">
                Loading listing information from
                eBay...
              </div>
            </div>
          )}

          {importError && (
            <div className="mt-3 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
              {importError}
            </div>
          )}

          {importedListing?.ok && (
            <div className="mt-3 rounded-xl border border-green-700/60 bg-green-950/20 p-3">
              <div className="text-xs font-black uppercase tracking-wide text-green-300">
                Listing Imported
              </div>

              <div className="mt-2 text-sm font-bold text-white">
                {importedListing.title ||
                  "eBay listing"}
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
                {importedListing.listingId && (
                  <span>
                    Item:{" "}
                    {importedListing.listingId}
                  </span>
                )}

                {importedListing.seller && (
                  <span>
                    Seller:{" "}
                    {importedListing.seller}
                  </span>
                )}

                {importedListing.price && (
                  <span>
                    Price:{" "}
                    {importedListing.currency ===
                    "USD"
                      ? "$"
                      : ""}
                    {importedListing.price}
                  </span>
                )}
              </div>
              
              {(() => {
  const parsed = parseAuctionTitle(
    importedListing.title
  );

  if (
    !parsed.serialNumber &&
    !parsed.grade
  ) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {parsed.serialNumber && (
        <span className="rounded-full border border-blue-700/60 bg-blue-950/40 px-2.5 py-1 text-xs font-bold text-blue-200">
          Serial detected:{" "}
          {parsed.serialNumber}
        </span>
      )}

      {parsed.grade && (
        <span className="rounded-full border border-blue-700/60 bg-blue-950/40 px-2.5 py-1 text-xs font-bold text-blue-200">
          Grade detected: {parsed.grade}
        </span>
      )}
    </div>
  );
})()}

<p className="mt-3 text-xs text-neutral-400">
  Review all imported information before
  submitting.
</p>
            </div>
          )}
        </section>

        <ProjectFields
  project={project}
  activeObject={activeObject}
  cardTitle={cardTitle}
  setCardTitle={setCardTitle}
  serialNumber={serialNumber}
  setSerialNumber={setSerialNumber}
  variation={variation}
  setVariation={setVariation}
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
          uploadedImages={uploadedImages}
          setUploadedImages={setUploadedImages}
        />

        
<label className="grid gap-1 text-sm">
  Notes

  <textarea
    value={notes}
    onChange={(event) =>
      setNotes(event.target.value)
    }
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