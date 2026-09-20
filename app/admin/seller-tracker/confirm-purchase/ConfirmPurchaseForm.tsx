"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

type Seller = {
  Seller_ID: string;
  Platform: string;
  Username: string;
  eBay_User_ID: string;
  Store_Name: string;
  Store_URL: string;
  Profile_URL: string;
  Status: string;
  Date_Added: string;
  Last_Checked: string;
  Notes: string;
  Buyer_Feedback_ID: string;
  Star_Color: string;
  Listing_Count: number;
};

type ConfirmPurchaseFormProps = {
  sellers: Seller[];
};

type ParsedPurchase = {
  year?: string;
  brand?: string;
  set?: string;
  playerFirst?: string;
  playerLast?: string;
  cardNumber?: string;
  parallel?: string;
  serialNumber?: string;
  gradeCompany?: string;
  grade?: string;
  certNumber?: string;
};

type PreviewPurchaseResponse = {
  ok: boolean;
  status?: "preview" | "already_exists";
  purchaseId?: string;
  ebayItemId?: string;
  sellerId?: string;
  row?: number;
  source?: string;
  sourceUrl?: string;
  originalListingSeller?: string;
  title?: string;
  purchaseDate?: string;
  purchasePrice?: number | string;
  description?: string;
  images?: string[];
  parsed?: ParsedPurchase;
  itemSpecifics?: Record<string, unknown>;
  error?: string;
};

type ImportPurchaseResponse = {
  ok: boolean;
  status?: "imported" | "already_exists";
  purchaseId?: string;
  ebayItemId?: string;
  sellerId?: string;
  row?: number;
  matchStatus?: string;
  matchCount?: number;
  error?: string;
};

