import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CandidateResult = {
  url: string;
  ok: boolean;
  status: number;
  contentType: string;
  bytes: number | null;
  width: number | null;
  height: number | null;
  format: string | null;
  fingerprint: string | null;
};

function cleanUrl(
  value: unknown
) {
  return String(value || "")
    .replace(
      /[\u200B-\u200D\uFEFF]/g,
      ""
    )
    .trim();
}

function extractEbayImageId(
  input: string
) {
  const match =
    input.match(
      /i\.ebayimg\.com\/(?:thumbs\/)?images\/g\/([^/]+)\//i
    );

  return match?.[1] || "";
}


/*******************************************************
 * IMAGE DIMENSION READER
 *
 * No Sharp / libvips dependency.
 *******************************************************/

function readImageMetadata(
  buffer: Buffer,
  contentType: string
): {
  width: number | null;
  height: number | null;
  format: string | null;
} {
  try {
    /*
     * PNG
     *
     * Width and height are stored in the IHDR chunk.
     */
    if (
      buffer.length >= 24 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return {
        width:
          buffer.readUInt32BE(16),

        height:
          buffer.readUInt32BE(20),

        format:
          "png",
      };
    }

    /*
     * GIF
     */
    if (
      buffer.length >= 10 &&
      buffer
        .subarray(
          0,
          3
        )
        .toString("ascii") ===
        "GIF"
    ) {
      return {
        width:
          buffer.readUInt16LE(6),

        height:
          buffer.readUInt16LE(8),

        format:
          "gif",
      };
    }

    /*
     * WEBP
     */
    if (
      buffer.length >= 30 &&
      buffer
        .subarray(
          0,
          4
        )
        .toString("ascii") ===
        "RIFF" &&
      buffer
        .subarray(
          8,
          12
        )
        .toString("ascii") ===
        "WEBP"
    ) {
      const type =
        buffer
          .subarray(
            12,
            16
          )
          .toString("ascii");

      /*
       * Lossy WebP
       */
      if (
        type === "VP8 " &&
        buffer.length >= 30
      ) {
        const width =
          buffer.readUInt16LE(
            26
          ) &
          0x3fff;

        const height =
          buffer.readUInt16LE(
            28
          ) &
          0x3fff;

        return {
          width,
          height,
          format:
            "webp",
        };
      }

      /*
       * Lossless WebP
       */
      if (
        type === "VP8L" &&
        buffer.length >= 25
      ) {
        const b0 =
          buffer[21];

        const b1 =
          buffer[22];

        const b2 =
          buffer[23];

        const b3 =
          buffer[24];

        const width =
          1 +
          (((b2 & 0x3f) << 8) |
            b1);

        const height =
          1 +
          ((b3 << 6) |
            (b2 >> 6));

        return {
          width,
          height,
          format:
            "webp",
        };
      }

      /*
       * Extended WebP
       */
      if (
        type === "VP8X" &&
        buffer.length >= 30
      ) {
        const width =
          1 +
          buffer[24] +
          (buffer[25] << 8) +
          (buffer[26] << 16);

        const height =
          1 +
          buffer[27] +
          (buffer[28] << 8) +
          (buffer[29] << 16);

        return {
          width,
          height,
          format:
            "webp",
        };
      }

      return {
        width: null,
        height: null,
        format:
          "webp",
      };
    }

    /*
     * JPEG
     *
     * Scan markers until we reach a Start Of Frame block.
     */
    if (
      buffer.length >= 4 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8
    ) {
      let offset = 2;

      while (
        offset <
        buffer.length - 9
      ) {
        if (
          buffer[offset] !==
          0xff
        ) {
          offset++;
          continue;
        }

        const marker =
          buffer[
            offset + 1
          ];

        offset += 2;

        /*
         * Standalone markers.
         */
        if (
          marker === 0xd8 ||
          marker === 0xd9 ||
          marker === 0x01
        ) {
          continue;
        }

        if (
          offset + 2 >
          buffer.length
        ) {
          break;
        }

        const blockLength =
          buffer.readUInt16BE(
            offset
          );

        if (
          blockLength < 2
        ) {
          break;
        }

        const isStartOfFrame =
          [
            0xc0,
            0xc1,
            0xc2,
            0xc3,
            0xc5,
            0xc6,
            0xc7,
            0xc9,
            0xca,
            0xcb,
            0xcd,
            0xce,
            0xcf,
          ].includes(
            marker
          );

        if (
          isStartOfFrame &&
          offset + 7 <
            buffer.length
        ) {
          return {
            height:
              buffer.readUInt16BE(
                offset + 3
              ),

            width:
              buffer.readUInt16BE(
                offset + 5
              ),

            format:
              "jpeg",
          };
        }

        offset +=
          blockLength;
      }

      return {
        width: null,
        height: null,
        format:
          "jpeg",
      };
    }

    /*
     * Fallback based on response Content-Type.
     */
    const fallbackFormat =
      contentType.includes(
        "jpeg"
      )
        ? "jpeg"
        : contentType.includes(
              "webp"
            )
          ? "webp"
          : contentType.includes(
                "png"
              )
            ? "png"
            : contentType.includes(
                  "gif"
                )
              ? "gif"
              : null;

    return {
      width: null,
      height: null,
      format:
        fallbackFormat,
    };
  } catch {
    return {
      width: null,
      height: null,
      format: null,
    };
  }
}


