import type {
  CachedToken,
} from "./types";

const EBAY_TOKEN_URL =
  "https://api.ebay.com/identity/v1/oauth2/token";

const EBAY_SCOPE =
  "https://api.ebay.com/oauth/api_scope";

let cachedToken:
  | CachedToken
  | null = null;

/**
 * Creates and caches an eBay application OAuth token.
 *
 * Required environment variables:
 * EBAY_CLIENT_ID
 * EBAY_CLIENT_SECRET
 */
export async function getEbayToken() {
  if (
    cachedToken &&
    cachedToken.expiresAt >
      Date.now() + 60_000
  ) {
    return cachedToken.value;
  }

  const clientId =
    process.env.EBAY_CLIENT_ID;

  const clientSecret =
    process.env.EBAY_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret
  ) {
    throw new Error(
      "Missing eBay API credentials."
    );
  }

  const authorization =
    Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

  const response =
    await fetch(
      EBAY_TOKEN_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Basic ${authorization}`,

          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            grant_type:
              "client_credentials",

            scope: EBAY_SCOPE,
          }).toString(),

        cache: "no-store",
      }
    );

  const text =
    await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `eBay token response was invalid JSON: ${text.slice(
        0,
        300
      )}`
    );
  }

  if (
    !response.ok ||
    !data.access_token
  ) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        "Unable to create eBay access token."
    );
  }

  const expiresIn =
    Number(
      data.expires_in || 7200
    );

  cachedToken = {
    value:
      String(
        data.access_token
      ),

    expiresAt:
      Date.now() +
      expiresIn * 1000,
  };

  return cachedToken.value;
}