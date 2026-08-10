"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

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

      const data =
        await response.json();

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
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold md:text-4xl">
            eBay Better Image Finder
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 md:text-base">
            Paste an eBay image URL
            to check whether a
            larger version is still
            available. The tool
            compares the actual
            returned image dimensions
            instead of trusting the
            size shown in the URL.
          </p>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
        >
          <label
            htmlFor="ebay-image-url"
            className="mb-2 block text-sm font-semibold"
          >
            eBay image URL
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
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={
                loading
              }
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
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
            <section className="rounded-2xl border border-blue-900/70 bg-zinc-950 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-blue-400">
                    Best Available
                  </div>

                  <div className="mt-1 text-2xl font-bold">
                    {dimensions(
                      result.best
                    )}
                  </div>

                  <div className="mt-1 text-sm text-zinc-400">
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
                    <div className="mt-2 text-sm font-semibold text-green-400">
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
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold transition hover:border-zinc-500 hover:bg-zinc-800"
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
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:bg-blue-500"
                  >
                    Open Full Size
                  </a>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                <img
                  src={
                    result.best.url
                  }
                  alt="Best available eBay image"
                  className="mx-auto max-h-[700px] w-auto max-w-full object-contain"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="mb-4">
                <div className="text-lg font-semibold">
                  Image Details
                </div>

                <div className="mt-1 text-sm text-zinc-400">
                  eBay image ID:{" "}
                  <span className="font-mono text-zinc-200">
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
                      className="rounded-xl border border-zinc-800 bg-black p-3"
                    >
                      <div className="font-semibold">
                        {dimensions(
                          image
                        )}
                      </div>

                      <div className="mt-1 text-xs text-zinc-400">
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
                        className="mt-3 inline-block text-sm font-semibold text-blue-400 hover:text-blue-300"
                      >
                        Open
                      </a>
                    </div>
                  )
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}