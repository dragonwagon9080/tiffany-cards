import type {
  TNCESubmission,
} from "../types";

const MAX_ATTEMPTS = 3;

function wait(milliseconds: number) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function isRetryableStatus(
  status: number
) {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function isTemporaryGoogleHtml(
  status: number,
  text: string
) {
  if (status !== 404) {
    return false;
  }

  const normalized =
    String(text || "")
      .toLowerCase();

  return (
    normalized.includes(
      "<!doctype html"
    ) &&
    (
      normalized.includes(
        "docs.google.com"
      ) ||
      normalized.includes(
        "google"
      )
    )
  );
}

function isUnexpectedAppsScriptResponse(
  data: any
) {
  return (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.ok !== "boolean"
  );
}

function errorMessageFromData(
  data: any
) {
  if (
    typeof data?.error === "string" &&
    data.error.trim()
  ) {
    return data.error.trim();
  }

  if (
    typeof data?.message === "string" &&
    data.message.trim()
  ) {
    return data.message.trim();
  }

  return JSON.stringify(
    data,
    null,
    2
  );
}

function retryDelay(
  attempt: number
) {
  return attempt === 1
    ? 1000
    : 2500;
}

export async function submitCardsAlertContribution(
  submission: TNCESubmission
) {
  const url =
    process.env
      .CARDS_ALERT_TNCE_APPS_SCRIPT_URL;

  if (!url) {
    throw new Error(
      "Missing CARDS_ALERT_TNCE_APPS_SCRIPT_URL environment variable."
    );
  }

  /*
   * Every retry uses the identical payload and
   * submission ID.
   */
  const payload = JSON.stringify({
    ...submission,
    project: "cards-alert",
  });

  let lastError: Error | null =
    null;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {
    let response: Response;

    try {
      response = await fetch(
        url,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8",
          },

          body: payload,
          cache: "no-store",
          redirect: "follow",
        }
      );
    } catch (error: any) {
      lastError =
        error instanceof Error
          ? error
          : new Error(
              "Unable to contact Cards Alert Apps Script."
            );

      if (
        attempt < MAX_ATTEMPTS
      ) {
        await wait(
          retryDelay(attempt)
        );

        continue;
      }

      throw lastError;
    }

    const text =
      await response.text();

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      const error =
        new Error(
          `Cards Alert Apps Script returned non-JSON. Status: ${
            response.status
          }. First response text: ${text.slice(
            0,
            300
          )}`
        );

      const retryable =
        isRetryableStatus(
          response.status
        ) ||
        isTemporaryGoogleHtml(
          response.status,
          text
        );

      if (
        retryable &&
        attempt < MAX_ATTEMPTS
      ) {
        lastError = error;

        await wait(
          retryDelay(attempt)
        );

        continue;
      }

      throw error;
    }

    /*
     * Google can occasionally return the public
     * database JSON instead of the POST result.
     */
    if (
      isUnexpectedAppsScriptResponse(
        data
      )
    ) {
      const error =
        new Error(
          `Cards Alert Apps Script returned an unexpected JSON response. Status: ${
            response.status
          }. First response text: ${text.slice(
            0,
            300
          )}`
        );

      if (
        attempt < MAX_ATTEMPTS
      ) {
        lastError = error;

        await wait(
          retryDelay(attempt)
        );

        continue;
      }

      throw error;
    }

    if (
      (!response.ok ||
        !data.ok) &&
      isRetryableStatus(
        response.status
      ) &&
      attempt < MAX_ATTEMPTS
    ) {
      lastError =
        new Error(
          errorMessageFromData(
            data
          )
        );

      await wait(
        retryDelay(attempt)
      );

      continue;
    }

    if (
      !response.ok ||
      !data.ok
    ) {
      throw new Error(
        errorMessageFromData(
          data
        )
      );
    }

    return data;
  }

  throw (
    lastError ||
    new Error(
      "Cards Alert submission failed after multiple attempts."
    )
  );
}