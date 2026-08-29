import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  importAuction,
} from "@/lib/tnce/server/auctionImport";

import {
  importPageText,
} from "@/lib/tnce/page-text-importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALT_SHORT_HOSTS =
  new Set([
    "alt.app.link",
    "www.alt.app.link",
  ]);


/*******************************************************
 * CLEAN URL
 *******************************************************/

function cleanUrl(
  value: string
) {
  const text =
    String(
      value || ""
    )
      .trim()
      .replace(
        /&amp;/gi,
        "&"
      );

  /*
   * Allows links copied/shared from apps to include
   * surrounding text, for example:
   *
   * Check out this card on Goldin:
   * https://goldin.co/...
   *
   * Extract the first URL and discard the share text.
   */
  const match =
    text.match(
      /https?:\/\/[^\s<>"']+/i
    );

  if (match?.[0]) {
    return match[0]
      .replace(
        /[),.;!?]+$/,
        ""
      );
  }

  return text;
}


/*******************************************************
 * DETECT ALT SHORT LINK
 *******************************************************/

function isAltShortLink(
  value: string
) {
  try {
    const parsed =
      new URL(value);

    return ALT_SHORT_HOSTS.has(
      parsed.hostname.toLowerCase()
    );
  } catch {
    return false;
  }
}


/*******************************************************
 * FIND REAL ALT URL INSIDE HTML
 *
 * Some Branch / app.link short links do not always
 * return a normal HTTP redirect to server requests.
 *
 * In those cases the response can contain the actual
 * app.alt.xyz URL inside the returned HTML.
 *******************************************************/

function findAltUrlInHtml(
  html: string
) {
  if (!html) {
    return "";
  }

  const decoded =
    html
      .replace(
        /&amp;/gi,
        "&"
      )
      .replace(
        /\\u002F/gi,
        "/"
      )
      .replace(
        /\\\//g,
        "/"
      );

  const patterns = [
    /https?:\/\/app\.alt\.xyz\/itm\/[A-Za-z0-9_-]+(?:\?[^"'<>\\\s]*)?/i,

    /https?:\/\/(?:www\.)?alt\.xyz\/itm\/[A-Za-z0-9_-]+(?:\?[^"'<>\\\s]*)?/i,

    /https?:\/\/app\.alt\.xyz\/[^"'<>\\\s]+/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      decoded.match(pattern);

    if (match?.[0]) {
      return cleanUrl(
        match[0]
      );
    }
  }

  return "";
}


/*******************************************************
 * RESOLVE ALT.APP.LINK
 *******************************************************/

async function resolveAltShortLink(
  shortUrl: string
) {
  if (
    !isAltShortLink(
      shortUrl
    )
  ) {
    return shortUrl;
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      15000
    );

  try {
    console.log(
      "Resolving Alt short link:",
      shortUrl
    );

    const response =
      await fetch(
        shortUrl,
        {
          method: "GET",

          redirect:
            "follow",

          cache:
            "no-store",

          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36",
          },

          signal:
            controller.signal,
        }
      );

    /*
     * Best case:
     *
     * Branch/app.link actually redirected us to the
     * real Alt listing.
     */
    const finalUrl =
      cleanUrl(
        response.url
      );

    if (
      finalUrl &&
      !isAltShortLink(
        finalUrl
      )
    ) {
      console.log(
        "Alt short link resolved by redirect:",
        finalUrl
      );

      return finalUrl;
    }

    /*
     * Branch sometimes returns a landing/deep-link
     * page instead of performing a traditional redirect.
     *
     * Search that HTML for the actual Alt listing URL.
     */
    const html =
      await response.text();

    const htmlUrl =
      findAltUrlInHtml(
        html
      );

    if (htmlUrl) {
      console.log(
        "Alt short link resolved from HTML:",
        htmlUrl
      );

      return htmlUrl;
    }

    console.warn(
      "Could not resolve Alt short link. Passing original URL to importer.",
      shortUrl
    );

    return shortUrl;
  } catch (error) {
    console.error(
      "Alt short-link resolution failed:",
      error
    );

    /*
     * Do not break the entire TNCE importer merely
     * because short-link resolution failed.
     *
     * Let the existing auction importer make its own
     * attempt with the original URL.
     */
    return shortUrl;
  } finally {
    clearTimeout(
      timeout
    );
  }
}


/*******************************************************
 * POST
 *******************************************************/

export async function POST(
  req: NextRequest
) {
  try {
    const body =
      await req.json();

    const suppliedUrl =
      cleanUrl(
        body?.url || ""
      );

    const pageText =
      String(
        body?.pageText || ""
      ).trim();

    const pageHtml =
      String(
        body?.pageHtml || ""
      ).trim();

    if (
      !suppliedUrl &&
      !pageText &&
      !pageHtml
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Enter an auction URL or paste copied page text.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Resolve Alt's Branch short links before handing
     * the URL to auctionImport.ts.
     *
     * All other marketplace URLs pass through unchanged.
     */
    const resolvedUrl =
      suppliedUrl
        ? await resolveAltShortLink(
            suppliedUrl
          )
        : "";

    console.log(
      "TNCE import URL:",
      {
        suppliedUrl,
        resolvedUrl,
      }
    );

    const result =
      pageText ||
      pageHtml
        ? await importPageText(
            pageText,
            resolvedUrl,
            pageHtml
          )
        : await importAuction(
            resolvedUrl
          );

    return NextResponse.json({
      ok: true,

      /*
       * Useful while debugging Alt links.
       *
       * This does not interfere with the existing
       * importer result.
       */
      resolvedUrl,

      ...result,
    });
  } catch (error: any) {
    console.error(
      "TNCE import error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error?.message ||
          "Import failed.",
      },
      {
        status: 500,
      }
    );
  }
}