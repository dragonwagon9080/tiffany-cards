"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

import ContributorSection from "../ContributorSection";
import ImageSection, { type PendingTNCEUpload } from "../ImageSection";
import ProjectFields from "../ProjectFields";
import SubmitButton from "../SubmitButton";
import {
  openSubmissionProgress,
} from "../SubmissionProgress";
import {
  parseAuctionTitle,
  type ParsedAuctionTitle,
} from "@/lib/tnce/auctionParser";
import {
  detectMarketplace,
} from "@/lib/tnce/marketplaceDetector";

type Props = {
  mode: "new" | "update" | "missing";
  action: "update" | "similar" | "removal";
  project: "cards-alert";
  projectLabel: string;
  activeObject: any;
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
  certNumber?: string;
  grade?: string;
  serialNumber?: string;
  description?: string;
  aspects?: Record<string, string[]>;
  cardFields?: ParsedAuctionTitle & {
    certNumber: string;
  };
  frontImage?: string;
  additionalImages?: string[];
  error?: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function activeValue(activeObject: any, keys: string[]) {
  for (const key of keys) {
    const value = activeObject?.[key];

    if (value !== undefined && value !== null && clean(value)) {
      return clean(value);
    }
  }

  return "";
}

function cleanSimilarCardBrand(brand: string, parallel: string) {
  let cleanedBrand = clean(brand)
    .replace(/\s+\d+\s*\/\s*(?:\d+|xx)\s*$/i, "")
    .trim();

  const cleanedParallel = clean(parallel)
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

  return cleanedBrand;
}

function uniqueLines(values: string[]) {
  const seen = new Set<string>();

  return values
    .map(clean)
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

function marketplaceLabel(value: string) {
  return clean(value || "Marketplace")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

  if (!response.ok || !result?.ok || !result?.base64) {
    throw new Error(result?.error || `Unable to import image ${index + 1}.`);
  }

  const dataUrl = String(result.base64);
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);

  if (!match) {
    throw new Error(`Imported image ${index + 1} returned invalid data.`);
  }

  const contentType = match[1] || "image/jpeg";

  const binary = window.atob(match[2]);
  const bytes = new Uint8Array(binary.length);

  for (let byteIndex = 0; byteIndex < binary.length; byteIndex += 1) {
    bytes[byteIndex] = binary.charCodeAt(byteIndex);
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

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    source: "auction",
    slot,
    fileName,
    contentType,
    file,
    previewUrl: URL.createObjectURL(file),
    originalUrl: url,
    uploaded: false,
  };
}

export default function NewCardsAlertForm({
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
  const [cardYear, setCardYear] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [parallel, setParallel] = useState("");
  const [sport, setSport] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [grade, setGrade] = useState("");
  const [certNumber, setCertNumber] = useState("");

  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");

  const [previousGrade, setPreviousGrade] = useState("");
  const [previousCertNumber, setPreviousCertNumber] = useState("");
  const [previousSourceUrl, setPreviousSourceUrl] = useState("");

  const [frontImage, setFrontImage] = useState("");
  const [backImage, setBackImage] = useState("");
  const [otherImages, setOtherImages] = useState("");
  const [uploadedImages, setUploadedImages] = useState<PendingTNCEUpload[]>([]);

  const [previousFrontImage, setPreviousFrontImage] = useState("");
  const [previousBackImage, setPreviousBackImage] = useState("");
  const [previousOtherImages, setPreviousOtherImages] = useState("");
  const [previousUploadedImages, setPreviousUploadedImages] = useState<
    PendingTNCEUpload[]
  >([]);

  const [
  auctionSourceUrl,
  setAuctionSourceUrl,
] = useState("");

const [
  pageText,
  setPageText,
] = useState("");

const [
  showPageTextFallback,
  setShowPageTextFallback,
] = useState(false);

const [
  importing,
  setImporting,
] = useState(false);

const [
  importError,
  setImportError,
] = useState("");
  const [importedListing, setImportedListing] =
    useState<AuctionImportResult | null>(null);

  const [currentSourceUrls, setCurrentSourceUrls] = useState<string[]>([]);

  const [
  previousAuctionSourceUrl,
  setPreviousAuctionSourceUrl,
] = useState("");

const [
  previousPageText,
  setPreviousPageText,
] = useState("");

const [
  showPreviousPageTextFallback,
  setShowPreviousPageTextFallback,
] = useState(false);

const [
  importingPrevious,
  setImportingPrevious,
] = useState(false);

const [
  previousImportError,
  setPreviousImportError,
] = useState("");
  const [previousImportedListing, setPreviousImportedListing] =
    useState<AuctionImportResult | null>(null);
  const [previousSourceUrls, setPreviousSourceUrls] = useState<string[]>([]);

  const [contributorName, setContributorName] = useState("");
  const [contributorEmail, setContributorEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState("");
  const [submitError, setSubmitError] = useState("");

  /*
   * ProjectFields shares these RPA-oriented props.
   * Cards Alert does not display them.
   */
  const [unusedCardTitle, setUnusedCardTitle] = useState("");
  const [unusedVariation, setUnusedVariation] = useState("");

  const isSimilarCard = action === "similar";

  useEffect(() => {
    if (!isSimilarCard) return;

    setCardYear(activeValue(activeObject, ["Year", "year"]));
    setFirstName(activeValue(activeObject, ["First", "first"]));
    setLastName(activeValue(activeObject, ["Last", "last"]));
    setCardNumber(activeValue(activeObject, ["Num", "Number", "number"]));
    const existingParallel = activeValue(activeObject, [
      "Parallel",
      "parallel",
    ]);

    setBrand(
      cleanSimilarCardBrand(
        activeValue(activeObject, ["Brand", "brand"]),
        existingParallel,
      ),
    );
    setParallel(
      existingParallel.replace(/\s+\d+\s*\/\s*(?:\d+|xx)\s*$/i, "").trim(),
    );
    setSport(activeValue(activeObject, ["Sport", "sport"]));
    setSerialNumber("");
    setStatus(activeValue(activeObject, ["Status", "status"]));

    /*
 * A similar card is a separate production card.
 * Do not inherit evidence, grading information,
 * images, or identifiers from the original card.
 */
setPreviousGrade("");
setPreviousCertNumber("");
setPreviousSourceUrl("");
setPreviousSourceUrls([]);
setPreviousAuctionSourceUrl("");
setPreviousPageText("");
setShowPreviousPageTextFallback(false);
setPreviousFrontImage("");
setPreviousBackImage("");
setPreviousOtherImages("");
setPreviousUploadedImages([]);

    setGrade("");
    setCertNumber("");
    setFrontImage("");
    setBackImage("");
    setOtherImages("");
    setUploadedImages([]);
    setCurrentSourceUrls([]);
  }, [activeObject, isSimilarCard]);

async function importAuctionListing() {
  const sourceUrl =
    auctionSourceUrl.trim();

  const copiedPageText =
    pageText.trim();

  if (
    importing ||
    (
      !sourceUrl &&
      !copiedPageText
    )
  ) {
    if (
      !sourceUrl &&
      !copiedPageText
    ) {
      setImportError(
        "Paste an auction URL or copied webpage text first."
      );
    }

    return;
  }

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
            url: copiedPageText
              ? ""
              : sourceUrl,

            pageText:
              copiedPageText,
          }),
        }
      );

    const responseText =
      await response.text();

    let result:
      AuctionImportResult;

    try {
      result =
        JSON.parse(
          responseText
        );
    } catch {
      throw new Error(
        `Auction import returned invalid JSON: ${responseText.slice(
          0,
          200
        )}`
      );
    }

    if (
      !response.ok ||
      !result.ok
    ) {
      throw new Error(
        result.error ||
          "Unable to import this listing."
      );
    }

    const parsedListing =
      result.cardFields ||
      {
        ...parseAuctionTitle(
          result.title,
          result.aspects
        ),

        certNumber:
          result.certNumber ||
          "",
      };

    const imageUrls =
      uniqueLines([
        result.frontImage || "",

        ...(
          Array.isArray(
            result.additionalImages
          )
            ? result.additionalImages
            : []
        ),
      ]);

    const importedUploads:
      PendingTNCEUpload[] = [];

    let hasFront =
      uploadedImages.some(
        (image) =>
          image.slot === "front"
      );

    let hasBack =
      uploadedImages.some(
        (image) =>
          image.slot === "back"
      );

    for (
      let index = 0;
      index < imageUrls.length;
      index += 1
    ) {
      const slot:
        | "front"
        | "back"
        | "other" =
        !hasFront
          ? "front"
          : !hasBack
            ? "back"
            : "other";

      importedUploads.push(
        await importImageAsUpload(
          imageUrls[index],
          slot,
          index
        )
      );

      if (slot === "front") {
        hasFront = true;
      }

      if (slot === "back") {
        hasBack = true;
      }
    }

    /*
     * Add New Card may fill blank identity fields.
     *
     * Report Similar Card already contains the shared
     * card identity, so imported data only fills fields
     * that are still blank.
     */
    if (
      parsedListing.year &&
      !cardYear.trim()
    ) {
      setCardYear(
        parsedListing.year
      );
    }

    if (
      parsedListing.firstName &&
      !firstName.trim()
    ) {
      setFirstName(
        parsedListing.firstName
      );
    }

    if (
      parsedListing.lastName &&
      !lastName.trim()
    ) {
      setLastName(
        parsedListing.lastName
      );
    }

    if (
      parsedListing.cardNumber &&
      !cardNumber.trim()
    ) {
      setCardNumber(
        parsedListing.cardNumber
      );
    }

    if (
      parsedListing.brand &&
      !brand.trim()
    ) {
      setBrand(
        parsedListing.brand
      );
    }

    if (
      parsedListing.parallel &&
      !parallel.trim()
    ) {
      setParallel(
        parsedListing.parallel
      );
    }

    if (
      parsedListing.sport &&
      !sport.trim()
    ) {
      setSport(
        parsedListing.sport
      );
    }

    const importedGrade =
      parsedListing.grade ||
      result.grade;

    if (
      importedGrade &&
      !grade.trim()
    ) {
      setGrade(
        importedGrade
      );
    }

    const importedCertNumber =
      parsedListing.certNumber ||
      result.certNumber;

    if (
      importedCertNumber &&
      !certNumber.trim()
    ) {
      setCertNumber(
        importedCertNumber
      );
    }

    const importedSerial =
      parsedListing.serialNumber ||
      result.serialNumber;

    if (
      importedSerial &&
      !serialNumber.trim()
    ) {
      setSerialNumber(
        importedSerial
      );
    }

    if (
      result.description &&
      !description.trim()
    ) {
      setDescription(
        result.description
      );
    }

    const resolvedSourceUrl =
  clean(
    copiedPageText
      ? sourceUrl ||
          result.sourceUrl
      : result.sourceUrl ||
          sourceUrl
  );

    if (resolvedSourceUrl) {
      setCurrentSourceUrls(
        (current) =>
          uniqueLines([
            ...current,
            resolvedSourceUrl,
          ])
      );

      setAuctionSourceUrl(
        resolvedSourceUrl
      );
    }

    setUploadedImages(
      (current) => [
        ...current,
        ...importedUploads,
      ]
    );

    setImportedListing(
  result
);

setPageText("");

setShowPageTextFallback(
  false
);
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to import this listing.";

    const sourceMarketplace =
      detectMarketplace(
        sourceUrl
      );

    const blockedSource =
      !copiedPageText &&
      (
        sourceMarketplace ===
          "heritage" ||
        sourceMarketplace ===
          "psa" ||
        /blocks automated imports|approved customers|403/i.test(
          message
        )
      );

    setShowPageTextFallback(
      blockedSource
    );

    setImportError(
      blockedSource
        ? "This website blocked the direct import. Copy the webpage text and paste it below."
        : message
    );
  } finally {
    setImporting(false);
  }
}

  async function importPreviousAuctionListing() {
  const sourceUrl =
    previousAuctionSourceUrl.trim();

  const copiedPageText =
    previousPageText.trim();

  if (
    importingPrevious ||
    (
      !sourceUrl &&
      !copiedPageText
    )
  ) {
    if (
      !sourceUrl &&
      !copiedPageText
    ) {
      setPreviousImportError(
        "Paste a previous source URL or copied webpage text first."
      );
    }

    return;
  }

  setImportingPrevious(true);
  setPreviousImportError("");
  setPreviousImportedListing(null);

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
            url: copiedPageText
              ? ""
              : sourceUrl,

            pageText:
              copiedPageText,
          }),
        }
      );

    const responseText =
      await response.text();

    let result:
      AuctionImportResult;

    try {
      result =
        JSON.parse(
          responseText
        );
    } catch {
      throw new Error(
        `Previous source import returned invalid JSON: ${responseText.slice(
          0,
          200
        )}`
      );
    }

    if (
      !response.ok ||
      !result.ok
    ) {
      throw new Error(
        result.error ||
          "Unable to import this previous source."
      );
    }

    const parsedListing =
      result.cardFields ||
      {
        ...parseAuctionTitle(
          result.title,
          result.aspects
        ),

        certNumber:
          result.certNumber ||
          "",
      };

    const imageUrls =
      uniqueLines([
        result.frontImage || "",

        ...(
          Array.isArray(
            result.additionalImages
          )
            ? result.additionalImages
            : []
        ),
      ]);

    const importedUploads:
      PendingTNCEUpload[] = [];

    let hasFront =
      previousUploadedImages.some(
        (image) =>
          image.slot === "front"
      );

    let hasBack =
      previousUploadedImages.some(
        (image) =>
          image.slot === "back"
      );

    for (
      let index = 0;
      index < imageUrls.length;
      index += 1
    ) {
      const slot:
        | "front"
        | "back"
        | "other" =
        !hasFront
          ? "front"
          : !hasBack
            ? "back"
            : "other";

      importedUploads.push(
        await importImageAsUpload(
          imageUrls[index],
          slot,
          index
        )
      );

      if (slot === "front") {
        hasFront = true;
      }

      if (slot === "back") {
        hasBack = true;
      }
    }

    const importedGrade =
      parsedListing.grade ||
      result.grade;

    if (
      importedGrade &&
      !previousGrade.trim()
    ) {
      setPreviousGrade(
        importedGrade
      );
    }

    const importedCertNumber =
      parsedListing.certNumber ||
      result.certNumber;

    if (
      importedCertNumber &&
      !previousCertNumber.trim()
    ) {
      setPreviousCertNumber(
        importedCertNumber
      );
    }

    if (
      result.description &&
      !description.trim()
    ) {
      setDescription(
        result.description
      );
    }

    /*
     * When copied page text is used, preserve the URL
     * originally entered by the user.
     */
    const resolvedSourceUrl =
      clean(
        copiedPageText
          ? sourceUrl ||
              result.sourceUrl
          : result.sourceUrl ||
              sourceUrl
      );

    if (resolvedSourceUrl) {
      setPreviousSourceUrls(
        (current) =>
          uniqueLines([
            ...current,
            resolvedSourceUrl,
          ])
      );

      setPreviousAuctionSourceUrl(
        resolvedSourceUrl
      );
    }

    setPreviousUploadedImages(
      (current) => [
        ...current,
        ...importedUploads,
      ]
    );

    setPreviousImportedListing(
      result
    );

    setPreviousPageText("");

    setShowPreviousPageTextFallback(
      false
    );
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to import this previous source.";

    const sourceMarketplace =
      detectMarketplace(
        sourceUrl
      );

    const blockedSource =
      !copiedPageText &&
      (
        sourceMarketplace ===
          "heritage" ||
        sourceMarketplace ===
          "psa" ||
        /blocks automated imports|approved customers|403/i.test(
          message
        )
      );

    setShowPreviousPageTextFallback(
      blockedSource
    );

    setPreviousImportError(
      blockedSource
        ? "This website blocked the direct import. Copy the webpage text and paste it below."
        : message
    );
  } finally {
    setImportingPrevious(false);
  }
}

  async function uploadPendingImages(
    submissionId: string,
    images: PendingTNCEUpload[],
    setImages: typeof setUploadedImages,
  ) {
    const pending = images.filter((image) => image.file && !image.uploaded);

    if (pending.length === 0) {
      return images;
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

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || "Unable to prepare image uploads.");
    }

    const uploads = [...images];

    for (let index = 0; index < result.files.length; index += 1) {
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

    setImages([...uploads]);
    return uploads;
  }

  async function submitContribution() {
    if (submitting) return;

    setSubmitError("");

        const hasCardName =
      firstName.trim() ||
      lastName.trim();

    if (
      !cardYear.trim() ||
      !hasCardName ||
      !brand.trim()
    ) {
      setSubmitError(
        "Year, player/card name, and brand are required."
      );
      return;
    }

    if (!description.trim()) {
      setSubmitError("Add a description or opinion for this report.");
      return;
    }

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
    });

    await new Promise<void>(
      (resolve) => {
        requestAnimationFrame(() =>
          resolve()
        );
      }
    );

    try {
      const submissionId = crypto.randomUUID();

      setSubmissionStage("Uploading current card images...");
      progress.update(
        "Uploading current card images..."
      );
      const uploadedFiles = await uploadPendingImages(
        submissionId,
        uploadedImages,
        setUploadedImages,
      );

      let previousUploadedFiles: PendingTNCEUpload[] = [];

if (!isSimilarCard) {
  setSubmissionStage("Uploading previous evidence images...");
  progress.update("Uploading previous evidence images...");

  previousUploadedFiles = await uploadPendingImages(
    submissionId,
    previousUploadedImages,
    setPreviousUploadedImages,
  );
}

      const requestBody = {
        project,
        submissionType: isSimilarCard
          ? "similar-cards-alert-card"
          : "new-cards-alert-card",
        submissionMode: mode,
        submissionAction: isSimilarCard
          ? "similar"
          : "new",
        submissionId,
        sourcePageUrl:
          typeof window !== "undefined" ? window.location.href : "",
        auctionSourceUrl: currentSourceUrls.join("\n"),
        contributor: {
          name: contributorName.trim(),
          email: contributorEmail.trim(),
        },
        activeObject: {
  /*
   * Never send the original production ID for a
   * similar-card submission. This forces TNCE to
   * create a separate Cards Alert record.
   */
  id: isSimilarCard
    ? "cards-alert-main-page"
    : activeObject?.id || "cards-alert-main-page",

  title: [
    cardYear.trim(),
    firstName.trim(),
    lastName.trim(),
    cardNumber.trim()
      ? `#${cardNumber.trim()}`
      : "",
    brand.trim(),
  ]
    .filter(Boolean)
    .join(" "),

  ID: isSimilarCard
    ? ""
    : clean(activeObject?.ID),

  Card_id: isSimilarCard
    ? ""
    : clean(activeObject?.Card_id),

  card_id: isSimilarCard
    ? ""
    : clean(activeObject?.card_id),

  Grade: isSimilarCard
    ? ""
    : clean(activeObject?.Grade),

  Cert_Number: isSimilarCard
    ? ""
    : clean(activeObject?.Cert_Number),

  Front_Image: isSimilarCard
    ? ""
    : clean(activeObject?.Front_Image),

  Back_Image: isSimilarCard
    ? ""
    : clean(activeObject?.Back_Image),

  Other_Images: isSimilarCard
    ? ""
    : clean(activeObject?.Other_Images),
},

        fields: {
          Year: cardYear.trim(),
          First: firstName.trim(),
          Last: lastName.trim(),
          Num: cardNumber.trim(),
          Brand: brand.trim(),
          Parallel: parallel.trim(),
          Sport: sport.trim(),
          Serial_Number: serialNumber.trim(),
          Grade: grade.trim() || "Raw",
          Cert_Number: certNumber.trim(),
          Status: status.trim(),
          Description: description.trim(),
          Previous_Grade: isSimilarCard
  ? ""
  : previousGrade.trim(),

Previous_Cert_Number: isSimilarCard
  ? ""
  : previousCertNumber.trim(),

Previous_Source_URL: isSimilarCard
  ? ""
  : previousSourceUrls.join("\n"),
          Auction_Source_URL: currentSourceUrls.join("\n"),
        },
        imageUrls: {
          front: frontImage.trim(),
          back: backImage.trim(),
          other: otherImages.split(/\r?\n/).map(clean).filter(Boolean),
        },
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
            originalUrl: clean(image.originalUrl),
          })),
        
        previousImageUrls: {
  front: isSimilarCard
    ? ""
    : previousFrontImage.trim(),

  back: isSimilarCard
    ? ""
    : previousBackImage.trim(),

  other: isSimilarCard
    ? []
    : previousOtherImages
        .split(/\r?\n/)
        .map(clean)
        .filter(Boolean),
},

