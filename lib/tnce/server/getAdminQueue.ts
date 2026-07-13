import type { TNCEAdminQueueResponse } from "../types";

export async function getAdminQueue(): Promise<TNCEAdminQueueResponse> {
  const url = process.env.TNCE_APPS_SCRIPT_URL;
  const adminSecret = process.env.TNCE_ADMIN_SECRET;

  if (!url) {
    throw new Error(
      "Missing TNCE_APPS_SCRIPT_URL environment variable."
    );
  }

  if (!adminSecret) {
    throw new Error(
      "Missing TNCE_ADMIN_SECRET environment variable."
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "adminQueue",
      adminSecret,
    }),
    cache: "no-store",
    redirect: "follow",
  });

  const text = await response.text();

  let data: TNCEAdminQueueResponse;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `TNCE Apps Script returned invalid JSON. First response text: ${text.slice(
        0,
        500
      )}`
    );
  }

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error || "Unable to load TNCE admin queue."
    );
  }

  return data;
}