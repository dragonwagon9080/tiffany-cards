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

export async function submitRPAContribution(
  submission: TNCESubmission
) {
  const url =
    process.env
      .TNCE_APPS_SCRIPT_URL;

  if (!url) {
    throw new Error(
      "Missing TNCE_APPS_SCRIPT_URL environment variable."
    );
  }

  /*
   * Build this once so every retry uses the same
   * submission ID and identical request payload.
   */
  const payload = JSON.stringify({
    ...submission,
    project: "rpa-tracker",
  });

  let lastError: Error | null =
    null;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {
    try {
      const response =
        await fetch(url, {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8",
          },

          body: payload,
          cache: "no-store",
          redirect: "follow",
        });

      const text =
        await response.text();

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        const retryable =
          isRetryableStatus(
            response.status
          ) ||
          isTemporaryGoogleHtml(
            response.status,
            text
          );

        const error =
          new Error(
            `TNCE Apps Script returned non-JSON. Status: ${
              response.status
            }. First response text: ${text.slice(
              0,
              300
            )}`
          );

        if (
          retryable &&
          attempt < MAX_ATTEMPTS
        ) {
          lastError = error;

          await wait(
            attempt === 1
              ? 1000
              : 2500
          );

          continue;
        }

        throw error;
      }

      /*
       * Google occasionally follows the Apps Script POST
       * redirect as a GET and returns the public database
       * response instead of the submission result.
       *
       * A valid TNCE response must be an object containing
       * a boolean "ok" property.
       */
      if (
        isUnexpectedAppsScriptResponse(
          data
        )
      ) {
        const unexpectedError =
          new Error(
            `Apps Script returned an unexpected JSON response. Status: ${
              response.status
            }. First response text: ${text.slice(
              0,
              300
            )}`
          );

        if (
          attempt < MAX_ATTEMPTS
        ) {
          lastError =
            unexpectedError;

          await wait(
            attempt === 1
              ? 1000
              : 2500
          );

          continue;
        }

        throw unexpectedError;
      }

      if (
        (!response.ok ||
          !data?.ok) &&
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
          attempt === 1
            ? 1000
            : 2500
        );

        continue;
      }

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          errorMessageFromData(
            data
          )
        );
      }

      return data;
    } catch (error: any) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error(
              String(
                error ||
                  "TNCE submission failed."
              )
            );

      lastError =
        normalizedError;

      /*
       * Parsed Apps Script errors should not be retried.
       * Network errors normally appear as TypeError.
       */
      const isNetworkError =
        error instanceof TypeError;

      if (
        isNetworkError &&
        attempt < MAX_ATTEMPTS
      ) {
        await wait(
          attempt === 1
            ? 1000
            : 2500
        );

        continue;
      }

      throw normalizedError;
    }
  }

  throw (
    lastError ||
    new Error(
      "TNCE submission failed after multiple attempts."
    )
  );
}