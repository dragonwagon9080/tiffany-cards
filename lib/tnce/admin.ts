import type {
  TNCEAdminQueueResponse,
  TNCEProject,
  TNCEReviewStatus,
} from "./types";

export async function getTNCEAdminQueue(options?: {
  project?: TNCEProject | "all";
  status?: TNCEReviewStatus | "all";
  search?: string;
}): Promise<TNCEAdminQueueResponse> {
  const response = await fetch("/api/tnce/admin", {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const text = await response.text();

  let data: TNCEAdminQueueResponse;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `TNCE admin API returned invalid JSON. First response text: ${text.slice(
        0,
        300
      )}`
    );
  }

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error || "Unable to load TNCE admin queue."
    );
  }

  const project = options?.project || "all";
  const status = options?.status || "all";
  const search = String(options?.search || "")
    .trim()
    .toLowerCase();

  let submissions = [...data.submissions];

  if (project !== "all") {
    submissions = submissions.filter(
      (item) => item.Project === project
    );
  }

  if (status !== "all") {
    submissions = submissions.filter(
      (item) => item.TNCE_Status === status
    );
  }

  if (search) {
    submissions = submissions.filter((item) => {
      const searchable = [
        item.Card_Title,
        item.Serial_Number,
        item.Variation_Input,
        item.Grade,
        item.Cert_Number,
        item.Existing_Card_ID,
        item.Submission_ID,
        item.Active_Object_Title,
        item.Active_Object_ID,
        item.Contributor_Name,
        item.Contributor_Email,
        item.Contributor_Notes,
        item.Auction_Source_URL,
        item.Review_Notes,
      ]
        .join(" ")
        .toLowerCase();

      return search
        .split(/\s+/)
        .filter(Boolean)
        .every((term) => searchable.includes(term));
    });
  }

  submissions.sort((a, b) => {
    const aTime = new Date(a.Submitted_At).getTime();
    const bTime = new Date(b.Submitted_At).getTime();

    return bTime - aTime;
  });

  return {
    ...data,
    submissions,
  };
}