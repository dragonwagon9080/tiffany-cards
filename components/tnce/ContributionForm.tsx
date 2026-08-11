"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

import ContributorSection from "./ContributorSection";
import ContributionHeader from "./ContributionHeader";
import ImageSection, { type PendingTNCEUpload } from "./ImageSection";
import ImageOrganizer, {
  type OrganizedImage,
} from "@/components/shared/ImageOrganizer";
import ModeBanner from "./ModeBanner";
import ProjectFields from "./ProjectFields";
import SubmitButton from "./SubmitButton";
import {
  openSubmissionProgress,
} from "./SubmissionProgress";
import { parseAuctionTitle } from "@/lib/tnce/auctionParser";
import { detectMarketplace } from "@/lib/tnce/marketplaceDetector";

import { TNCE_MODE_CONFIG, type ContributionMode } from "./modeConfig";
import NewCardsAlertForm from "./forms/NewCardsAlertForm";

type Project = "rpa-tracker" | "cards-alert" | "tiffany-cards" | "guides";

type ContributionAction = "update" | "similar" | "removal";

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
  sports?: string[];
  reasons?: string[];
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
  description?: string;

  frontImage?: string;
  additionalImages?: string[];

  aspects?: Record<string, string[]>;
  error?: string;
};

function valueFromActiveObject(activeObject: ActiveObject, keys: string[]) {
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
    .replace(/\s+(?:\(\d+\)\s*)?\d+\s*\/\s*(?:\d+|xx)\s*$/i, "")
    .trim();
}

function cardTitleFromActiveObject(
  activeObject: ActiveObject
) {
  const id = String(
    activeObject?.id ||
      activeObject?.Card_id ||
      activeObject?.card_id ||
      ""
  )
    .trim()
    .toLowerCase();

  const title = cleanCardTitle(
    valueFromActiveObject(
      activeObject,
      [
        "Card_Title",
        "Card_Title_Display",
        "title",
      ]
    )
  );

  const normalizedTitle =
    title.toLowerCase();

    const placeholderIds = [
    "rpa-tracker-main-page",
    "rpa-tracker-home",
    "rpa-new-card",
    "new-rpa-card",
    "rpa-tracker-new-card",
  ];

  const placeholderTitles = [
    "rpa tracker main page",
    "rpa tracker home",
    "rpa new card",
    "new rpa card",
    "rpa tracker new card",
    "new card",
  ];

    const isPlaceholderTitle =
    placeholderTitles.includes(
      normalizedTitle
    ) ||
    /^(?:missing rpa card|rpa missing card)(?:\s|$)/i.test(
      normalizedTitle
    );

  if (
    placeholderIds.includes(id) ||
    isPlaceholderTitle
  ) {
    return "";
  }

  return title;
}

