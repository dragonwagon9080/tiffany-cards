"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AddSellerResponse = {
  ok?: boolean;
  error?: string;
  sellerId?: string;
  username?: string;
  platform?: string;
  storeName?: string;
  storeUrl?: string;
  profileUrl?: string;
  row?: number;
};

function extractEbayUsername(
  value: string
) {
  const text = value.trim();

  if (!text) {
    return "";
  }

  /*
   * Plain username.
   */
  if (
    !text.includes("/") &&
    !text.includes(".com")
  ) {
    return text;
  }

  /*
   * Standard eBay profile URL:
   *
   * https://www.ebay.com/usr/4corners_treasures
   */
  const profileMatch =
    text.match(
      /ebay\.com\/usr\/([^/?#]+)/i
    );

  if (
    profileMatch &&
    profileMatch[1]
  ) {
    try {
      return decodeURIComponent(
        profileMatch[1]
      ).trim();
    } catch {
      return profileMatch[1].trim();
    }
  }

  return "";
}

function suggestSellerId(
  username: string
) {
  return username
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9_-]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    );
}

export default function AddSellerPage() {
  const router = useRouter();

  const [sellerInput, setSellerInput] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [sellerId, setSellerId] =
    useState("");

  const [storeName, setStoreName] =
    useState("");

  const [storeUrl, setStoreUrl] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [sellerIdEdited, setSellerIdEdited] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const detectedUsername =
    useMemo(
      () =>
        extractEbayUsername(
          sellerInput
        ),
      [sellerInput]
    );

  function handleSellerInput(
    value: string
  ) {
    setSellerInput(value);
    setError("");

    const detected =
      extractEbayUsername(value);

    setUsername(detected);

    if (
      detected &&
      !sellerIdEdited
    ) {
      setSellerId(
        suggestSellerId(detected)
      );
    }

    if (
      !detected &&
      !sellerIdEdited
    ) {
      setSellerId("");
    }
  }

  function handleUsername(
    value: string
  ) {
    setUsername(value);
    setError("");

    if (!sellerIdEdited) {
      setSellerId(
        suggestSellerId(value)
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanUsername =
      username.trim();

    const cleanSellerId =
      sellerId
        .trim()
        .toLowerCase();

    if (!cleanUsername) {
      setError(
        "Enter a valid eBay username or eBay profile URL."
      );
      return;
    }

    if (!cleanSellerId) {
      setError(
        "Seller ID is required."
      );
      return;
    }

    if (
      !/^[a-z0-9_-]+$/.test(
        cleanSellerId
      )
    ) {
      setError(
        "Seller ID may contain only lowercase letters, numbers, underscores, and hyphens."
      );
      return;
    }

    const profileUrl =
      `https://www.ebay.com/usr/${encodeURIComponent(
        cleanUsername
      )}`;

    setSubmitting(true);

    try {
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
              action:
                "addSeller",

              sellerId:
                cleanSellerId,

              username:
                cleanUsername,

              storeName:
                storeName.trim(),

              storeUrl:
                storeUrl.trim(),

              profileUrl,

              notes:
                notes.trim(),
            }),
          }
        );

      const data =
        (await response.json()) as
          AddSellerResponse;

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ||
            "Unable to add seller."
        );
      }

      router.push(
        `/admin/seller-tracker/sellers/${encodeURIComponent(
          cleanSellerId
        )}`
      );

      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to add seller."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              Seller Tracker
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Add Seller
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Add a new eBay seller to the
              monitored seller database.
            </p>
          </div>

          <Link
            href="/admin/seller-tracker/sellers"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            ← Back to Sellers
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
        >
          <div className="border-b border-zinc-800 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-semibold">
              eBay Seller
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Start with the seller&apos;s
              eBay profile URL or username.
            </p>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div>
              <label
                htmlFor="sellerInput"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                eBay Seller URL or Username
              </label>

              <input
                id="sellerInput"
                type="text"
                value={sellerInput}
                onChange={(event) =>
                  handleSellerInput(
                    event.target.value
                  )
                }
                placeholder="https://www.ebay.com/usr/4corners_treasures"
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500"
              />

              {sellerInput &&
                !detectedUsername && (
                  <p className="mt-2 text-sm text-amber-400">
                    I could not detect an
                    eBay username from that
                    URL. You can enter the
                    username manually below.
                  </p>
                )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >
                  eBay Username
                </label>

                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) =>
                    handleUsername(
                      event.target.value
                    )
                  }
                  placeholder="4corners_treasures"
                  autoComplete="off"
                  className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="sellerId"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >
                  Seller ID
                </label>

                <input
                  id="sellerId"
                  type="text"
                  value={sellerId}
                  onChange={(event) => {
                    setSellerIdEdited(
                      true
                    );

                    setSellerId(
                      event.target.value
                        .toLowerCase()
                    );

                    setError("");
                  }}
                  placeholder="4corners"
                  autoComplete="off"
                  className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 font-mono text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  Internal permanent ID. You
                  can shorten the suggested
                  value before adding the
                  seller.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="storeName"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Store Name
                <span className="ml-2 font-normal text-zinc-500">
                  Optional
                </span>
              </label>

              <input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(event) =>
                  setStoreName(
                    event.target.value
                  )
                }
                placeholder="4 Corners Treasures"
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="storeUrl"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                eBay Store URL
                <span className="ml-2 font-normal text-zinc-500">
                  Optional
                </span>
              </label>

              <input
                id="storeUrl"
                type="url"
                value={storeUrl}
                onChange={(event) =>
                  setStoreUrl(
                    event.target.value
                  )
                }
                placeholder="https://www.ebay.com/str/..."
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Notes
                <span className="ml-2 font-normal text-zinc-500">
                  Optional
                </span>
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                rows={4}
                placeholder="Optional notes about this seller..."
                className="w-full resize-y rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 bg-zinc-900/40 px-5 py-5 sm:flex-row sm:justify-end sm:px-6">
            <Link
              href="/admin/seller-tracker/sellers"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Adding Seller..."
                : "Add Seller"}
            </button>
          </div>
        </form>

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-zinc-400">
          <span className="font-semibold text-zinc-200">
            Inventory capture:
          </span>{" "}
          Adding a seller only creates the
          seller record. It does not begin
          downloading or archiving listings.
        </div>
      </div>
    </main>
  );
}