"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  PointerEvent as ReactPointerEvent,
} from "react";

import type {
  SellerListing,
  ConfirmedPurchase,
  SellerMatch,
} from "./page";

type Seller = {
  Seller_ID: string;
  Platform?: string;
  Username?: string;
  Store_Name?: string;
  Store_URL?: string;
  Status?: string;
  Last_Checked?: string;
};

export default function SellerInventory({
  seller,
  listings,
  purchases,
  matches,
}: {
  seller: Seller;
  listings: SellerListing[];
  purchases: ConfirmedPurchase[];
  matches: SellerMatch[];
}) {
  const [search, setSearch] =
    useState("");

  const [gradeCompany, setGradeCompany] =
    useState("all");

  const [sort, setSort] =
    useState("newest");

  const [selectedListing, setSelectedListing] =
    useState<SellerListing | null>(null);

  const matchStatusByListingId =
    useMemo(() => {
      const statusMap =
        new Map<
          string,
          "confirmed" | "possible"
        >();

      for (const match of matches) {
        const listingId =
          String(
            match.Listing_ID || ""
          ).trim();

        if (!listingId) {
          continue;
        }

        const reviewStatus =
          String(
            match.Review_Status || ""
          )
            .trim()
            .toLowerCase();

        /*
         * Confirmed matches always take
         * priority over every other status.
         */
        if (
          reviewStatus ===
            "confirmed match" ||
          reviewStatus ===
            "confirmed"
        ) {
          statusMap.set(
            listingId,
            "confirmed"
          );

          continue;
        }

        /*
         * Rejected matches should not
         * receive any special border.
         */
        if (
          reviewStatus ===
            "not a match"
        ) {
          continue;
        }

        /*
         * Any generated match that has
         * not been reviewed yet is a
         * possible match requiring review.
         */
        if (
          !statusMap.has(listingId)
        ) {
          statusMap.set(
            listingId,
            "possible"
          );
        }
      }

      return statusMap;
    }, [matches]);

  const gradeCompanies =
    useMemo(() => {
      return Array.from(
        new Set(
          listings
            .map((item) =>
              String(
                item.Grade_Company ||
                  ""
              ).trim()
            )
            .filter(Boolean)
        )
      ).sort();
    }, [listings]);

  const filteredListings =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        listings.filter(
          (listing) => {
            if (
              gradeCompany !==
                "all" &&
              String(
                listing.Grade_Company ||
                  ""
              ) !== gradeCompany
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            const searchable = [
              listing.Title,
              listing.Year,
              listing.Brand,
              listing.Set,
              listing.Player_First,
              listing.Player_Last,
              listing.Card_Number,
              listing.Parallel,
              listing.Serial_Number,
              listing.Grade_Company,
              listing.Grade,
              listing.Cert_Number,
              listing.eBay_Item_ID,
            ]
              .map((value) =>
                String(
                  value || ""
                ).toLowerCase()
              )
              .join(" ");

            return searchable.includes(
              query
            );
          }
        );

      result.sort((a, b) => {
        const aDate =
          new Date(
            a.eBay_Listing_Date ||
              a.First_Seen ||
              0
          ).getTime();

        const bDate =
          new Date(
            b.eBay_Listing_Date ||
              b.First_Seen ||
              0
          ).getTime();

        if (sort === "oldest") {
          return aDate - bDate;
        }

        if (sort === "title") {
          return String(
            a.Title || ""
          ).localeCompare(
            String(
              b.Title || ""
            )
          );
        }

        return bDate - aDate;
      });

      return result;
    }, [
      listings,
      search,
      gradeCompany,
      sort,
    ]);

  return (
    <>
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <a
            href="/admin/seller-tracker/sellers"
            className="text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            ← Monitored Sellers
          </a>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
                Seller Inventory
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {seller.Store_Name ||
                  seller.Username}
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                @{seller.Username} ·{" "}
                {listings.length.toLocaleString()}{" "}
                permanent listings captured
              </p>
            </div>

            {seller.Store_URL && (
              <a
                href={seller.Store_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                Open eBay Store
              </a>
            )}
          </div>

          <div className="mt-8 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-[1fr_190px_190px]">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search player, title, card #, cert, serial..."
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500"
            />

            <select
              value={gradeCompany}
              onChange={(event) =>
                setGradeCompany(
                  event.target.value
                )
              }
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="all">
                All Graders
              </option>

              {gradeCompanies.map(
                (company) => (
                  <option
                    key={company}
                    value={company}
                  >
                    {company}
                  </option>
                )
              )}
            </select>

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value
                )
              }
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="newest">
                Newest Listed
              </option>

              <option value="oldest">
                Oldest Listed
              </option>

              <option value="title">
                Title A–Z
              </option>
            </select>
          </div>

          <div className="mt-4 text-sm text-zinc-400">
            Showing{" "}
            <strong className="text-white">
              {filteredListings.length.toLocaleString()}
            </strong>{" "}
            of{" "}
            {listings.length.toLocaleString()}{" "}
            listings
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredListings.map((listing, index) => {
  const listingId =
    String(
      listing.Listing_ID || ""
    ).trim();

  const matchStatus =
    listingId
      ? matchStatusByListingId.get(
          listingId
        )
      : undefined;

  return (
    <ListingCard
      key={
        listing.Listing_ID ||
        listing.eBay_Item_ID ||
        index
      }
      listing={listing}
      matchStatus={matchStatus}
      onOpen={() =>
        setSelectedListing(listing)
      }
    />
  );
})}
          </div>

          {filteredListings.length ===
            0 && (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-400">
              No listings match your
              current search or filters.
            </div>
          )}
        </div>
      </main>

      {selectedListing && (
        <ListingCompareModal
          listing={selectedListing}
          purchases={purchases}
          onClose={() =>
            setSelectedListing(null)
          }
        />
      )}
    </>
  );
}