async function testCandidate(
  url: string
): Promise<CandidateResult> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      8000
    );

  try {
    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          redirect:
            "follow",

          cache:
            "no-store",

          signal:
            controller.signal,

          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",

            Accept:
              "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8",

            Referer:
              "https://www.ebay.com/",
          },
        }
      );

    const contentType =
      String(
        response.headers.get(
          "content-type"
        ) || ""
      )
        .split(";")[0]
        .trim()
        .toLowerCase();

    if (
      !response.ok ||
      !contentType.startsWith(
        "image/"
      )
    ) {
      try {
        await response
          .body
          ?.cancel();
      } catch {
        // Ignore cleanup errors.
      }

      return {
        url,
        ok: false,
        status:
          response.status,
        contentType,
        bytes: null,
        width: null,
        height: null,
        format: null,
        fingerprint:
          null,
      };
    }

    const arrayBuffer =
      await response
        .arrayBuffer();

    const buffer =
      Buffer.from(
        arrayBuffer
      );

    const metadata =
      readImageMetadata(
        buffer,
        contentType
      );

    /*
     * Fingerprint allows us to identify cases where
     * different eBay URLs return the exact same image.
     */
    const fingerprint =
      `${buffer.length}:` +
      buffer
        .subarray(
          0,
          Math.min(
            buffer.length,
            96
          )
        )
        .toString(
          "base64"
        );

    return {
      url,
      ok: true,
      status:
        response.status,
      contentType,
      bytes:
        buffer.length,
      width:
        metadata.width,
      height:
        metadata.height,
      format:
        metadata.format,
      fingerprint,
    };
  } catch (
    error: any
  ) {
    console.warn(
      "eBay image candidate failed:",
      url,
      error?.name ||
        error?.message ||
        error
    );

    return {
      url,
      ok: false,
      status: 0,
      contentType: "",
      bytes: null,
      width: null,
      height: null,
      format: null,
      fingerprint:
        null,
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}


function scoreCandidate(
  item: CandidateResult
) {
  const width =
    item.width || 0;

  const height =
    item.height || 0;

  const pixels =
    width * height;

  const bytes =
    item.bytes || 0;

  /*
   * Actual dimensions are the primary ranking factor.
   *
   * File size breaks ties when dimensions are the same.
   */
  return (
    pixels *
      1000000000 +
    bytes
  );
}


export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const inputUrl =
      cleanUrl(
        body?.url
      );

    if (!inputUrl) {
      return NextResponse.json(
        {
          error:
            "An eBay image URL is required.",
        },
        {
          status: 400,
        }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl =
        new URL(
          inputUrl
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "The supplied URL is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    const hostname =
      parsedUrl.hostname
        .toLowerCase();

    if (
      hostname !==
      "i.ebayimg.com"
    ) {
      return NextResponse.json(
        {
          error:
            "This tool currently supports i.ebayimg.com image URLs only.",
        },
        {
          status: 400,
        }
      );
    }

    const imageId =
      extractEbayImageId(
        inputUrl
      );

    if (!imageId) {
      return NextResponse.json(
        {
          error:
            "Unable to identify the eBay image ID from this URL.",
        },
        {
          status: 400,
        }
      );
    }

    const sizes = [
      1600,
      1200,
      1000,
      800,
      500,
      300,
      225,
    ];

    const extensions = [
      "webp",
      "jpg",
    ];

    const candidateUrls:
      string[] = [];

    for (
      const size
      of sizes
    ) {
      for (
        const extension
        of extensions
      ) {
        candidateUrls.push(
          `https://i.ebayimg.com/images/g/${imageId}/s-l${size}.${extension}`
        );
      }
    }

    /*
     * Test sequentially to keep peak memory low
     * on Vercel.
     */
    const tested:
      CandidateResult[] = [];

    for (
      const candidateUrl
      of candidateUrls
    ) {
      const result =
        await testCandidate(
          candidateUrl
        );

      tested.push(
        result
      );
    }

    const available =
      tested.filter(
        (item) =>
          item.ok
      );

    /*
     * Group different URLs that returned identical files.
     */
    const duplicateGroups =
      new Map<
        string,
        CandidateResult[]
      >();

    for (
      const item
      of available
    ) {
      const key =
        item.fingerprint ||
        item.url;

      if (
        !duplicateGroups
          .has(key)
      ) {
        duplicateGroups.set(
          key,
          []
        );
      }

      duplicateGroups
        .get(key)!
        .push(
          item
        );
    }

    const uniqueImages =
      Array.from(
        duplicateGroups
          .values()
      ).map(
        (group) => {
          const sorted =
            [...group]
              .sort(
                (
                  a,
                  b
                ) =>
                  scoreCandidate(
                    b
                  ) -
                  scoreCandidate(
                    a
                  )
              );

          const representative =
            sorted[0];

          return {
            ...representative,

            aliases:
              group.map(
                (item) =>
                  item.url
              ),
          };
        }
      );

    uniqueImages.sort(
      (
        a,
        b
      ) =>
        scoreCandidate(
          b
        ) -
        scoreCandidate(
          a
        )
    );

    const best =
      uniqueImages[0] ||
      null;

    return NextResponse.json(
      {
        inputUrl,
        imageId,
        best,
        uniqueImages,
        available,
        tested,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "eBay Image Finder API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to inspect the eBay image.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}