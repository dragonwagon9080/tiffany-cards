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
import NewCardsAlertForm from "./forms/NewCardsAlertForm";

type Project =
  | "rpa-tracker"
  | "cards-alert"
  | "tiffany-cards"
  | "guides";

  type ContributionAction =
  | "update"
  | "similar"
  | "removal";

type ActiveObject = {
  id?: string;
  title?: string;
  [key: string]: any;
};

type Props = {
  mode: ContributionMode;
  action: ContributionAction;
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

  certNumber?: string;
  grade?: string;
  serialNumber?: string;
  lotNumber?: string;

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
  action,
  project,
  projectLabel,
  activeObject,
  onClose,
  onSuccess,
}: Props) {

  if (
  project === "cards-alert" &&
  mode === "new" &&
  activeObject?.id === "cards-alert-main-page"
) {
  return (
    <NewCardsAlertForm
      mode={mode}
      action={action}
      project="cards-alert"
      projectLabel={projectLabel}
      activeObject={activeObject}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

  const modeConfig = TNCE_MODE_CONFIG[mode];

  const actionConfig = {
  update: {
    title: "Update Existing Card",
    subtitle: "Correct information or add details for this card.",
    notesPlaceholder:
      "Tell us what should be added or corrected.",
    submitText: "Submit Update",
  },

  similar: {
    title: "Report Similar Card",
    subtitle:
      "Report the same card with a different grade, cert, or serial number.",
    notesPlaceholder:
      "Explain how this card differs from the current listing.",
    submitText: "Report Similar Card",
  },

  removal: {
    title: "Request Removal",
    subtitle:
      "Request a review or removal of this listing and provide supporting information.",
    notesPlaceholder:
      "Tell us why this listing should be reviewed or removed.",
    submitText: "Submit Removal Request",
  },
}[action];

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

/* ============================================
   Cards Alert Fields
============================================ */

const [cardYear, setCardYear] = useState("");
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const [cardNumber, setCardNumber] = useState("");

const [brand, setBrand] = useState("");
const [manufacturer, setManufacturer] = useState("");
const [setName, setSetName] = useState("");
const [subset, setSubset] = useState("");
const [parallel, setParallel] = useState("");
const [sport, setSport] = useState("");

const [status, setStatus] = useState("");
const [suspect, setSuspect] = useState("");
const [description, setDescription] = useState("");
const [cost, setCost] = useState("");

const [previousGrade, setPreviousGrade] =
  useState("");

const [previousCertNumber, setPreviousCertNumber] =
  useState("");

const [previousSourceUrl, setPreviousSourceUrl] =
  useState("");

const [attributionType, setAttributionType] =
  useState<
    "anonymous" | "public-source" | "my-post"
  >("anonymous");

const [publicSourceUrl, setPublicSourceUrl] =
  useState("");

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

setCardYear(
  valueFromActiveObject(activeObject, [
    "Year",
    "year",
  ])
);

setFirstName(
  valueFromActiveObject(activeObject, [
    "First",
    "first",
  ])
);

setLastName(
  valueFromActiveObject(activeObject, [
    "Last",
    "last",
  ])
);

setCardNumber(
  valueFromActiveObject(activeObject, [
    "Num",
    "Number",
    "number",
  ])
);

const originalBrand = valueFromActiveObject(
  activeObject,
  [
    "Brand",
    "brand",
  ]
);

const originalParallel = valueFromActiveObject(
  activeObject,
  [
    "Parallel",
    "parallel",
  ]
);

const cleanedParallel =
  action === "similar"
    ? originalParallel
        .replace(
          /\s+\d+\s*\/\s*(?:\d+|xx)\s*$/i,
          ""
        )
        .trim()
    : originalParallel;

let cleanedBrand = originalBrand;

if (action === "similar") {
  cleanedBrand = cleanedBrand
    .replace(
      /\s+\d+\s*\/\s*(?:\d+|xx)\s*$/i,
      ""
    )
    .trim();

  if (cleanedParallel) {
    const escapedParallel =
      cleanedParallel.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    cleanedBrand = cleanedBrand
      .replace(
        new RegExp(
          `\\s*-\\s*${escapedParallel}\\s*$`,
          "i"
        ),
        ""
      )
      .trim();
  }
}

setBrand(cleanedBrand);

setManufacturer(
  valueFromActiveObject(activeObject, [
    "Manufacturer",
    "manufacturer",
  ])
);

setSetName(
  valueFromActiveObject(activeObject, [
    "Set",
    "set",
  ])
);

setSubset(
  valueFromActiveObject(activeObject, [
    "Subset",
    "subset",
  ])
);

setParallel(cleanedParallel);

setSport(
  valueFromActiveObject(activeObject, [
    "Sport",
    "sport",
  ])
);

setStatus(
  valueFromActiveObject(activeObject, [
    "Status",
    "status",
  ])
);

setSuspect(
  valueFromActiveObject(activeObject, [
    "Suspect",
    "suspect",
  ])
);

setDescription(
  valueFromActiveObject(activeObject, [
    "Description",
    "description",
  ])
);

setCost(
  valueFromActiveObject(activeObject, [
    "Cost",
    "cost",
  ])
);

setPreviousGrade(
  valueFromActiveObject(activeObject, [
    "Grade",
    "grade",
  ])
);

setPreviousCertNumber(
  valueFromActiveObject(activeObject, [
    "Cert_Number",
    "certNumber",
    "cert",
  ])
);

setPreviousSourceUrl(
  valueFromActiveObject(activeObject, [
    "Site_Link",
    "siteLink",
  ])
);

  if (action === "similar") {
    setSerialNumber("");
    setGrade("");
    setCertNumber("");

    setFrontImage("");
    setBackImage("");
    setOtherImages("");
    setUploadedImages([]);
    setOrganizedImages([]);
  } else {
    const existingSerialNumber =
  valueFromActiveObject(activeObject, [
    "Serial_Number",
    "serialNumber",
    "serial",
  ]);

const brandSerialMatch =
  originalBrand.match(
    /(\d+\s*\/\s*(?:\d+|xx))\s*$/i
  );

setSerialNumber(
  existingSerialNumber ||
    brandSerialMatch?.[1] ||
    ""
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

    setFrontImage(
      valueFromActiveObject(activeObject, [
        "front_image",
        "Front_Image",
        "frontImage",
      ])
    );

    setBackImage(
      valueFromActiveObject(activeObject, [
        "back_image",
        "Back_Image",
        "backImage",
      ])
    );

    setOtherImages(
      valueFromActiveObject(activeObject, [
        "additional_images",
        "Other_Images",
        "otherImages",
      ])
    );

    setUploadedImages([]);
    setOrganizedImages([]);
  }

  setAuctionSourceUrl("");
  setImportedListing(null);
  setImportError("");
  setNotes("");
  setSubmitError("");
}, [
  action,

  activeObject?.ID,
  activeObject?.id,

  activeObject?.Year,
  activeObject?.First,
  activeObject?.Last,
  activeObject?.Num,
  activeObject?.Brand,
  activeObject?.Manufacturer,
  activeObject?.Set,
  activeObject?.Subset,
  activeObject?.Parallel,
  activeObject?.Sport,

  activeObject?.Card_id,
  activeObject?.Card_Title,
  activeObject?.Card_Title_Display,
  activeObject?.title,

  activeObject?.Serial_Number,
  activeObject?.serialNumber,
  activeObject?.serial,

  activeObject?.Variation_Input,
  activeObject?.Variation,
  activeObject?.variation,

  activeObject?.Grade,
  activeObject?.grade,

  activeObject?.Cert_Number,
  activeObject?.certNumber,
  activeObject?.cert,

  activeObject?.front_image,
  activeObject?.Front_Image,
  activeObject?.frontImage,

  activeObject?.back_image,
  activeObject?.Back_Image,
  activeObject?.backImage,

  activeObject?.additional_images,
  activeObject?.Other_Images,
  activeObject?.otherImages,
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

if (
  data.certNumber &&
  !certNumber.trim()
) {
  setCertNumber(data.certNumber);
}

if (
  data.serialNumber &&
  !serialNumber.trim()
) {
  setSerialNumber(data.serialNumber);
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
    const cleanedSerialNumber =
      serialNumber.trim();

    const cleanedBrand =
      brand.trim();

    const cleanedParallel =
      parallel.trim();

    const submittedBrand =
      action === "similar"
        ? [
            cleanedBrand,
            cleanedParallel
              ? `- ${cleanedParallel}`
              : "",
            cleanedSerialNumber,
          ]
            .filter(Boolean)
            .join(" ")
            .trim()
        : cleanedBrand;

    const submittedParallel =
  cleanedParallel;

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

        submissionAction: action,

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
          Card_Title:
            cleanCardTitle(cardTitle),

          Serial_Number:
            cleanedSerialNumber,

          Card_id:
            valueFromActiveObject(
              activeObject,
              [
                "Card_id",
                "card_id",
                "id",
              ]
            ),

          Variation_Input:
            variation.trim(),

          Year:
            cardYear.trim(),

          First:
            firstName.trim(),

          Last:
            lastName.trim(),

          Num:
            cardNumber.trim(),

          Brand:
            submittedBrand,

          Manufacturer:
            manufacturer.trim(),

          Set:
            setName.trim(),

          Subset:
            subset.trim(),

          Parallel:
            submittedParallel,

          Sport:
            sport.trim(),

          Grade:
            grade.trim(),

          Cert_Number:
            certNumber.trim(),

          Status:
            status.trim(),

          Suspect:
            suspect.trim(),

          Description:
            description.trim(),

          Cost:
            cost.trim(),

          Previous_Grade:
            previousGrade.trim(),

          Previous_Cert_Number:
            previousCertNumber.trim(),

          Previous_Source_URL:
            previousSourceUrl.trim(),

          Attribution_Type:
            attributionType,

          Public_Source_URL:
            publicSourceUrl.trim(),

          Auction_Source_URL:
            auctionSourceUrl.trim(),
        },

        imageUrls: {
          front:
            frontImage.trim(),

          back:
            backImage.trim(),

          other:
            otherImages
              .split(/\r?\n/)
              .map((url) => url.trim())
              .filter(Boolean),
        },

        uploadedImages:
          uploadedImages.map((image) => ({
            fileName: image.fileName,
            contentType: image.contentType,
            base64: image.base64,
            slot: image.slot,
          })),

        notes: notes.trim(),
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
        json.error ||
          "Submission failed."
      );
    }

    onSuccess(json.submissionId);
  } catch (error: any) {
    setSubmitError(
      error?.message ||
        "Submission failed."
    );
  } finally {
    setSubmitting(false);
  }
}

  return (
    <>
      <ContributionHeader
  mode={mode}
  action={action}
  project={project}
  projectLabel={projectLabel}
  onClose={onClose}
/>

      <div className="mt-6 grid gap-4 pb-32 sm:pb-12">
        <ModeBanner
  mode={mode}
  project={project}
/>

<section className="rounded-xl border border-blue-700/50 bg-blue-950/20 p-4">
  <h3 className="text-base font-bold text-blue-200">
    {actionConfig.title}
  </h3>

  <p className="mt-1 text-sm text-blue-100/80">
    {actionConfig.subtitle}
  </p>
</section>

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
               Loading listing information from{" "}
{marketplace === "unknown"
  ? "the marketplace"
  : marketplace.toUpperCase()}
...
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

  cardsAlertFields={{
    cardYear,
    setCardYear,

    firstName,
    setFirstName,

    lastName,
    setLastName,

    cardNumber,
    setCardNumber,

    brand,
    setBrand,

    manufacturer,
    setManufacturer,

    setName,
    setSetName,

    subset,
    setSubset,

    parallel,
    setParallel,

    sport,
    setSport,

    status,
    setStatus,

    suspect,
    setSuspect,

    description,
    setDescription,

    cost,
    setCost,

    previousGrade,
    setPreviousGrade,

    previousCertNumber,
    setPreviousCertNumber,

    previousSourceUrl,
    setPreviousSourceUrl,

    attributionType,
    setAttributionType,

    publicSourceUrl,
    setPublicSourceUrl,
  }}

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
    placeholder={actionConfig.notesPlaceholder}
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
  label={actionConfig.submitText}
  onClick={submitContribution}
/>
      </div>
    </>
  );
}