previousUploadedImages: isSimilarCard
  ? []
  : previousUploadedFiles
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
        originalUrl: clean(image.originalUrl),
      })),
        notes: "",
      };

      setSubmissionStage("Saving and processing submission...");
      progress.update(
        "Saving and processing submission..."
      );
      const response = await fetch("/api/tnce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const text = await response.text();
      let result: any;

      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          `Submission returned invalid JSON: ${text.slice(0, 300)}`,
        );
      }

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Cards Alert submission failed.");
      }

      onSuccess(result.submissionId || submissionId);
    } catch (error: any) {
      setSubmitError(error?.message || "Cards Alert submission failed.");
    } finally {
      progress.close();
      setSubmissionStage("");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-red-300">
            {projectLabel}
          </div>

          <h2 className="mt-1 text-2xl font-black text-white">
            {isSimilarCard ? "Report Similar Card" : "+ Add New Card"}
          </h2>

          <p className="mt-2 text-sm text-neutral-400">
            {isSimilarCard
              ? "Document another appearance or version of this card and compare it with the existing entry."
              : "Submit a card that is not currently listed in Cards Alert."}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-red-600 bg-black px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-950/50"
        >
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-5 pb-32 sm:pb-12">
        <section className="rounded-xl border border-red-600/50 bg-red-950/20 p-4">
          <h3 className="text-base font-black text-red-200">
            {isSimilarCard ? "Similar Card Report" : "New Cards Alert Entry"}
          </h3>

          <p className="mt-1 text-sm leading-6 text-neutral-300">
            {isSimilarCard
              ? "The existing entry is loaded as the previous card. Add the current evidence, grading details, sources, and images for comparison."
              : "Add the card identity, evidence, source, and the best available images. Every submission is reviewed before publication."}
          </p>
        </section>

        <section className="rounded-xl border border-[#9c7a2d] bg-[#181300] p-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#f1d36b]">
            Import Auction / Source URL
          </h3>

          <p className="mt-1 text-xs leading-5 text-neutral-400">
            Paste an eBay, X, Instagram, Fanatics, Goldin, or other supported
            source URL to import available card details, post text, and images.
          </p>

          <div className="mt-3 grid gap-3">
  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
    <input
      type="url"
      value={
        auctionSourceUrl
      }
      onChange={(event) => {
        setAuctionSourceUrl(
          event.target.value
        );

        setPageText("");
        setShowPageTextFallback(
          false
        );

        setImportError("");
        setImportedListing(null);
      }}
      onKeyDown={(event) => {
        if (
          event.key === "Enter"
        ) {
          event.preventDefault();

          importAuctionListing();
        }
      }}
      className="h-11 min-w-0 rounded-lg border border-neutral-700 bg-black px-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#d4af37]"
      placeholder="Paste auction or marketplace URL"
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
            setImportedListing(
              null
            );
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

          {importError && (
            <div className="mt-3 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
              {importError}
            </div>
          )}

          {importedListing?.ok && (
            <div className="mt-3 rounded-lg border border-green-700/60 bg-green-950/20 p-3">
              <div className="text-xs font-black uppercase tracking-wide text-green-300">
                {marketplaceLabel(importedListing.marketplace || "Marketplace")}{" "}
                Listing Imported
              </div>

              {importedListing.title && (
                <div className="mt-2 text-sm font-bold text-white">
                  {importedListing.title}
                </div>
              )}

              <p className="mt-2 text-xs text-neutral-400">
                Review all imported details and organize the images before
                submitting.
              </p>
            </div>
          )}
        </section>

        <ProjectFields
          project="cards-alert"
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
          cardTitle={unusedCardTitle}
          setCardTitle={setUnusedCardTitle}
          serialNumber={serialNumber}
          setSerialNumber={setSerialNumber}
          variation={unusedVariation}
          setVariation={setUnusedVariation}
          grade={grade}
          setGrade={setGrade}
          certNumber={certNumber}
          setCertNumber={setCertNumber}
        />

        <section className="rounded-xl border border-red-500/40 bg-red-950/20 p-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-red-300">
            Current Card Condition
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Current Grade
              <input
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
                placeholder="PSA 9, BGS 9.5, Raw, etc."
              />
            </label>

            <label className="grid gap-1 text-sm">
              Current Cert #
              <input
                value={certNumber}
                onChange={(event) => setCertNumber(event.target.value)}
                className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              />
            </label>
          </div>
        </section>

        <div>
          <div className="mb-2 text-sm font-black uppercase tracking-widest text-red-300">
            Current Card Images
          </div>
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
        </div>

        <section className="rounded-xl border-2 border-green-500 bg-green-950/40 p-4 shadow-[0_0_14px_rgba(34,197,94,0.65)]">
  <h3 className="text-sm font-black uppercase tracking-widest text-lime-300">
    Previous Card Condition
  </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Previous Grade
              <input
                value={previousGrade}
                onChange={(event) => setPreviousGrade(event.target.value)}
                className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
                placeholder="Previous grade or Raw"
              />
            </label>

            <label className="grid gap-1 text-sm">
              Previous Cert #
              <input
                value={previousCertNumber}
                onChange={(event) => setPreviousCertNumber(event.target.value)}
                className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3">
  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
    <input
      type="url"
      value={
        previousAuctionSourceUrl
      }
      onChange={(event) => {
        setPreviousAuctionSourceUrl(
          event.target.value
        );

        setPreviousPageText("");

        setShowPreviousPageTextFallback(
          false
        );

        setPreviousImportError("");

        setPreviousImportedListing(
          null
        );
      }}
      onKeyDown={(event) => {
        if (
          event.key === "Enter"
        ) {
          event.preventDefault();

          importPreviousAuctionListing();
        }
      }}
      className="h-11 min-w-0 rounded-lg border border-neutral-700 bg-black px-3 text-sm text-white"
      placeholder="Previous auction or source URL"
    />

    <button
      type="button"
      onClick={
        importPreviousAuctionListing
      }
      disabled={
        importingPrevious ||
        (
          !previousAuctionSourceUrl.trim() &&
          !previousPageText.trim()
        )
      }
      className="h-11 rounded-lg border border-lime-300 bg-lime-400 px-5 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_0_12px_rgba(163,230,53,0.55)] transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {importingPrevious
        ? "Importing..."
        : previousPageText.trim()
          ? "⚡ Import Previous Page Text"
          : "⚡ Import Previous Source"}
    </button>
  </div>

  {showPreviousPageTextFallback && (
    <>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-green-800/60" />

        <span className="text-[11px] font-black uppercase tracking-widest text-lime-300">
          Direct Import Blocked
        </span>

        <div className="h-px flex-1 bg-green-800/60" />
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-black uppercase tracking-wide text-lime-300">
          Paste Previous Page Text
        </span>

        <textarea
          value={
            previousPageText
          }
          onChange={(event) => {
            setPreviousPageText(
              event.target.value
            );

            setPreviousImportError(
              ""
            );

            setPreviousImportedListing(
              null
            );
          }}
          className="min-h-40 rounded-lg border border-green-600 bg-black px-3 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-lime-300"
          placeholder="Open the previous PSA or Heritage page, press Ctrl+A, then Ctrl+C, and paste the copied page text here."
        />

        <span className="text-xs leading-5 text-green-200/70">
          The original previous-source URL above will be preserved when this card is published.
        </span>
      </label>
    </>
  )}
