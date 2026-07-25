import type { TNCESubmission } from "../types";

export async function submitCardsAlertContribution(submission: TNCESubmission) {
  const url = process.env.CARDS_ALERT_TNCE_APPS_SCRIPT_URL;

  if (!url) {
    throw new Error(
      "Missing CARDS_ALERT_TNCE_APPS_SCRIPT_URL environment variable.",
    );
  }

  const payload = JSON.stringify({
    ...submission,
    project: "cards-alert",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: payload,
    cache: "no-store",
    redirect: "follow",
  });

  const text = await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Cards Alert Apps Script returned non-JSON. Status: ${
        response.status
      }. First response text: ${text.slice(0, 300)}`,
    );
  }

  if (!response.ok || !data.ok) {
    throw new Error(data?.error || JSON.stringify(data, null, 2));
  }

  return data;
}