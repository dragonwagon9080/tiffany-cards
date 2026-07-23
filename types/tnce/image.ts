export type TNCEImageSlot = "front" | "back" | "other";

export type TNCEImageSource =
  | "upload"
  | "url"
  | "auction";

export interface TNCEImage {
  id: string;

  source: TNCEImageSource;

  slot: TNCEImageSlot;

  fileName: string;

  contentType: string;

  previewUrl: string;

  file?: File;

  uploaded: boolean;

  uploadUrl?: string;

  width?: number;

  height?: number;

  size?: number;
}

export interface UploadedTNCEImage {
  slot: TNCEImageSlot;

  fileName: string;

  contentType: string;

  uploadUrl: string;
}