</div>

          {previousImportError && (
            <div className="mt-3 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
              {previousImportError}
            </div>
          )}

          {previousImportedListing?.ok && (
            <div className="mt-3 rounded-lg border border-green-700/60 bg-green-950/20 p-3 text-sm text-green-200">
              Previous source imported. You can enter another URL to add more
              evidence.
            </div>
          )}

          {previousSourceUrls.length > 0 && (
            <div className="mt-3 grid gap-1 text-xs text-neutral-400">
              {previousSourceUrls.map((url) => (
                <div key={url} className="break-all">
                  {url}
                </div>
              ))}
            </div>
          )}
        </section>

        <div>
          <div className="mb-2 text-sm font-black uppercase tracking-widest text-lime-300">
            Previous Card Images
          </div>
          <ImageSection
            frontImage={previousFrontImage}
            setFrontImage={setPreviousFrontImage}
            backImage={previousBackImage}
            setBackImage={setPreviousBackImage}
            otherImages={previousOtherImages}
            setOtherImages={setPreviousOtherImages}
            uploadedImages={previousUploadedImages}
            setUploadedImages={setPreviousUploadedImages}
          />
        </div>

        <section className="rounded-xl border border-red-500/40 bg-red-950/20 p-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-red-300">
            Description / Opinion
          </h3>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-4 min-h-32 w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="Explain the evidence and why this card should be added to Cards Alert."
          />
        </section>

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
          label="Submit New Card"
          onClick={submitContribution}
        />
      </div>
    </>
  );
}