function extractEbayItemId(
  value: string
): string {
  const input = String(value || "").trim();

  if (!input) {
    return "";
  }

  const itmMatch = input.match(
    /\/itm\/(?:[^/?#]+\/)?(\d{9,15})(?:[/?#]|$)/i
  );

  if (itmMatch?.[1]) {
    return itmMatch[1];
  }

  const queryMatch = input.match(
    /[?&](?:item|itemid|item_id)=(\d{9,15})(?:&|$)/i
  );

  if (queryMatch?.[1]) {
    return queryMatch[1];
  }

  if (/^\d{9,15}$/.test(input)) {
    return input;
  }

  return "";
}

function getStarColorClass(
  color: string
): string {
  switch (
    String(color || "")
      .trim()
      .toLowerCase()
  ) {
    case "red":
      return "text-red-500";
    case "blue":
      return "text-blue-500";
    case "green":
      return "text-green-500";
    case "yellow":
      return "text-yellow-400";
    case "orange":
      return "text-orange-500";
    case "purple":
      return "text-purple-500";
    case "teal":
    case "turquoise":
      return "text-cyan-400";
    case "pink":
      return "text-pink-500";
    default:
      return "";
  }
}

function formatPurchaseDate(
  value?: string
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatPrice(
  value?: number | string
): string {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "Not available";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    }
  ).format(number);
}

function valueOrDash(
  value?: string
): string {
  const text = String(value || "").trim();
  return text || "—";
}

export default function ConfirmPurchaseForm({
  sellers,
}: ConfirmPurchaseFormProps) {
  const [sellerId, setSellerId] = useState(
    sellers.length === 1
      ? sellers[0].Seller_ID
      : ""
  );

  const [purchaseUrl, setPurchaseUrl] =
    useState("");

  const [preview, setPreview] =
    useState<PreviewPurchaseResponse | null>(
      null
    );

  const [selectedImages, setSelectedImages] =
    useState<string[]>([]);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<
      "success" | "warning" | "error" | ""
    >("");

  const [isPreviewing, setIsPreviewing] =
    useState(false);

  const [isImporting, setIsImporting] =
    useState(false);

  const selectedSeller = useMemo(
    () =>
      sellers.find(
        (seller) =>
          seller.Seller_ID === sellerId
      ) || null,
    [sellers, sellerId]
  );

  const itemId = useMemo(
    () => extractEbayItemId(purchaseUrl),
    [purchaseUrl]
  );

  const starColorClass =
    getStarColorClass(
      selectedSeller?.Star_Color || ""
    );

  const showStar = Boolean(
    selectedSeller?.Star_Color?.trim()
  );

  const hasSeller = Boolean(
    sellerId.trim()
  );

  const hasPurchaseUrl = Boolean(
    purchaseUrl.trim()
  );

  const validPurchase = Boolean(itemId);

  const busy =
    isPreviewing || isImporting;

  const canPreview =
    hasSeller &&
    hasPurchaseUrl &&
    validPurchase &&
    !busy;

  const canImport =
    preview?.status === "preview" &&
    !busy;

  function clearMessage() {
    setMessage("");
    setMessageType("");
  }

  function clearPreview() {
    setPreview(null);
    setSelectedImages([]);
  }

  async function readJson<T>(
    response: Response
  ): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch {
      throw new Error(
        "The server returned an invalid response."
      );
    }
  }

  async function handlePreview(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!sellerId) {
      setMessage(
        "Select a monitored seller."
      );
      setMessageType("warning");
      return;
    }

    if (!purchaseUrl.trim()) {
      setMessage(
        "Enter the eBay purchase URL."
      );
      setMessageType("warning");
      return;
    }

    if (!itemId) {
      setMessage(
        "That does not appear to contain a valid eBay item number."
      );
      setMessageType("warning");
      return;
    }

    setIsPreviewing(true);
    clearPreview();
    setMessage(
      `Loading preview for eBay item ${itemId}...`
    );
    setMessageType("");

    try {
      const response = await fetch(
        "/api/seller-tracker",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action:
              "previewConfirmedPurchase",
            sellerId,
            sourceUrl:
              purchaseUrl.trim(),
          }),
        }
      );

      const data =
        await readJson<PreviewPurchaseResponse>(
          response
        );

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "The purchase preview could not be loaded."
        );
      }

      if (
        data.status === "already_exists"
      ) {
        setMessage(
          `Already captured: eBay item ${
            data.ebayItemId || itemId
          }${
            data.purchaseId
              ? ` (${data.purchaseId})`
              : ""
          }. No duplicate was created.`
        );
        setMessageType("warning");
        return;
      }

      if (data.status !== "preview") {
        throw new Error(
          "The server did not return a purchase preview."
        );
      }

      const images = Array.isArray(
        data.images
      )
        ? data.images.filter(Boolean)
        : [];

      setPreview(data);
      setSelectedImages(images);
      setMessage(
        `Preview loaded. ${images.length} image${
          images.length === 1 ? "" : "s"
        } found. Uncheck any images you do not want to archive.`
      );
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The purchase preview could not be loaded."
      );
      setMessageType("error");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleConfirmPurchase() {
    if (
      !preview ||
      preview.status !== "preview"
    ) {
      return;
    }

    setIsImporting(true);
    setMessage(
      `Importing eBay item ${
        preview.ebayItemId || itemId
      } with ${selectedImages.length} selected image${
        selectedImages.length === 1
          ? ""
          : "s"
      }...`
    );
    setMessageType("");

    try {
      const response = await fetch(
        "/api/seller-tracker",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action:
              "importConfirmedPurchase",
            sellerId,
            sourceUrl:
              purchaseUrl.trim(),
            selectedImageUrls:
              selectedImages,
          }),
        }
      );

      const data =
        await readJson<ImportPurchaseResponse>(
          response
        );

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "The purchase could not be imported."
        );
      }

      if (
        data.status === "already_exists"
      ) {
        setMessage(
          `Already captured: eBay item ${
            data.ebayItemId || itemId
          }${
            data.purchaseId
              ? ` (${data.purchaseId})`
              : ""
          }. No duplicate was created.`
        );
        setMessageType("warning");
        return;
      }

      if (data.status === "imported") {
        const matchText =
          data.matchStatus
            ? ` Matching result: ${data.matchStatus}${
                typeof data.matchCount ===
                "number"
                  ? ` (${data.matchCount} candidate${
                      data.matchCount === 1
                        ? ""
                        : "s"
                    })`
                  : ""
              }.`
            : "";

        setMessage(
          `Purchase imported successfully: eBay item ${
            data.ebayItemId || itemId
          }${
            data.purchaseId
              ? ` (${data.purchaseId})`
              : ""
          }. Archived ${selectedImages.length} selected image${
            selectedImages.length === 1
              ? ""
              : "s"
          }.${matchText}`
        );
        setMessageType("success");
        clearPreview();
        return;
      }

      setMessage(
        `Purchase processed successfully: eBay item ${itemId}.`
      );
      setMessageType("success");
      clearPreview();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The purchase could not be imported."
      );
      setMessageType("error");
    } finally {
      setIsImporting(false);
    }
  }

  function toggleImage(
    imageUrl: string
  ) {
    setSelectedImages((current) =>
      current.includes(imageUrl)
        ? current.filter(
            (url) => url !== imageUrl
          )
        : [...current, imageUrl]
    );
  }

  const previewImages =
    preview?.images || [];

  return (
    <form
      onSubmit={handlePreview}
      className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          Purchase Information
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Preview the original eBay listing
          before anything is permanently
          archived.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="sellerId"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Monitored Seller
          </label>

          <select
            id="sellerId"
            name="sellerId"
            value={sellerId}
            onChange={(event) => {
              setSellerId(
                event.target.value
              );
              clearMessage();
              clearPreview();
            }}
            disabled={
              sellers.length === 0 ||
              busy
            }
            className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:text-zinc-500"
          >
            {sellers.length !== 1 && (
              <option value="">
                Select a monitored seller
              </option>
            )}

            {sellers.map((seller) => (
              <option
                key={seller.Seller_ID}
                value={seller.Seller_ID}
              >
                {seller.Store_Name ||
                  seller.Username}{" "}
                ({seller.Listing_Count}{" "}
                listings)
              </option>
            ))}
          </select>

          {selectedSeller
            ?.Buyer_Feedback_ID && (
            <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
              <p className="text-xs text-zinc-500">
                Identified Buyer
              </p>

              <p className="mt-1 text-sm font-semibold text-zinc-200">
                {
                  selectedSeller.Buyer_Feedback_ID
                }

                {showStar && (
                  <>
                    {" ("}
                    <span
                      className={
                        starColorClass
                      }
                    >
                      ★
                    </span>
                    {")"}
                  </>
                )}
              </p>
            </div>
          )}

          {sellers.length === 0 && (
            <p className="mt-2 text-xs text-red-400">
              No active monitored sellers
              could be loaded.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="source"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Source
          </label>

          <input
            id="source"
            name="source"
            value="eBay"
            readOnly
            className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-300 outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="purchaseUrl"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            eBay Purchase URL
          </label>

          <input
            id="purchaseUrl"
            name="purchaseUrl"
            type="text"
            value={purchaseUrl}
            onChange={(event) => {
              setPurchaseUrl(
                event.target.value
              );
              clearMessage();
              clearPreview();
            }}
            disabled={busy}
            placeholder="https://www.ebay.com/itm/..."
            autoComplete="off"
            className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          />

          {!hasPurchaseUrl && (
            <p className="mt-2 text-xs text-zinc-500">
              Paste the original eBay
              purchase/listing URL.
            </p>
          )}

          {hasPurchaseUrl &&
            validPurchase && (
              <p className="mt-2 text-xs text-emerald-400">
                eBay Item ID detected:{" "}
                <span className="font-semibold">
                  {itemId}
                </span>
              </p>
            )}

          {hasPurchaseUrl &&
            !validPurchase && (
              <p className="mt-2 text-xs text-amber-400">
                A valid eBay item number
                has not been detected yet.
              </p>
            )}
        </div>
      </div>

      {!preview && (
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-5">
              {message && (
                <p
                  className={
                    messageType === "success"
                      ? "text-sm text-emerald-400"
                      : messageType === "error"
                        ? "text-sm text-red-400"
                        : messageType ===
                            "warning"
                          ? "text-sm text-amber-400"
                          : "text-sm text-zinc-400"
                  }
                >
                  {message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canPreview}
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600"
            >
              {isPreviewing
                ? "Loading Preview..."
                : "Preview Purchase"}
            </button>
          </div>
        </div>
      )}

      {preview?.status === "preview" && (
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                Purchase Preview
              </p>
              <h3 className="mt-2 text-xl font-semibold text-zinc-100">
                {preview.title ||
                  "Untitled eBay listing"}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Original seller:{" "}
                <span className="text-zinc-200">
                  {preview.originalListingSeller ||
                    "Not available"}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                clearPreview();
                clearMessage();
              }}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-700 px-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-50"
            >
              Change Purchase
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs text-zinc-500">
                Purchase Price
              </p>
              <p className="mt-1 font-semibold text-zinc-100">
                {formatPrice(
                  preview.purchasePrice
                )}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs text-zinc-500">
                Purchase Date
              </p>
              <p className="mt-1 font-semibold text-zinc-100">
                {formatPurchaseDate(
                  preview.purchaseDate
                )}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs text-zinc-500">
                eBay Item ID
              </p>
              <p className="mt-1 font-semibold text-zinc-100">
                {preview.ebayItemId ||
                  itemId}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs text-zinc-500">
                Images Selected
              </p>
              <p className="mt-1 font-semibold text-zinc-100">
                {selectedImages.length} /{" "}
                {previewImages.length}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
            <h4 className="text-sm font-semibold text-zinc-200">
              Parsed Card Data
            </h4>

            <div className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-zinc-500">
                  Year:
                </span>{" "}
                {valueOrDash(
                  preview.parsed?.year
                )}
              </div>
              <div>
                <span className="text-zinc-500">
                  Brand:
                </span>{" "}
                {valueOrDash(
                  preview.parsed?.brand
                )}
              </div>
              <div>
                <span className="text-zinc-500">
                  Set:
                </span>{" "}
                {valueOrDash(
                  preview.parsed?.set
                )}
              </div>
              <div>
                <span className="text-zinc-500">
                  Player:
                </span>{" "}
                {valueOrDash(
                  [
                    preview.parsed
                      ?.playerFirst,
                    preview.parsed
                      ?.playerLast,
                  ]
                    .filter(Boolean)
                    .join(" ")
                )}
              </div>
              <div>
                <span className="text-zinc-500">
                  Card #:
                </span>{" "}
                {valueOrDash(
                  preview.parsed
                    ?.cardNumber
                )}
              </div>
              <div>
                <span className="text-zinc-500">
                  Parallel:
                </span>{" "}
                {valueOrDash(
                  preview.parsed?.parallel
                )}
              </div>
              <div>
                <span className="text-zinc-500">
                  Grade:
                </span>{" "}
                {valueOrDash(
                  [
                    preview.parsed
                      ?.gradeCompany,
                    preview.parsed?.grade,
                  ]
                    .filter(Boolean)
                    .join(" ")
                )}
              </div>
              <div>
                <span className="text-zinc-500">
                  Cert #:
                </span>{" "}
                {valueOrDash(
                  preview.parsed
                    ?.certNumber
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  Select Images to Archive
                </h4>
                <p className="mt-1 text-xs text-zinc-500">
                  All images are selected by
                  default. Uncheck unnecessary
                  images before confirming.
                </p>
              </div>

              {previewImages.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImages(
                        previewImages
                      )
                    }
                    disabled={busy}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Select All
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImages([])
                    }
                    disabled={busy}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {previewImages.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
                No eBay images were returned.
                You can still confirm the
                purchase without images.
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {previewImages.map(
                  (imageUrl, index) => {
                    const selected =
                      selectedImages.includes(
                        imageUrl
                      );

                    return (
                      <button
                        key={`${imageUrl}-${index}`}
                        type="button"
                        onClick={() =>
                          toggleImage(
                            imageUrl
                          )
                        }
                        disabled={busy}
                        className={`overflow-hidden rounded-lg border text-left transition ${
                          selected
                            ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40"
                            : "border-zinc-800 bg-zinc-950 opacity-55 hover:opacity-80"
                        } disabled:cursor-not-allowed`}
                      >
                        <div className="relative aspect-square bg-white">
                          <img
                            src={imageUrl}
                            alt={`eBay purchase image ${
                              index + 1
                            }`}
                            className="h-full w-full object-contain"
                          />

                          <div
                            className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border text-sm font-bold shadow ${
                              selected
                                ? "border-blue-400 bg-blue-600 text-white"
                                : "border-zinc-500 bg-zinc-900/90 text-zinc-400"
                            }`}
                          >
                            {selected
                              ? "✓"
                              : ""}
                          </div>
                        </div>

                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs text-zinc-400">
                            Image {index + 1}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              selected
                                ? "text-blue-400"
                                : "text-zinc-500"
                            }`}
                          >
                            {selected
                              ? "ARCHIVE"
                              : "SKIP"}
                          </span>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-zinc-800 pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5">
                {message && (
                  <p
                    className={
                      messageType ===
                      "success"
                        ? "text-sm text-emerald-400"
                        : messageType ===
                            "error"
                          ? "text-sm text-red-400"
                          : messageType ===
                              "warning"
                            ? "text-sm text-amber-400"
                            : "text-sm text-zinc-400"
                    }
                  >
                    {message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={
                  handleConfirmPurchase
                }
                disabled={!canImport}
                className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-600"
              >
                {isImporting
                  ? "Importing..."
                  : `Confirm Purchase${
                      previewImages.length >
                      0
                        ? ` (${selectedImages.length} image${
                            selectedImages.length ===
                            1
                              ? ""
                              : "s"
                          })`
                        : ""
                    }`}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
