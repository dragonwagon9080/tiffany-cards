import type { TNCEAdminQueueResponse, TNCEProject } from "../types";

function endpointForProject(project: TNCEProject) {
  if (project === "rpa-tracker") {
    return process.env.TNCE_APPS_SCRIPT_URL;
  }

  if (project === "cards-alert") {
    return process.env.CARDS_ALERT_TNCE_APPS_SCRIPT_URL;
  }

  return "";
}

function adminSecretForProject(project: TNCEProject) {
  if (project === "cards-alert") {
    return (
      process.env.CARDS_ALERT_TNCE_ADMIN_SECRET || process.env.TNCE_ADMIN_SECRET
    );
  }

  return process.env.TNCE_ADMIN_SECRET;
}

export async function getAdminQueue(
  project: TNCEProject,
): Promise<TNCEAdminQueueResponse> {
  const url = endpointForProject(project);

  const adminSecret = adminSecretForProject(project);

  if (!url) {
    throw new Error(`Missing TNCE Apps Script URL for ${project}.`);
  }

  if (!adminSecret) {
    throw new Error(`Missing TNCE admin secret for ${project}.`);
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
      `${project} Apps Script returned invalid JSON. First response text: ${text.slice(
        0,
        500,
      )}`,
    );
  }

  if (!response.ok || !data.ok) {
    throw new Error(data.error || `Unable to load ${project} TNCE queue.`);
  }

  return data;
}