/* ============================================================
   TiffanyCards Network Contribution Engine (TNCE)
   Shared Types
   ============================================================ */

export type TNCEProject =
  | "rpa-tracker"
  | "cards-alert"
  | "tiffany-cards"
  | "guides";

export type TNCESubmissionType =
  | "new"
  | "update"
  | "missing"
  | "correction"
  | "ownership"
  | "image"
  | "other"
  | "new-cards-alert-card"
  | "similar-cards-alert-card";

export type TNCESubmissionMode = "new" | "update" | "missing";

export type TNCESubmissionAction = "new" | "update" | "similar" | "removal";

export type TNCEReviewStatus =
  | "Pending Review"
  | "Needs Info"
  | "Rejected"
  | "Published";

export interface TNCEContributor {
  name?: string;
  email?: string;
}

export interface TNCEImageUrls {
  front?: string;
  back?: string;
  other?: string[];
}

export interface TNCEUploadedImage {
  fileName: string;
  contentType: string;
  slot?: "front" | "back" | "other";
  objectPath?: string;
  publicUrl?: string;
  uploaded?: boolean;
}

export interface TNCEActiveObject {
  id?: string;
  title?: string;
  [key: string]: any;
}

export interface TNCESubmission {
  project: TNCEProject;
  submissionType: TNCESubmissionType;
  submissionMode?: TNCESubmissionMode;
  submissionAction?: TNCESubmissionAction;
  sourcePageUrl: string;
  auctionSourceUrl?: string;
  contributor: TNCEContributor;
  activeObject: TNCEActiveObject;
  submissionId?: string;
  fields: Record<string, any>;
  imageUrls: TNCEImageUrls;
  uploadedImages: TNCEUploadedImage[];
  previousImageUrls?: TNCEImageUrls;
  previousUploadedImages?: TNCEUploadedImage[];
  notes?: string;
}

export interface TNCESuccessResponse {
  ok: true;
  submissionId: string;
  message: string;
}

export interface TNCEErrorResponse {
  ok: false;
  error: string;
}

/* ============================================================
   Admin Dashboard Types
   ============================================================ */

export interface TNCEProductionFields {
  Card_Title: string;
  Serial_Number: string;
  Variation_Input: string;
  Card_History: string;
  Grade: string;
  Cert_Number: string;
  Front_Image: string;
  Back_Image: string;
  Other_Images: string;
}

export interface CardsAlertProductionFields {
  Year: string;
  First: string;
  Last: string;
  Num: string;
  Brand: string;
  Parallel: string;
  Serial_Number: string;
  Grade: string;
  Cert_Number: string;
  Status: string;
  Description: string;
  Sport: string;
  Year_Added: string;
  Site_Link: string;
  Front_Image: string;
  Back_Image: string;
  Additional_Images: string;
  Found_By: string;
}

export type TNCEPublishRecord =
  | TNCEProductionFields
  | CardsAlertProductionFields;

export interface TNCEReviewMetadata {
  Existing_Card_ID: string;
  TNCE_Status: TNCEReviewStatus;
  Submission_ID: string;
  Submitted_At: string;
  Project: TNCEProject;
  Submission_Mode: TNCESubmissionMode;
  Submission_Action?: TNCESubmissionAction;
  Source_Page_URL: string;
  Active_Object_ID: string;
  Active_Object_Title: string;
  Contributor_Name: string;
  Contributor_Email: string;
  Contributor_Notes: string;
  Auction_Source_URL: string;
  Reviewer: string;
  Reviewed_At: string;
  Review_Notes: string;
  Uploaded_Image_URLs: string;
  Previous_Uploaded_Image_URLs?: string;
  Raw_Submission_JSON: string;
}

export interface TNCESubmittedImages {
  Front_Image: string;
  Back_Image: string;
  Other_Images: string[];
  Uploaded_Images: Array<{
    fileName?: string;
    contentType?: string;
    slot?: "front" | "back" | "other";
    publicUrl?: string;
    uploaded?: boolean;
  }>;
}

export interface TNCEAdminSubmission
  extends TNCEProductionFields,
    TNCEReviewMetadata {
  rowNumber?: number;

  Year?: string;
  First?: string;
  Last?: string;
  Num?: string;
  Brand?: string;
  Parallel?: string;
  Status?: string;
  Description?: string;
  Sport?: string;
  Year_Added?: string;
  Site_Link?: string;
  Additional_Images?: string;
  Found_By?: string;

  Current_Source_URLs?: string;
  Previous_Grade?: string;
  Previous_Cert_Number?: string;
  Previous_Source_URLs?: string;
  Previous_Front_Image?: string;
  Previous_Back_Image?: string;
  Previous_Additional_Images?: string;

  Existing_Production_Record?: Record<string, any>;
  Submitted_Images?: TNCESubmittedImages;
  Previous_Submitted_Images?: TNCESubmittedImages;
}

export interface TNCEAdminStats {
  total: number;
  pending: number;
  needsInfo: number;
  rejected: number;
  published: number;
}

export interface TNCEAdminFilters {
  project: TNCEProject | "all";
  status: TNCEReviewStatus | "all";
  search: string;
}

export interface TNCEAdminQueueResponse {
  ok: boolean;
  submissions: TNCEAdminSubmission[];
  stats: TNCEAdminStats;
  refreshedAt?: string;
  error?: string;
}

export interface TNCEAdminActionRequest {
  project: TNCEProject;
  submissionId: string;
  action: "needs-info" | "reject" | "publish" | "reset-pending";
  reviewNotes?: string;
}

export interface TNCEAdminActionResponse {
  ok: boolean;
  submissionId: string;
  status?: TNCEReviewStatus;
  message?: string;
  error?: string;
}