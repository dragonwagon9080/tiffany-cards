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
            `Cards Alert Apps Script returned non-JSON. Status: ${
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
                  "Cards Alert submission failed."
              )
            );

      lastError =
        normalizedError;

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
      "Cards Alert submission failed after multiple attempts."
    )
  );
}