function ListingCard({
  listing,
  matchStatus,
  onOpen,
}: {
  listing: SellerListing;
  matchStatus?:
    | "confirmed"
    | "possible";
  onOpen: () => void;
}) {
  const player =
    [
      listing.Player_First,
      listing.Player_Last,
    ]
      .filter(Boolean)
      .join(" ");

  const listedDate =
    formatDate(
      listing.eBay_Listing_Date ||
        listing.First_Seen
    );

  return (
    <article
  onClick={onOpen}
  className={`cursor-pointer overflow-hidden rounded-xl border-2 bg-zinc-900 transition hover:bg-zinc-800/80 ${
    matchStatus === "confirmed"
      ? "border-red-500 hover:border-red-400"
      : matchStatus === "possible"
        ? "border-green-500 hover:border-green-400"
        : "border-zinc-800 hover:border-blue-600"
  }`}
>
      <div className="flex aspect-[4/3] items-center justify-center bg-zinc-950">
        {listing.Image_1 ? (
          <img
            src={listing.Image_1}
            alt={
              listing.Title ||
              "Seller listing"
            }
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-sm text-zinc-600">
            No image
          </span>
        )}
      </div>

      <div className="p-4">
        <h2 className="line-clamp-2 min-h-10 text-sm font-bold leading-5">
          {listing.Title ||
            "Untitled Listing"}
        </h2>

        <div className="mt-3 space-y-1 text-xs text-zinc-400">
          {player && (
            <Detail
              label="Player"
              value={player}
            />
          )}

          {listing.Card_Number && (
            <Detail
              label="Card"
              value={`#${listing.Card_Number}`}
            />
          )}

          {listing.Parallel && (
            <Detail
              label="Parallel"
              value={String(
                listing.Parallel
              )}
            />
          )}

          {listing.Serial_Number && (
            <Detail
              label="Serial"
              value={String(
                listing.Serial_Number
              )}
            />
          )}

          {(listing.Grade_Company ||
            listing.Grade) && (
            <Detail
              label="Grade"
              value={[
                listing.Grade_Company,
                listing.Grade,
              ]
                .filter(Boolean)
                .join(" ")}
            />
          )}

          {listing.Cert_Number && (
            <Detail
              label="Cert"
              value={String(
                listing.Cert_Number
              )}
            />
          )}

          <Detail
            label="Listed"
            value={listedDate}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            {listing.Price !==
              undefined &&
              listing.Price !== "" && (
                <p className="font-bold text-white">
                  {formatPrice(
                    listing.Price
                  )}
                </p>
              )}
          </div>

          {listing.Listing_URL && (
            <a
              href={
                listing.Listing_URL
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) =>
                event.stopPropagation()
              }
              className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
            >
              eBay
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function ListingCompareModal({
  listing,
  purchases,
  onClose,
}: {
  listing: SellerListing;
  purchases: ConfirmedPurchase[];
  onClose: () => void;
}) {
  const images = useMemo(
    () => getListingImages(listing),
    [listing]
  );

  const suggestedPurchases = useMemo(
    () =>
      purchases
        .map((purchase) => ({
          purchase,
          ...scorePurchaseForListing(
            listing,
            purchase
          ),
        }))
        .filter(
          (candidate) =>
            candidate.chronologyPossible &&
            candidate.isCandidate
        )
        .sort((a, b) => b.score - a.score),
    [listing, purchases]
  );

  const allPurchases = useMemo(
    () =>
      [...purchases].sort(
        (a, b) =>
          getDateTime(b.Purchase_Date) -
          getDateTime(a.Purchase_Date)
      ),
    [purchases]
  );

  const [
    showAllPurchases,
    setShowAllPurchases,
  ] = useState(false);

  const [
    selectedPurchase,
    setSelectedPurchase,
  ] = useState<ConfirmedPurchase | null>(
    null
  );

  const [
    activeImageIndex,
    setActiveImageIndex,
  ] = useState(0);

  const [
    purchaseImageIndex,
    setPurchaseImageIndex,
  ] = useState(0);

  const purchaseImages = useMemo(
    () =>
      selectedPurchase
        ? getPurchaseImages(
            selectedPurchase
          )
        : [],
    [selectedPurchase]
  );

  useEffect(() => {
    setActiveImageIndex(0);
    setPurchaseImageIndex(0);
    setSelectedPurchase(null);
    setShowAllPurchases(false);
  }, [listing]);

  useEffect(() => {
    setPurchaseImageIndex(0);
  }, [selectedPurchase]);

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  const player = [
    listing.Player_First,
    listing.Player_Last,
  ]
    .filter(Boolean)
    .join(" ");

  const activeImage =
    images[activeImageIndex];

  const activePurchaseImage =
    purchaseImages[
      purchaseImageIndex
    ];

  const visiblePurchases =
    showAllPurchases
      ? allPurchases
      : suggestedPurchases.map(
          (candidate) =>
            candidate.purchase
        );

  const selectedScore =
    selectedPurchase
      ? scorePurchaseForListing(
          listing,
          selectedPurchase
        )
      : null;

  function previousImage() {
    if (images.length <= 1) {
      return;
    }

    setActiveImageIndex(
      (current) =>
        current === 0
          ? images.length - 1
          : current - 1
    );
  }

  function nextImage() {
    if (images.length <= 1) {
      return;
    }

    setActiveImageIndex(
      (current) =>
        current ===
        images.length - 1
          ? 0
          : current + 1
    );
  }

  function previousPurchaseImage() {
    if (purchaseImages.length <= 1) {
      return;
    }

    setPurchaseImageIndex(
      (current) =>
        current === 0
          ? purchaseImages.length - 1
          : current - 1
    );
  }

  function nextPurchaseImage() {
    if (purchaseImages.length <= 1) {
      return;
    }

    setPurchaseImageIndex(
      (current) =>
        current ===
        purchaseImages.length - 1
          ? 0
          : current + 1
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-2 sm:p-4"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="relative flex max-h-[96vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
              Card Comparison
            </p>

            <p className="mt-1 max-w-4xl truncate text-sm font-semibold text-zinc-200">
              {listing.Title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xl text-zinc-300 hover:bg-zinc-800 hover:text-white"
            aria-label="Close comparison"
          >
            ×
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
          {/* SELLER LISTING */}
          <section className="min-h-0 border-b border-zinc-800 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">
                  Seller Listing
                </h2>

                <span className="rounded-full border border-blue-900 bg-blue-950/60 px-3 py-1 text-xs font-bold text-blue-300">
                  LISTING
                </span>
              </div>

              <ZoomPanImageViewer
                src={activeImage}
                alt={
                  listing.Title ||
                  "Seller listing"
                }
                entityType="listing"
                sellerId={listing.Seller_ID}
                recordId={listing.Listing_ID}
                hasPrevious={
                  images.length > 1
                }
                hasNext={
                  images.length > 1
                }
                onPrevious={
                  previousImage
                }
                onNext={nextImage}
              />

              {images.length > 1 && (
                <ImageThumbnails
                  images={images}
                  activeIndex={
                    activeImageIndex
                  }
                  onSelect={
                    setActiveImageIndex
                  }
                  label="Listing image"
                />
              )}

              <div className="mt-6">
                <h3 className="text-lg font-bold leading-snug">
                  {listing.Title ||
                    "Untitled Listing"}
                </h3>

                <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <ModalDetail
                    label="Year"
                    value={listing.Year}
                  />
                  <ModalDetail
                    label="Brand"
                    value={listing.Brand}
                  />
                  <ModalDetail
                    label="Set"
                    value={listing.Set}
                  />
                  <ModalDetail
                    label="Player"
                    value={player}
                  />
                  <ModalDetail
                    label="Card Number"
                    value={
                      listing.Card_Number
                        ? `#${listing.Card_Number}`
                        : ""
                    }
                  />
                  <ModalDetail
                    label="Parallel"
                    value={
                      listing.Parallel
                    }
                  />
                  <ModalDetail
                    label="Serial Number"
                    value={
                      listing.Serial_Number
                    }
                  />
                  <ModalDetail
                    label="Grade"
                    value={[
                      listing.Grade_Company,
                      listing.Grade,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                  <ModalDetail
                    label="Cert Number"
                    value={
                      listing.Cert_Number
                    }
                  />
                  <ModalDetail
                    label="Price"
                    value={
                      listing.Price !==
                        undefined &&
                      listing.Price !== ""
                        ? formatPrice(
                            listing.Price
                          )
                        : ""
                    }
                  />
                  <ModalDetail
                    label="eBay Listing Date"
                    value={formatDateTime(
                      listing.eBay_Listing_Date
                    )}
                  />
                  <ModalDetail
                    label="First Captured"
                    value={formatDateTime(
                      listing.First_Seen
                    )}
                  />
                  <ModalDetail
                    label="eBay Item"
                    value={
                      listing.eBay_Item_ID
                    }
                  />
                  <ModalDetail
                    label="Status"
                    value={listing.Status}
                  />
                </div>

                {listing.Description && (
                  <div className="mt-5 border-t border-zinc-800 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Description
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {listing.Description}
                    </p>
                  </div>
                )}

                {listing.Listing_URL && (
                  <a
                    href={
                      listing.Listing_URL
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
                  >
                    Open Original eBay Listing
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* PURCHASE COMPARISON */}
          <section className="min-h-[500px] bg-zinc-900/40 lg:min-h-0 lg:overflow-y-auto">
            <div className="flex min-h-full flex-col p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Purchase Comparison
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    {suggestedPurchases.length} suggested ·{" "}
                    {purchases.length} total purchases
                  </p>
                </div>

                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-400">
                  PURCHASE
                </span>
              </div>

              {!selectedPurchase ? (
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div>
                      <p className="text-sm font-bold text-zinc-200">
                        {showAllPurchases
                          ? "All Confirmed Purchases"
                          : "Suggested Purchases"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        Suggestions require compatible metadata and chronology.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowAllPurchases(
                          (current) =>
                            !current
                        )
                      }
                      className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
                    >
                      {showAllPurchases
                        ? "Show Suggested"
                        : "Show All Purchases"}
                    </button>
                  </div>

                  {visiblePurchases.length >
                  0 ? (
                    <div className="space-y-3">
                      {visiblePurchases.map(
                        (purchase) => {
                          const score =
                            scorePurchaseForListing(
                              listing,
                              purchase
                            );

                          return (
                            <button
                              key={
                                purchase.Purchase_ID ||
                                purchase.Source_URL ||
                                purchase.Title
                              }
                              type="button"
                              onClick={() =>
                                setSelectedPurchase(
                                  purchase
                                )
                              }
                              className="flex w-full gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left transition hover:border-blue-600 hover:bg-zinc-900"
                            >
                              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black">
                                {purchase.Image_1 ? (
                                  <img
                                    src={
                                      purchase.Image_1
                                    }
                                    alt={
                                      purchase.Title ||
                                      "Confirmed purchase"
                                    }
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <span className="text-xs text-zinc-600">
                                    No image
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-bold text-white">
                                  {purchase.Title ||
                                    "Untitled Purchase"}
                                </p>

                                <p className="mt-2 text-xs text-zinc-400">
                                  Purchased:{" "}
                                  {formatDate(
                                    purchase.Purchase_Date
                                  )}
                                </p>

                                {purchase.Purchase_Price !==
                                  undefined &&
                                  purchase.Purchase_Price !==
                                    "" && (
                                  <p className="mt-1 text-xs text-zinc-400">
                                    Price:{" "}
                                    {formatPrice(
                                      purchase.Purchase_Price
                                    )}
                                  </p>
                                )}

                                {!showAllPurchases && (
                                  <p className="mt-2 text-xs font-semibold text-blue-300">
                                    Metadata score:{" "}
                                    {score.score}
                                  </p>
                                )}

                                {showAllPurchases &&
                                  !score.chronologyPossible && (
                                    <p className="mt-2 text-xs font-semibold text-amber-400">
                                      Chronology conflict — purchase is after listing date
                                    </p>
                                  )}
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-[350px] items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 p-8 text-center">
                      <div className="max-w-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-2xl text-zinc-500">
                          ↔
                        </div>

                        <h3 className="mt-4 text-lg font-bold">
                          {purchases.length === 0
                            ? "No Confirmed Purchases"
                            : "No Suggested Purchases"}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {purchases.length === 0
                            ? "There are no confirmed purchases saved for this seller yet."
                            : "No purchase passes both the metadata and chronology checks for this listing."}
                        </p>

                        {purchases.length >
                          0 &&
                          !showAllPurchases && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllPurchases(
                                  true
                                )
                              }
                              className="mt-5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-zinc-200 hover:bg-zinc-800"
                            >
                              Show All Purchases
                            </button>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPurchase(
                          null
                        )
                      }
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
                    >
                      ← Choose Another Purchase
                    </button>

                    {selectedScore &&
                      !selectedScore.chronologyPossible && (
                        <span className="rounded-full border border-amber-900 bg-amber-950/60 px-3 py-1 text-xs font-bold text-amber-300">
                          CHRONOLOGY CONFLICT
                        </span>
                      )}
                  </div>

                  <ZoomPanImageViewer
                    src={
                      activePurchaseImage
                    }
                    alt={
                      selectedPurchase.Title ||
                      "Confirmed purchase"
                    }
                    entityType="purchase"
                    sellerId={
                      selectedPurchase.Seller_ID
                    }
                    recordId={
                      selectedPurchase.Purchase_ID
                    }
                    hasPrevious={
                      purchaseImages.length >
                      1
                    }
                    hasNext={
                      purchaseImages.length >
                      1
                    }
                    onPrevious={
                      previousPurchaseImage
                    }
                    onNext={
                      nextPurchaseImage
                    }
                  />

                  {purchaseImages.length >
                    1 && (
                    <ImageThumbnails
                      images={
                        purchaseImages
                      }
                      activeIndex={
                        purchaseImageIndex
                      }
                      onSelect={
                        setPurchaseImageIndex
                      }
                      label="Purchase image"
                    />
                  )}

                  <div className="mt-6">
                    <h3 className="text-lg font-bold leading-snug">
                      {selectedPurchase.Title ||
                        "Untitled Purchase"}
                    </h3>

                    {selectedScore && (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                            Comparison
                          </p>

                          <span className="text-sm font-bold text-blue-300">
                            Score{" "}
                            {selectedScore.score}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-zinc-300">
                          {selectedScore.reasons.length
                            ? selectedScore.reasons.join(
                                " · "
                              )
                            : "No matching metadata fields."}
                        </p>

                        <p
                          className={`mt-2 text-sm font-semibold ${
                            selectedScore.chronologyPossible
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          {selectedScore.chronologyPossible
                            ? "Chronology possible"
                            : "Chronology conflict: this purchase occurred after the seller listing was created."}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      <ModalDetail
                        label="Purchase Date"
                        value={formatDateTime(
                          selectedPurchase.Purchase_Date
                        )}
                      />
                      <ModalDetail
                        label="Purchase Price"
                        value={
                          selectedPurchase.Purchase_Price !==
                            undefined &&
                          selectedPurchase.Purchase_Price !==
                            ""
                            ? formatPrice(
                                selectedPurchase.Purchase_Price
                              )
                            : ""
                        }
                      />
                      <ModalDetail
                        label="Year"
                        value={
                          selectedPurchase.Year
                        }
                      />
                      <ModalDetail
                        label="Brand"
                        value={
                          selectedPurchase.Brand
                        }
                      />
                      <ModalDetail
                        label="Set"
                        value={
                          selectedPurchase.Set
                        }
                      />
                      <ModalDetail
                        label="Player"
                        value={[
                          selectedPurchase.Player_First,
                          selectedPurchase.Player_Last,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                      <ModalDetail
                        label="Card Number"
                        value={
                          selectedPurchase.Card_Number
                            ? `#${selectedPurchase.Card_Number}`
                            : ""
                        }
                      />
                      <ModalDetail
                        label="Parallel"
                        value={
                          selectedPurchase.Parallel
                        }
                      />
                      <ModalDetail
                        label="Serial Number"
                        value={
                          selectedPurchase.Serial_Number
                        }
                      />
                      <ModalDetail
                        label="Grade"
                        value={[
                          selectedPurchase.Grade_Company,
                          selectedPurchase.Grade,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                      <ModalDetail
                        label="Cert Number"
                        value={
                          selectedPurchase.Cert_Number
                        }
                      />
                      <ModalDetail
                        label="Match Status"
                        value={
                          selectedPurchase.Match_Status
                        }
                      />
                    </div>

                    {selectedPurchase.Description && (
                      <div className="mt-5 border-t border-zinc-800 pt-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Description
                        </p>

                        <div
                          className="mt-2 text-sm leading-6 text-zinc-300"
                          dangerouslySetInnerHTML={{
                            __html:
                              selectedPurchase.Description,
                          }}
                        />
                      </div>
                    )}

                    {selectedPurchase.Source_URL && (
                      <a
                        href={
                          selectedPurchase.Source_URL
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
                      >
                        Open Original Purchase
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ZoomPanImageViewer({
  src,
  alt,
  entityType,
  sellerId,
  recordId,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: {
  src?: string;
  alt: string;
  entityType: "listing" | "purchase";
  sellerId?: string;
  recordId?: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  type Point = { x: number; y: number };
  type MarkupColor =
    | "yellow"
    | "red"
    | "blue";
  type Markup =
    | {
        type: "draw";
        points: Point[];
        color: MarkupColor;
      }
    | {
        type: "circle";
        start: Point;
        end: Point;
        color: MarkupColor;
      };

  const MARKUP_COLORS: Record<
    MarkupColor,
    string
  > = {
    yellow: "#facc15",
    red: "#ef4444",
    blue: "#3b82f6",
  };

  const viewerRef =
    useRef<HTMLDivElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({
    x: 0,
    y: 0,
  });
  const [dragging, setDragging] =
    useState(false);
  const [dragStart, setDragStart] =
    useState({
      x: 0,
      y: 0,
      panX: 0,
      panY: 0,
    });

  const [tool, setTool] =
    useState<
      "pan" | "draw" | "circle"
    >("pan");

  const [markupColor, setMarkupColor] =
    useState<MarkupColor>("yellow");

  const [markups, setMarkups] =
    useState<Markup[]>([]);

  const [activeMarkup, setActiveMarkup] =
    useState<Markup | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [saveMessage, setSaveMessage] =
    useState("");

  const [saveError, setSaveError] =
    useState("");

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDragging(false);
    setTool("pan");
    setMarkups([]);
    setActiveMarkup(null);
    setSaveMessage("");
    setSaveError("");
  }, [src]);

  function changeZoom(nextZoom: number) {
    const clamped = Math.min(
      5,
      Math.max(
        1,
        Math.round(nextZoom * 4) / 4
      )
    );

    setZoom(clamped);

    if (clamped === 1) {
      setPan({ x: 0, y: 0 });
      setDragging(false);
    }
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDragging(false);
  }

  useEffect(() => {
    const viewer =
      viewerRef.current;

    if (!viewer || !src) {
      return;
    }

    const handleNativeWheel = (
      event: WheelEvent
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const direction =
        event.deltaY < 0
          ? 0.25
          : -0.25;

      setZoom((currentZoom) => {
        const nextZoom =
          currentZoom + direction;

        const clamped = Math.min(
          5,
          Math.max(
            1,
            Math.round(
              nextZoom * 4
            ) / 4
          )
        );

        if (clamped === 1) {
          setPan({
            x: 0,
            y: 0,
          });
          setDragging(false);
        }

        return clamped;
      });
    };

    viewer.addEventListener(
      "wheel",
      handleNativeWheel,
      {
        passive: false,
      }
    );

    return () => {
      viewer.removeEventListener(
        "wheel",
        handleNativeWheel
      );
    };
  }, [src]);


  function getMarkupPoint(
    event: ReactPointerEvent<HTMLDivElement>
  ): Point {
    const target =
      event.currentTarget.querySelector(
        "[data-markup-surface]"
      ) as HTMLElement | null;

    if (!target) {
      return { x: 0, y: 0 };
    }

    const rect =
      target.getBoundingClientRect();

    return {
      x:
        ((event.clientX - rect.left) /
          rect.width) *
        1000,
      y:
        ((event.clientY - rect.top) /
          rect.height) *
        1000,
    };
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (!src) {
      return;
    }

    if (
      (event.target as HTMLElement).closest(
        "button"
      )
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    const wantsPan =
      event.button === 2 ||
      tool === "pan";

    if (wantsPan) {
      if (zoom <= 1) {
        return;
      }

      setDragging(true);

      setDragStart({
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      });

      return;
    }

    if (
      event.button === 0 &&
      tool === "draw"
    ) {
      const point =
        getMarkupPoint(event);

      setActiveMarkup({
        type: "draw",
        points: [point],
        color: markupColor,
      });
      return;
    }

    if (
      event.button === 0 &&
      tool === "circle"
    ) {
      const point =
        getMarkupPoint(event);

      setActiveMarkup({
        type: "circle",
        start: point,
        end: point,
        color: markupColor,
      });
    }
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (
      tool === "draw" &&
      activeMarkup?.type === "draw"
    ) {
      const point =
        getMarkupPoint(event);

      setActiveMarkup({
        ...activeMarkup,
        points: [
          ...activeMarkup.points,
          point,
        ],
      });
      return;
    }

    if (
      tool === "circle" &&
      activeMarkup?.type === "circle"
    ) {
      setActiveMarkup({
        ...activeMarkup,
        end: getMarkupPoint(event),
      });
      return;
    }

    if (!dragging) {
      return;
    }

    setPan({
      x:
        dragStart.panX +
        event.clientX -
        dragStart.x,
      y:
        dragStart.panY +
        event.clientY -
        dragStart.y,
    });
  }

  function handlePointerUp(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    if (activeMarkup) {
      setMarkups((current) => [
        ...current,
        activeMarkup,
      ]);
      setActiveMarkup(null);
    }

    setDragging(false);
  }

  function clearMarkup() {
    setMarkups([]);
    setActiveMarkup(null);
    setSaveMessage("");
    setSaveError("");
  }

  function renderMarkup(
    markup: Markup,
    key: string
  ) {
    const stroke =
      MARKUP_COLORS[markup.color];

    if (markup.type === "draw") {
      const points =
        markup.points
          .map(
            (point) =>
              `${point.x},${point.y}`
          )
          .join(" ");

      return (
        <polyline
          key={key}
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    const x =
      Math.min(
        markup.start.x,
        markup.end.x
      );

    const y =
      Math.min(
        markup.start.y,
        markup.end.y
      );

    const width =
      Math.abs(
        markup.end.x -
          markup.start.x
      );

    const height =
      Math.abs(
        markup.end.y -
          markup.start.y
      );

    return (
      <ellipse
        key={key}
        cx={x + width / 2}
        cy={y + height / 2}
        rx={width / 2}
        ry={height / 2}
        fill="none"
        stroke={stroke}
        strokeWidth="8"
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  async function loadImageForSave(
    imageUrl: string
  ) {
    return new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const image = new Image();

        image.crossOrigin =
          "anonymous";

        image.onload = () =>
          resolve(image);

        image.onerror = () =>
          reject(
            new Error(
              "The archived image could not be loaded for saving."
            )
          );

        image.src = imageUrl;
      }
    );
  }

  async function buildMarkupPng() {
    if (!src) {
      throw new Error(
        "There is no image to save."
      );
    }

    const image =
      await loadImageForSave(src);

    const width =
      image.naturalWidth ||
      image.width;

    const height =
      image.naturalHeight ||
      image.height;

    if (!width || !height) {
      throw new Error(
        "The image dimensions could not be determined."
      );
    }

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Your browser could not create the markup image."
      );
    }

    context.drawImage(
      image,
      0,
      0,
      width,
      height
    );

    const scaleX =
      width / 1000;

    const scaleY =
      height / 1000;

    const lineWidth =
      Math.max(
        4,
        Math.min(
          width,
          height
        ) / 125
      );

    for (const markup of markups) {
      context.save();

      context.strokeStyle =
        MARKUP_COLORS[
          markup.color
        ];

      context.lineWidth =
        lineWidth;

      context.lineCap =
        "round";

      context.lineJoin =
        "round";

      if (
        markup.type === "draw"
      ) {
        if (
          markup.points.length >
          0
        ) {
          context.beginPath();

          context.moveTo(
            markup.points[0].x *
              scaleX,
            markup.points[0].y *
              scaleY
          );

          for (
            let i = 1;
            i <
            markup.points.length;
            i++
          ) {
            context.lineTo(
              markup.points[i].x *
                scaleX,
              markup.points[i].y *
                scaleY
            );
          }

          context.stroke();
        }
      } else {
        const startX =
          markup.start.x *
          scaleX;

        const startY =
          markup.start.y *
          scaleY;

        const endX =
          markup.end.x *
          scaleX;

        const endY =
          markup.end.y *
          scaleY;

        const centerX =
          (startX + endX) / 2;

        const centerY =
          (startY + endY) / 2;

        const radiusX =
          Math.abs(
            endX - startX
          ) / 2;

        const radiusY =
          Math.abs(
            endY - startY
          ) / 2;

        if (
          radiusX > 0 &&
          radiusY > 0
        ) {
          context.beginPath();

          context.ellipse(
            centerX,
            centerY,
            radiusX,
            radiusY,
            0,
            0,
            Math.PI * 2
          );

          context.stroke();
        }
      }

      context.restore();
    }

    try {
      return canvas.toDataURL(
        "image/png"
      );
    } catch {
      throw new Error(
        "The browser blocked saving this archived image because of image security settings."
      );
    }
  }

  async function saveMarkup() {
    if (
      !src ||
      !sellerId ||
      !recordId ||
      markups.length === 0 ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const imageData =
        await buildMarkupPng();

      const response =
        await fetch(
          "/api/seller-tracker",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "saveMarkup",
              entityType,
              sellerId,
              recordId,
              imageData,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            "Unable to save markup."
        );
      }

      setSaveMessage(
        "Markup saved as a new image."
      );

      setTool("pan");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save markup."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2">
        <button
          type="button"
          onClick={() =>
            changeZoom(
              zoom - 0.25
            )
          }
          disabled={
            !src ||
            zoom <= 1 ||
            saving
          }
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-lg font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Zoom out"
        >
          −
        </button>

        <div className="min-w-[64px] text-center text-xs font-bold text-zinc-300">
          {Math.round(
            zoom * 100
          )}
          %
        </div>

        <button
          type="button"
          onClick={() =>
            changeZoom(
              zoom + 0.25
            )
          }
          disabled={
            !src ||
            zoom >= 5 ||
            saving
          }
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-lg font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Zoom in"
        >
          +
        </button>

        <button
          type="button"
          onClick={resetView}
          disabled={
            !src ||
            saving
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>

        <div className="mx-1 h-6 w-px bg-zinc-700" />

        <button
          type="button"
          onClick={() =>
            setTool(
              tool === "draw"
                ? "pan"
                : "draw"
            )
          }
          disabled={
            !src ||
            saving
          }
          className={`rounded-lg border px-3 py-2 text-xs font-bold ${
            tool === "draw"
              ? "border-blue-500 bg-blue-950 text-blue-200"
              : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Draw
        </button>

        <button
          type="button"
          onClick={() =>
            setTool(
              tool === "circle"
                ? "pan"
                : "circle"
            )
          }
          disabled={
            !src ||
            saving
          }
          className={`rounded-lg border px-3 py-2 text-xs font-bold ${
            tool === "circle"
              ? "border-blue-500 bg-blue-950 text-blue-200"
              : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Circle
        </button>

        <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1">
          {(
            [
              [
                "yellow",
                "#facc15",
                "Yellow — matching feature",
              ],
              [
                "red",
                "#ef4444",
                "Red — changed feature",
              ],
              [
                "blue",
                "#3b82f6",
                "Blue — general note",
              ],
            ] as const
          ).map(
            ([
              color,
              hex,
              label,
            ]) => (
              <button
                key={color}
                type="button"
                onClick={() =>
                  setMarkupColor(
                    color
                  )
                }
                disabled={
                  !src ||
                  saving
                }
                title={label}
                aria-label={label}
                className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                  markupColor ===
                  color
                    ? "border-white ring-2 ring-white/40"
                    : "border-zinc-600"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span
                  className="h-4 w-4 rounded-full border border-black/30"
                  style={{
                    backgroundColor:
                      hex,
                  }}
                />
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={clearMarkup}
          disabled={
            !src ||
            saving ||
            (markups.length === 0 &&
              !activeMarkup)
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={saveMarkup}
          disabled={
            !src ||
            !sellerId ||
            !recordId ||
            saving ||
            markups.length === 0
          }
          className="rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "Saving..."
            : "Save Markup"}
        </button>

        <p className="ml-auto hidden text-xs text-zinc-600 sm:block">
          {tool === "pan"
            ? "Wheel to zoom · Left-drag to pan when zoomed"
            : tool === "draw"
              ? "Left-drag to draw · Wheel to zoom · Right-drag to pan"
              : "Left-drag to circle · Wheel to zoom · Right-drag to pan"}
        </p>
      </div>

      {(saveMessage ||
        saveError) && (
        <div
          className={`mb-3 rounded-lg border px-3 py-2 text-xs font-semibold ${
            saveError
              ? "border-red-900 bg-red-950/60 text-red-300"
              : "border-emerald-900 bg-emerald-950/60 text-emerald-300"
          }`}
        >
          {saveError ||
            saveMessage}
        </div>
      )}

      <div
        ref={viewerRef}
        className={`relative flex min-h-[350px] touch-none items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-black sm:min-h-[500px] ${
          tool === "pan" &&
          zoom > 1
            ? dragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : tool !== "pan"
              ? "cursor-crosshair"
              : ""
        }`}
        onContextMenu={(event) =>
          event.preventDefault()
        }
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerUp
        }
        onPointerCancel={
          handlePointerUp
        }
      >
        {isMarkupImage(src) && (
          <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md border border-amber-400/70 bg-black/85 px-2 py-1 text-[10px] font-bold tracking-[0.18em] text-amber-300">
            MARKUP
          </div>
        )}

        {src ? (
          <div
            data-markup-surface
            className="relative inline-block"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin:
                "center center",
              transition:
                dragging ||
                activeMarkup
                  ? "none"
                  : "transform 120ms ease-out",
            }}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="block max-h-[62vh] max-w-full select-none object-contain"
            />

            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {markups.map(
                (
                  markup,
                  index
                ) =>
                  renderMarkup(
                    markup,
                    `markup-${index}`
                  )
              )}

              {activeMarkup &&
                renderMarkup(
                  activeMarkup,
                  "active-markup"
                )}
            </svg>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            No archived image
          </p>
        )}

        {hasPrevious && (
          <button
            type="button"
            onPointerDown={(
              event
            ) =>
              event.stopPropagation()
            }
            onClick={onPrevious}
            disabled={saving}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black/75 text-2xl text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous image"
          >
            ‹
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onPointerDown={(
              event
            ) =>
              event.stopPropagation()
            }
            onClick={onNext}
            disabled={saving}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black/75 text-2xl text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next image"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}

function isMarkupImage(
  image?: string
) {
  return Boolean(
    image &&
      /\/markup-[^/]+\.png(?:\?|$)/i.test(
        image
      )
  );
}

function ImageThumbnails({
  images,
  activeIndex,
  onSelect,
  label,
}: {
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  label: string;
}) {
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
      {images.map(
        (image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() =>
              onSelect(index)
            }
            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-black ${
              activeIndex === index
                ? "border-blue-500 ring-1 ring-blue-500"
                : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <img
              src={image}
              alt={`${label} ${index + 1}`}
              className="h-full w-full object-contain"
            />
            {isMarkupImage(image) && (
              <span className="absolute bottom-1 left-1 rounded border border-amber-400/70 bg-black/85 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-300">
                MARKUP
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}

function getPurchaseImages(
  purchase: ConfirmedPurchase
) {
  const images: string[] = [];

  if (purchase.Notes) {
    try {
      const notes =
        JSON.parse(
          purchase.Notes
        );

      if (
        Array.isArray(
          notes?.cloudImageUrls
        )
      ) {
        for (
          const value of
          notes.cloudImageUrls
        ) {
          if (
            typeof value ===
              "string" &&
            value.trim()
          ) {
            images.push(
              value.trim()
            );
          }
        }
      }
    } catch {
      // Fall back to Image_1 through Image_4.
    }
  }

  const fallbackImages = [
    purchase.Image_1,
    purchase.Image_2,
    purchase.Image_3,
    purchase.Image_4,
  ];

  for (
    const image of fallbackImages
  ) {
    if (
      image &&
      !images.includes(image)
    ) {
      images.push(image);
    }
  }

  return images;
}

function scorePurchaseForListing(
  listing: SellerListing,
  purchase: ConfirmedPurchase
) {
  const reasons: string[] = [];
  let score = 0;

  const sameCert =
    sameValue(
      listing.Cert_Number,
      purchase.Cert_Number
    ) &&
    hasValue(
      listing.Cert_Number
    ) &&
    hasValue(
      purchase.Cert_Number
    );

  const sameSerial =
    sameValue(
      listing.Serial_Number,
      purchase.Serial_Number
    ) &&
    hasValue(
      listing.Serial_Number
    ) &&
    hasValue(
      purchase.Serial_Number
    );

  const sameYear =
    sameValue(
      listing.Year,
      purchase.Year
    );

  const samePlayer =
    sameValue(
      `${listing.Player_First || ""} ${listing.Player_Last || ""}`,
      `${purchase.Player_First || ""} ${purchase.Player_Last || ""}`
    );

  const sameCard =
    sameValue(
      listing.Card_Number,
      purchase.Card_Number
    );

  const sameSet =
    sameValue(
      listing.Set,
      purchase.Set
    );

  const sameBrand =
    sameValue(
      listing.Brand,
      purchase.Brand
    );

  const sameParallel =
    hasValue(
      listing.Parallel
    ) &&
    hasValue(
      purchase.Parallel
    ) &&
    sameValue(
      listing.Parallel,
      purchase.Parallel
    );

  if (sameCert) {
    score += 100;
    reasons.push("Exact cert");
  }

  if (sameSerial) {
    score += 80;
    reasons.push("Exact serial");
  }

  if (sameYear) {
    score += 15;
    reasons.push("Same year");
  }

  if (samePlayer) {
    score += 25;
    reasons.push("Same player");
  }

  if (sameCard) {
    score += 25;
    reasons.push("Same card #");
  }

  if (sameSet) {
    score += 20;
    reasons.push("Same set");
  } else if (sameBrand) {
    score += 10;
    reasons.push("Same brand");
  }

  if (sameParallel) {
    score += 10;
    reasons.push("Same parallel");
  }

  const titleSimilarity =
    getTitleSimilarity(
      listing.Title,
      purchase.Title
    );

  if (titleSimilarity >= 0.7) {
    score += 15;
    reasons.push("Strong title similarity");
  } else if (
    titleSimilarity >= 0.5
  ) {
    score += 8;
    reasons.push("Title similarity");
  }

  const isCandidate =
    sameCert ||
    sameSerial ||
    (
      sameYear &&
      samePlayer &&
      sameCard &&
      (sameSet || sameBrand)
    );

  const chronologyPossible =
    isChronologyPossible(
      listing,
      purchase
    );

  return {
    score,
    reasons,
    isCandidate,
    chronologyPossible,
  };
}

function isChronologyPossible(
  listing: SellerListing,
  purchase: ConfirmedPurchase
) {
  const listingDate =
    getDateTime(
      listing.eBay_Listing_Date ||
      listing.First_Seen
    );

  const purchaseDate =
    getDateTime(
      purchase.Purchase_Date
    );

  /*
   * If either date is unavailable, do not
   * hard-exclude it. This mirrors the
   * backend matching behavior.
   */
  if (
    !listingDate ||
    !purchaseDate
  ) {
    return true;
  }

  return (
    purchaseDate <= listingDate
  );
}

function hasValue(
  value: unknown
) {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
}

function normalizeValue(
  value: unknown
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sameValue(
  a: unknown,
  b: unknown
) {
  const first =
    normalizeValue(a);

  const second =
    normalizeValue(b);

  return (
    first !== "" &&
    second !== "" &&
    first === second
  );
}

function getTitleSimilarity(
  a?: string,
  b?: string
) {
  const first =
    titleTokens(a);

  const second =
    titleTokens(b);

  if (
    first.size === 0 ||
    second.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (const token of first) {
    if (second.has(token)) {
      intersection += 1;
    }
  }

  const union =
    new Set([
      ...first,
      ...second,
    ]).size;

  return union
    ? intersection / union
    : 0;
}

function titleTokens(
  value?: string
) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        " "
      )
      .split(/\s+/)
      .filter(
        (token) =>
          token.length > 1
      )
  );
}

function getDateTime(
  value?: string
) {
  if (!value) {
    return 0;
  }

  const time =
    new Date(value).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
}

function getListingImages(
  listing: SellerListing
) {
  const images: string[] = [];

  if (
    listing.Cloud_Image_URLs_JSON
  ) {
    try {
      const parsed =
        JSON.parse(
          listing.Cloud_Image_URLs_JSON
        );

      if (
        Array.isArray(parsed)
      ) {
        for (
          const value of parsed
        ) {
          if (
            typeof value ===
              "string" &&
            value.trim()
          ) {
            images.push(
              value.trim()
            );
          }
        }
      }
    } catch {
      // Fall back to Image_1 through Image_4.
    }
  }

  const fallbackImages = [
    listing.Image_1,
    listing.Image_2,
    listing.Image_3,
    listing.Image_4,
  ];

  for (
    const image of fallbackImages
  ) {
    if (
      image &&
      !images.includes(image)
    ) {
      images.push(image);
    }
  }

  return images;
}

function ModalDetail({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-zinc-200">
        {value ===
          undefined ||
        value === ""
          ? "—"
          : String(value)}
      </p>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <p>
      <span className="text-zinc-600">
        {label}:
      </span>{" "}
      <span className="text-zinc-300">
        {value}
      </span>
    </p>
  );
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

function formatDateTime(
  value?: string
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

function formatPrice(
  value: string | number
) {
  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
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