function compactActiveObject(
  activeObject: ActiveObject
): ActiveObject {
  const allowedKeys = [
    "Card_id",
    "card_id",
    "id",
    "Card_Title",
    "Card_Title_Display",
    "title",
    "Serial_Number",
    "Variation_Input",
    "Variation",
    "Card_History",
    "Grade",
    "Cert_Number",
    "Front_Image",
    "Back_Image",
    "Other_Images",
    "Missing_From_Registry",
    "ID",
    "Year",
    "First",
    "Last",
    "Num",
    "Brand",
    "Parallel",
    "Card_Serial",
    "Sport",
    "Status",
    "Description",
    "Site_Link",
    "front_image",
    "back_image",
    "additional_images",
  ];

  const compact: ActiveObject = {};

  for (const key of allowedKeys) {
    const value =
      activeObject[key];

    if (
      value !== undefined &&
      value !== null
    ) {
      compact[key] = value;
    }
  }

  /*
   * Main-page and new-card objects are only UI
   * context. Their placeholder titles and IDs must
   * never reach Apps Script, card-ID generation, or
   * permanent image folder naming.
   */
  if (
    !cardTitleFromActiveObject(
      activeObject
    )
  ) {
    delete compact.Card_id;
    delete compact.card_id;
    delete compact.id;

    delete compact.Card_Title;
    delete compact.Card_Title_Display;
    delete compact.title;
  }

  return compact;
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

function todayDateInputValue() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateInputFromValue(
  value: unknown
) {
  const text = String(
    value ?? ""
  ).trim();

  if (!text) {
    return "";
  }

  const directMatch = text.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
  }

  const parsed = new Date(text);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "";
  }

  const year =
    parsed.getUTCFullYear();

  const month = String(
    parsed.getUTCMonth() + 1
  ).padStart(2, "0");

  const day = String(
    parsed.getUTCDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatHistoryDate(
  value: string
) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return value;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

function buildRpaHistoryEntry({
  date,
  grade,
  certNumber,
  sourceUrl,
}: {
  date: string;
  grade: string;
  certNumber: string;
  sourceUrl: string;
}) {
  const cleanGrade =
    grade.trim() || "Raw";

  const cleanCert =
    certNumber.trim();

  const gradeText =
    cleanGrade.toLowerCase() ===
    "raw"
      ? "Raw"
      : [
          cleanGrade,
          cleanCert
            ? `cert# ${cleanCert}`
            : "",
        ]
          .filter(Boolean)
          .join(" ");

  return [
    formatHistoryDate(
      date ||
        todayDateInputValue()
    ),

    gradeText,

    sourceUrl.trim(),
  ]
    .filter(Boolean)
    .join(" • ");
}

function prependRpaHistory(
  entry: string,
  existingHistory: string
) {
  const cleanEntry =
    entry.trim();

  const cleanExisting =
    existingHistory.trim();

  if (!cleanEntry) {
    return cleanExisting;
  }

  if (
    cleanExisting
      .toLowerCase()
      .startsWith(
        cleanEntry.toLowerCase()
      )
  ) {
    return cleanExisting;
  }

  return [
    cleanEntry,
    cleanExisting,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function importImageAsUpload(
  url: string,
  slot: "front" | "back" | "other",
  index: number,
): Promise<PendingTNCEUpload> {
  const response = await fetch("/api/tnce/import-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const result = await response.json();

  if (!response.ok || !result.ok || !result.base64) {
    throw new Error(
      result.error || `Unable to import listing image ${index + 1}.`,
    );
  }

  const dataUrl = String(result.base64);

  const dataUrlMatch = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);

  if (!dataUrlMatch) {
    throw new Error(`Imported image ${index + 1} returned invalid image data.`);
  }

  const contentType = dataUrlMatch[1] || "image/jpeg";

  const base64Data = dataUrlMatch[2];

  const binaryString = window.atob(base64Data);

  const bytes = new Uint8Array(binaryString.length);

  for (let byteIndex = 0; byteIndex < binaryString.length; byteIndex++) {
    bytes[byteIndex] = binaryString.charCodeAt(byteIndex);
  }

  const extension =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : "jpg";

  const fileName = `${slot}-listing-image-${index + 1}.${extension}`;

  const file = new File([bytes], fileName, {
    type: contentType,
  });

  const id = `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    slot,
    fileName,
    contentType,
    file,
    previewUrl: URL.createObjectURL(file),
    uploaded: false,
  };
}

export default function ContributionForm({
  mode,
  action,
  project,
  projectLabel,
  activeObject,
  sports = [],
  reasons = [],
  onClose,
  onSuccess,
}: Props) {
  if (
    project === "cards-alert" &&
    ((mode === "new" && activeObject?.id === "cards-alert-main-page") ||
      action === "similar")
  ) {
    return (
      <NewCardsAlertForm
        mode={mode}
        action={action}
        project="cards-alert"
        projectLabel={projectLabel}
        activeObject={activeObject}
        sports={sports}
        reasons={reasons}
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
      notesPlaceholder: "Tell us what should be added or corrected.",
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

  const [contributorName, setContributorName] = useState("");

  const [contributorEmail, setContributorEmail] = useState("");

  const [
    cardTitle,
    setCardTitle,
  ] = useState(() =>
    cardTitleFromActiveObject(
      activeObject
    )
  );

  const [serialNumber, setSerialNumber] = useState(
    valueFromActiveObject(activeObject, [
      "Serial_Number",
      "serialNumber",
      "serial",
    ]),
  );
  const [variation, setVariation] = useState(
    valueFromActiveObject(activeObject, [
      "Variation_Input",
      "Variation",
      "variation",
    ]),
  );

  const [grade, setGrade] = useState(
    valueFromActiveObject(activeObject, ["Grade", "grade"]),
  );

  const [certNumber, setCertNumber] = useState(
    valueFromActiveObject(activeObject, ["Cert_Number", "certNumber", "cert"]),
  );

  /* ============================================
   Cards Alert Fields
============================================ */

  const [cardYear, setCardYear] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  const [brand, setBrand] = useState("");
  const [parallel, setParallel] = useState("");
  const [sport, setSport] = useState("");

  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");

  const [previousGrade, setPreviousGrade] = useState("");

  const [previousCertNumber, setPreviousCertNumber] = useState("");

  const [previousSourceUrl, setPreviousSourceUrl] = useState("");

  const [frontImage, setFrontImage] = useState("");

  const [backImage, setBackImage] = useState("");

  const [otherImages, setOtherImages] = useState("");

  const [uploadedImages, setUploadedImages] = useState<PendingTNCEUpload[]>([]);

  const [organizedImages, setOrganizedImages] = useState<OrganizedImage[]>([]);

  const [auctionSourceUrl, setAuctionSourceUrl] = useState("");

const [
  pageText,
  setPageText,
] = useState("");

const [
  pageHtml,
  setPageHtml,
] = useState("");

const [
  saleEventDate,
  setSaleEventDate,
] = useState(() =>
  project === "rpa-tracker"
    ? todayDateInputValue()
    : ""
);

const [
  saleEventDateTouched,
  setSaleEventDateTouched,
] = useState(false);

  const marketplace = detectMarketplace(auctionSourceUrl);

  const [importing, setImporting] = useState(false);

  const [importError, setImportError] = useState("");

const [
  showPageTextFallback,
  setShowPageTextFallback,
] = useState(false);

  const [importedListing, setImportedListing] =
    useState<AuctionImportResult | null>(null);

  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState("");

  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
        setCardTitle(
      cardTitleFromActiveObject(
        activeObject
      )
    );

    setVariation(
      valueFromActiveObject(activeObject, [
        "Variation_Input",
        "Variation",
        "variation",
      ]),
    );

    setCardYear(valueFromActiveObject(activeObject, ["Year", "year"]));

    setFirstName(valueFromActiveObject(activeObject, ["First", "first"]));

    setLastName(valueFromActiveObject(activeObject, ["Last", "last"]));

    setCardNumber(
      valueFromActiveObject(activeObject, ["Num", "Number", "number"]),
    );

    const originalBrand = valueFromActiveObject(activeObject, [
      "Brand",
      "brand",
    ]);

    const originalParallel = valueFromActiveObject(activeObject, [
      "Parallel",
      "parallel",
    ]);

    const cleanedParallel =
      action === "similar"
        ? originalParallel.replace(/\s+\d+\s*\/\s*(?:\d+|xx)\s*$/i, "").trim()
        : originalParallel;

    let cleanedBrand = originalBrand;

    if (action === "similar") {
      cleanedBrand = cleanedBrand
        .replace(/\s+\d+\s*\/\s*(?:\d+|xx)\s*$/i, "")
        .trim();

      if (cleanedParallel) {
        const escapedParallel = cleanedParallel.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

        cleanedBrand = cleanedBrand
          .replace(new RegExp(`\\s*-\\s*${escapedParallel}\\s*$`, "i"), "")
          .trim();
      }
    }

    setBrand(cleanedBrand);

    setParallel(cleanedParallel);

    setSport(valueFromActiveObject(activeObject, ["Sport", "sport"]));

    setStatus(valueFromActiveObject(activeObject, ["Status", "status"]));

    setDescription(
      valueFromActiveObject(activeObject, ["Description", "description"]),
    );

    setPreviousGrade(valueFromActiveObject(activeObject, ["Grade", "grade"]));

    setPreviousCertNumber(
      valueFromActiveObject(activeObject, [
        "Cert_Number",
        "certNumber",
        "cert",
      ]),
    );

    setPreviousSourceUrl(
      valueFromActiveObject(activeObject, ["Site_Link", "siteLink"]),
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
      const existingSerialNumber = valueFromActiveObject(activeObject, [
        "Serial_Number",
        "serialNumber",
        "serial",
      ]);

      const brandSerialMatch = originalBrand.match(
        /(\d+\s*\/\s*(?:\d+|xx))\s*$/i,
      );

      setSerialNumber(existingSerialNumber || brandSerialMatch?.[1] || "");

      setGrade(valueFromActiveObject(activeObject, ["Grade", "grade"]));

      setCertNumber(
        valueFromActiveObject(activeObject, [
          "Cert_Number",
          "certNumber",
          "cert",
        ]),
      );

      setFrontImage(
        valueFromActiveObject(activeObject, [
          "front_image",
          "Front_Image",
          "frontImage",
        ]),
      );

      setBackImage(
        valueFromActiveObject(activeObject, [
          "back_image",
          "Back_Image",
          "backImage",
        ]),
      );

      setOtherImages(
        valueFromActiveObject(activeObject, [
          "additional_images",
          "Other_Images",
          "otherImages",
        ]),
      );

      setUploadedImages([]);
      setOrganizedImages([]);
    }

    setAuctionSourceUrl("");
setPageText("");
setPageHtml("");

setSaleEventDate(
  project === "rpa-tracker"
    ? todayDateInputValue()
    : ""
);

setSaleEventDateTouched(false);

    setImportedListing(null);
    setImportError("");
    setShowPageTextFallback(false);
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

  const copiedPageText =
    pageText.trim();

  if (
    !sourceUrl &&
    !copiedPageText
  ) {
    setImportError(
      "Paste an auction URL or copied webpage text first."
    );

    return;
  }

  if (importing) return;

  setImporting(true);
  setImportError("");
  setImportedListing(null);

  try {
    const response =
      await fetch(
        "/api/tnce/import-auction",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            url: sourceUrl,

            pageText:
              copiedPageText,

            pageHtml:
              pageHtml,
          }),
        }
      );

    const responseText =
      await response.text();

    let data:
      AuctionImportResult;

    try {
      data =
        JSON.parse(
          responseText
        );
    } catch {
      throw new Error(
        `Import returned invalid JSON. First response text: ${responseText.slice(
          0,
          300
        )}`
      );
    }

    if (
      !response.ok ||
      !data.ok
    ) {
      throw new Error(
        data.error ||
          "Unable to import this source."
      );
    }

    const parsedTitle =
      parseAuctionTitle(
        data.title
      );

    const importedFront =
      String(
        data.frontImage || ""
      ).trim();

    const importedAdditional =
      Array.isArray(
        data.additionalImages
      )
        ? data.additionalImages
            .map((url) =>
              String(
                url || ""
              ).trim()
            )
            .filter(Boolean)
        : [];

    const importedBack =
      importedAdditional[0] ||
      "";

    const remainingImportedImages =
      importedAdditional.slice(1);

    const importedUploads:
      PendingTNCEUpload[] = [];

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
      i <
      remainingImportedImages.length;
      i++
    ) {
      importedUploads.push(
        await importImageAsUpload(
          remainingImportedImages[
            i
          ],
          "other",
          i + 2
        )
      );
    }

    /*
     * Page-text imports may not contain a source URL.
     * Preserve a URL already entered by the user.
     */
    const resolvedSourceUrl =
      String(
        data.sourceUrl ||
          sourceUrl ||
          auctionSourceUrl
      ).trim();

    if (resolvedSourceUrl) {
      setAuctionSourceUrl(
        resolvedSourceUrl
      );
    }

    const importedSaleDate =
      dateInputFromValue(
        data.endDate
      );

    if (
      importedSaleDate &&
      !saleEventDateTouched
    ) {
      setSaleEventDate(
        importedSaleDate
      );
    }

    if (
  mode === "new" &&
  !cardTitle.trim()
) {
  setCardTitle(
    cleanCardTitle(
      String(
        data.title || ""
      )
    )
  );
}

    const importedSerial =
      String(
        parsedTitle.serialNumber ||
          data.serialNumber ||
          ""
      ).trim();

    /*
     * The value already entered in the form always wins.
     */
    if (
  mode === "new" &&
  importedSerial &&
  !serialNumber.trim()
) {
  setSerialNumber(
    importedSerial
  );
}

    const importedGrade =
      String(
        data.grade ||
          parsedTitle.grade ||
          ""
      ).trim();

    if (
      importedGrade &&
      !grade.trim()
    ) {
      setGrade(
        importedGrade
      );
    }

    if (
      data.certNumber &&
      !certNumber.trim()
    ) {
      setCertNumber(
        data.certNumber
      );
    }

    if (
      (
        project === "cards-alert" ||
        project === "rpa-tracker"
      ) &&
      data.description &&
      !notes.trim()
    ) {
      setNotes(
        data.description
      );
    }

    setFrontImage("");
    setBackImage("");
    setOtherImages("");
    setUploadedImages(
      importedUploads
    );

    setImportedListing(
      data
    );

setPageHtml("");
setShowPageTextFallback(false);

  } catch (error: any) {
  const message =
    error?.message ||
    "Unable to import this source.";

  const blockedSource =
    !copiedPageText &&
    Boolean(sourceUrl);

  setShowPageTextFallback(
    blockedSource
  );

  setImportError(
    blockedSource
      ? "The direct import failed. Copy the webpage text and paste it below."
      : message
  );
} finally {
  
    setImporting(false);
  }
}

  async function uploadPendingImages(
    submissionId: string,
  ): Promise<PendingTNCEUpload[]> {
    const pending = uploadedImages.filter(
      (image) => image.file && !image.uploaded,
    );

    if (pending.length === 0) {
      return uploadedImages;
    }

    const response = await fetch("/api/tnce/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project,
        submissionId,
        files: pending.map((image) => ({
          slot: image.slot,
          fileName: image.fileName,
          contentType: image.contentType,
        })),
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Unable to prepare image uploads.");
    }

    const uploads = [...uploadedImages];

    for (let index = 0; index < result.files.length; index++) {
      const signed = result.files[index];
      const pendingImage = pending[index];

      if (!pendingImage?.file) {
        throw new Error("Unable to match image upload.");
      }

      const uploadResponse = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": pendingImage.contentType,
        },
        body: pendingImage.file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed uploading ${pendingImage.fileName}.`);
      }

      const image = uploads.find((item) => item.id === pendingImage.id);

      if (!image) {
        throw new Error("Unable to save uploaded image.");
      }

      image.uploaded = true;
      image.fileName = signed.fileName;
      image.objectPath = signed.objectPath;
      image.publicUrl = signed.publicUrl;
    }

    setUploadedImages([...uploads]);

    return uploads;
  }

  async function submitContribution() {
    if (submitting) return;

    const progress =
      openSubmissionProgress(
        projectLabel,
        "Preparing images..."
      );

    flushSync(() => {
      setSubmitting(true);
      setSubmissionStage(
        "Preparing images..."
      );
      setSubmitError("");
    });

    await new Promise<void>(
      (resolve) => {
        requestAnimationFrame(() =>
          resolve()
        );
      }
    );

    try {
      const cleanedSerialNumber = serialNumber.trim();

      const cleanedBrand = brand.trim();

      const cleanedParallel = parallel.trim();

      const submittedBrand =
        action === "similar"
          ? [
              cleanedBrand,
              cleanedParallel ? `- ${cleanedParallel}` : "",
              cleanedSerialNumber,
            ]
              .filter(Boolean)
              .join(" ")
              .trim()
          : cleanedBrand;

      const submittedParallel =
  cleanedParallel;

const existingCardHistory =
  valueFromActiveObject(
    activeObject,
    [
      "Card_History",
      "cardHistory",
    ]
  );

const shouldAddRpaHistory =
  project === "rpa-tracker" &&
  (
    mode === "new" ||
    mode === "missing" ||
    Boolean(
      auctionSourceUrl.trim()
    ) ||
    saleEventDateTouched
  );

const newRpaHistoryEntry =
  shouldAddRpaHistory
    ? buildRpaHistoryEntry({
        date:
          saleEventDate ||
          todayDateInputValue(),

        grade,

        certNumber,

        sourceUrl:
          auctionSourceUrl,
      })
    : "";

const submittedCardHistory =
  shouldAddRpaHistory
    ? prependRpaHistory(
        newRpaHistoryEntry,
        existingCardHistory
      )
    : existingCardHistory;

const submissionId =
  crypto.randomUUID();

      setSubmissionStage("Uploading and saving images...");
      progress.update(
        "Uploading and saving images..."
      );
      console.log("Starting uploadPendingImages");
      const uploadedFiles = await uploadPendingImages(submissionId);
      console.log(uploadedFiles);

      setSubmissionStage("Saving and processing submission...");
      progress.update(
        "Saving and processing submission..."
      );
      const res = await fetch("/api/tnce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          project,

          submissionType: modeConfig.submissionType,

          submissionMode: mode,

          submissionAction: action,

          sourcePageUrl:
            typeof window !== "undefined" ? window.location.href : "",

          auctionSourceUrl: auctionSourceUrl.trim(),

          contributor: {
            name: contributorName.trim(),
            email: contributorEmail.trim(),
          },

          activeObject: compactActiveObject(activeObject),

          fields: {
            Card_Title: cleanCardTitle(cardTitle),

            Serial_Number: cleanedSerialNumber,

            Card_id:
  cardTitleFromActiveObject(
    activeObject
  )
    ? valueFromActiveObject(
        activeObject,
        [
          "Card_id",
          "card_id",
          "id",
        ]
      )
    : "",

            Variation_Input: variation.trim(),

            Card_History:
  submittedCardHistory,

Sale_Event_Date:
  project === "cards-alert"
    ? saleEventDate || ""
    : shouldAddRpaHistory
      ? saleEventDate ||
        todayDateInputValue()
      : "",

            Year: cardYear.trim(),

            First: firstName.trim(),

            Last: lastName.trim(),

            Num: cardNumber.trim(),

            Brand: submittedBrand,

            Parallel: submittedParallel,

            Sport: sport.trim(),

            Grade: grade.trim(),

            Cert_Number: certNumber.trim(),

            Status: status.trim(),

            Description: description.trim(),

            Previous_Grade: previousGrade.trim(),

            Previous_Cert_Number: previousCertNumber.trim(),

            Previous_Source_URL: previousSourceUrl.trim(),

            Auction_Source_URL: auctionSourceUrl.trim(),
          },

          imageUrls: {
            front: frontImage.trim(),

            back: backImage.trim(),

            other: otherImages
              .split(/\r?\n/)
              .map((url) => url.trim())
              .filter(Boolean),
          },

          submissionId,

          uploadedImages: uploadedFiles
            .filter(
              (image) =>
                image.uploaded &&
                typeof image.publicUrl === "string" &&
                image.publicUrl.trim(),
            )
            .map((image) => ({
              slot: image.slot,
              fileName: image.fileName,
              contentType: image.contentType,
              objectPath: image.objectPath,
              publicUrl: image.publicUrl!.trim(),
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
            300,
          )}`,
        );
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Submission failed.");
      }

      onSuccess(json.submissionId);
    } catch (error: any) {
      setSubmitError(error?.message || "Submission failed.");
    } finally {
      progress.close();
      setSubmissionStage("");
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
        <ModeBanner mode={mode} project={project} />

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

         <div className="mt-3 grid gap-3">
  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
    <input
      type="url"
      value={auctionSourceUrl}
      onChange={(event) => {
  setAuctionSourceUrl(
    event.target.value
  );

  setPageText("");
  setPageHtml("");
  setShowPageTextFallback(false);
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
      onClick={
        importAuctionListing
      }
      disabled={
        importing ||
        (
          !auctionSourceUrl.trim() &&
          !pageText.trim()
        )
      }
      className="h-11 rounded-lg border border-[#d4af37] bg-[#9c7a2d] px-5 text-sm font-extrabold uppercase tracking-wide text-black transition hover:bg-[#b99236] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {importing
        ? "Importing..."
        : pageText.trim()
          ? "⚡ Import Page Text"
          : "⚡ Import URL"}
    </button>
  </div>

{showPageTextFallback && (
  <>
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-neutral-800" />

      <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
        Direct Import Blocked
      </span>

      <div className="h-px flex-1 bg-neutral-800" />
    </div>

    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-[#f1d36b]">
        Paste Copied Page Text
      </span>

      <textarea
        value={pageText}
        onChange={(event) => {
          setPageText(
            event.target.value
          );

          setImportError("");
          setImportedListing(null);
        }}
        onPaste={(event) => {
          const clipboardHtml =
            event.clipboardData.getData(
              "text/html"
            );

          setPageHtml(
            clipboardHtml || ""
          );

          setImportError("");
          setImportedListing(null);
        }}
        className="min-h-40 rounded-lg border border-neutral-700 bg-black px-3 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#d4af37]"
        placeholder="Open the webpage, press Ctrl+A, then Ctrl+C, and paste the copied page text here."
      />

      <span className="text-xs leading-5 text-neutral-500">
        The original source URL above will be preserved when this card is published.
      </span>
    </label>
  </>
)}

</div>

{(project === "rpa-tracker" || project === "cards-alert") && (
  <label className="mt-4 grid gap-1.5">
    <span className="text-xs font-black uppercase tracking-wide text-[#f1d36b]">
      Sale / Event Date
    </span>

    <input
      type="date"
      value={saleEventDate}
      onChange={(event) => {
        setSaleEventDate(
          event.target.value
        );

        setSaleEventDateTouched(
          true
        );
      }}
      className="h-11 rounded-lg border border-neutral-700 bg-black px-3 text-sm text-white outline-none transition focus:border-[#d4af37]"
    />

    <span className="text-xs text-neutral-500">
      Imported from the auction when available. You can correct it before submitting.
    </span>
  </label>
)}

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
                {importedListing.title || "eBay listing"}
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
                {importedListing.listingId && (
                  <span>Item: {importedListing.listingId}</span>
                )}

                {importedListing.seller && (
                  <span>Seller: {importedListing.seller}</span>
                )}

                {importedListing.price && (
                  <span>
                    Price: {importedListing.currency === "USD" ? "$" : ""}
                    {importedListing.price}
                  </span>
                )}
              </div>

              {(() => {
                const parsed = parseAuctionTitle(importedListing.title);

                if (!parsed.serialNumber && !parsed.grade) {
                  return null;
                }

                return (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {parsed.serialNumber && (
                      <span className="rounded-full border border-blue-700/60 bg-blue-950/40 px-2.5 py-1 text-xs font-bold text-blue-200">
                        Serial detected: {parsed.serialNumber}
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
                Review all imported information before submitting.
              </p>
            </div>
          )}
        </section>

        <ProjectFields
          project={project}
          activeObject={activeObject}
          sports={sports}
          reasons={reasons}
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

            parallel,
            setParallel,

            sport,
            setSport,

            status,
            setStatus,

            description,
            setDescription,

            previousGrade,
            setPreviousGrade,

            previousCertNumber,
            setPreviousCertNumber,

            previousSourceUrl,
            setPreviousSourceUrl,
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
          {project === "rpa-tracker"
            ? "Description / Opinion"
            : "Notes"}
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
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