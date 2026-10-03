"use client";

import {
  FormEvent,
  Suspense,
  useMemo,
  useState,
} from "react";

import UniversalSearchBar from "@/components/shared/UniversalSearchBar";

type ImageResult = {
  url: string;
  ok: boolean;
  status: number;
  contentType: string;
  bytes: number | null;
  width: number | null;
  height: number | null;
  format: string | null;
  aliases?: string[];
};

type ApiResponse = {
  inputUrl: string;
  imageId: string;
  best: ImageResult | null;
  uniqueImages: ImageResult[];
  error?: string;
};

function formatBytes(
  bytes: number | null
) {
  if (!bytes) {
    return "Unknown";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

function dimensions(
  image: ImageResult | null
) {
  if (
    !image?.width ||
    !image?.height
  ) {
    return "Unknown";
  }

  return `${image.width} × ${image.height}`;
}

export default function EbayImageFinderPage() {
  const [url, setUrl] =
    useState("");

  const [result, setResult] =
    useState<ApiResponse | null>(
      null
    );

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const improvement =
    useMemo(() => {
      if (
        !result?.best?.width
      ) {
        return "";
      }

      const match =
        result.inputUrl.match(
          /s-l(\d+)/i
        );

      if (!match) {
        return "";
      }

      const original =
        Number(match[1]);

      if (
        !original ||
        result.best.width <=
          original
      ) {
        return "";
      }

      return (
        result.best.width /
        original
      ).toFixed(1);
    }, [result]);

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");
    setCopied(false);
    setResult(null);

    const trimmed =
      url.trim();

    if (!trimmed) {
      setError(
        "Paste an eBay image URL first."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/tools/ebay-image",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                url: trimmed,
              }),
          }
        );

      const responseText =
        await response.text();

      let data: ApiResponse;

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch {
        console.error(
          "eBay Image Finder returned non-JSON:",
          {
            status:
              response.status,

            contentType:
              response.headers.get(
                "content-type"
              ),

            response:
              responseText.slice(
                0,
                500
              ),
          }
        );

        throw new Error(
          `Image Finder API failed with HTTP ${response.status}.`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to inspect the image."
        );
      }

      setResult(data);
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to inspect the image."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyBestUrl() {
    if (!result?.best?.url) {
      return;
    }

    await navigator.clipboard.writeText(
      result.best.url
    );

    setCopied(true);

    window.setTimeout(
      () => {
        setCopied(false);
      },
      1800
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* SEARCH DATABASE */}
      <section className="px-4 pt-10 md:px-6 md:pt-12">
        <div className="mx-auto max-w-7xl">
          <Suspense
            fallback={
              <div className="py-6 text-center text-sm text-neutral-500">
                Loading search...
              </div>
            }
          >
            <UniversalSearchBar defaultTarget="tiffany" />
          </Suspense>
        </div>
      </section>

      {/* TOOLS HEADER */}
      <section className="px-4 pb-5 pt-5 text-center md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-xl font-black uppercase tracking-[0.18em] text-purple-500 md:text-2xl">
            Tools
          </div>

          <h1
            className="mt-2 text-3xl font-black uppercase leading-tight tracking-wide md:text-5xl"
            style={{
              background:
                "linear-gradient(to bottom, #fff3a6 0%, #e2c45a 35%, #b98b22 65%, #795407 100%)",
              WebkitBackgroundClip:
                "text",
              WebkitTextFillColor:
                "transparent",
              backgroundClip:
                "text",
              filter:
                "drop-shadow(0 2px 3px rgba(183, 137, 32, 0.25))",
            }}
          >
            eBay Best Image Finder
          </h1>

          <p className="mx-auto mt-3 max-w-3xl text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 md:text-sm">
            Find the highest quality available image from an eBay listing
          </p>
        </div>
      </section>

      {/* IMAGE FINDER */}
      <section className="px-4 pb-16 pt-5 md:px-6">
        <div className="mx-auto max-w-6xl">
          <form
            onSubmit={
              handleSubmit
            }
            className="rounded-2xl border border-purple-800/80 bg-[#111113] p-5 shadow-[0_0_24px_rgba(147,51,234,0.10)] md:p-6"
          >
            <div className="mb-5">
              <div className="text-lg font-black uppercase tracking-wide text-white">
                Find Better eBay Image
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
                Paste an eBay image URL to check whether a larger version is
                still available. The tool compares the actual returned image
                dimensions instead of trusting the size shown in the URL.
              </p>
            </div>

            <label
              htmlFor="ebay-image-url"
              className="mb-2 block text-xs font-black uppercase tracking-wider text-purple-300"
            >
              eBay Image URL
            </label>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                id="ebay-image-url"
                type="url"
                value={url}
                onChange={(event) =>
                  setUrl(
                    event.target.value
                  )
                }
                placeholder="https://i.ebayimg.com/thumbs/images/g/..."
                className="min-w-0 flex-1 rounded-xl border border-purple-900 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-purple-500 focus:shadow-[0_0_16px_rgba(168,85,247,0.16)]"
              />

              <button
                type="submit"
                disabled={
                  loading
                }
                className="rounded-xl border border-purple-500 bg-purple-700 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:border-purple-300 hover:bg-purple-600 hover:shadow-[0_0_18px_rgba(168,85,247,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Checking..."
                  : "Find Better Image"}
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}
          </form>

          {result?.best ? (
            <div className="mt-8 space-y-6">
              {/* BEST IMAGE */}
              <section className="rounded-2xl border border-purple-700/70 bg-[#111113] p-5 shadow-[0_0_24px_rgba(147,51,234,0.12)] md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-black uppercase tracking-wider text-purple-400">
                      Best Available
                    </div>

                    <div className="mt-1 text-2xl font-black text-white">
                      {dimensions(
                        result.best
                      )}
                    </div>

                    <div className="mt-1 text-sm text-neutral-400">
                      {result.best
                        .format
                        ?.toUpperCase() ||
                        result.best
                          .contentType}{" "}
                      •{" "}
                      {formatBytes(
                        result.best
                          .bytes
                      )}
                    </div>

                    {improvement ? (
                      <div className="mt-2 text-sm font-bold text-green-400">
                        Approximately{" "}
                        {improvement}×
                        wider than the
                        original URL size.
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={
                        copyBestUrl
                      }
                      className="rounded-xl border border-purple-800 bg-purple-950/60 px-4 py-2 text-sm font-bold text-purple-200 transition hover:border-purple-500 hover:bg-purple-900/70"
                    >
                      {copied
                        ? "Copied!"
                        : "Copy Image URL"}
                    </button>

                    <a
                      href={
                        result.best
                          .url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-purple-500 bg-purple-700 px-4 py-2 text-sm font-bold text-white transition hover:border-purple-300 hover:bg-purple-600"
                    >
                      Open Full Size
                    </a>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-purple-950 bg-black">
                  <img
                    src={
                      result.best.url
                    }
                    alt="Best available eBay image"
                    className="mx-auto max-h-[700px] w-auto max-w-full object-contain"
                  />
                </div>
              </section>

              {/* IMAGE DETAILS */}
              <section className="rounded-2xl border border-purple-900/70 bg-[#111113] p-5 md:p-6">
                <div className="mb-4">
                  <div className="text-lg font-black uppercase tracking-wide text-white">
                    Image Details
                  </div>

                  <div className="mt-1 text-sm text-neutral-400">
                    eBay image ID:{" "}
                    <span className="font-mono text-purple-200">
                      {
                        result.imageId
                      }
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {result.uniqueImages.map(
                    (
                      image,
                      index
                    ) => (
                      <div
                        key={`${image.url}-${index}`}
                        className="rounded-xl border border-purple-950 bg-black p-3 transition hover:border-purple-700"
                      >
                        <div className="font-bold text-white">
                          {dimensions(
                            image
                          )}
                        </div>

                        <div className="mt-1 text-xs text-neutral-400">
                          {image.format?.toUpperCase() ||
                            image.contentType}
                          {" • "}
                          {formatBytes(
                            image.bytes
                          )}
                        </div>

                        <a
                          href={
                            image.url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-block text-sm font-bold text-purple-400 transition hover:text-purple-300"
                        >
                          Open →
                        </a>
                      </div>
                    )
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {/* DISCLAIMER */}
          <div className="mt-8 border-t border-neutral-800 pt-5 text-center text-xs leading-5 text-neutral-500">
            Image availability and resolution depend on the images currently
            accessible from eBay. Tiffany Cards does not alter the source image
            returned by the tool.
          </div>
        </div>
      </section>
    </main>
  );
}