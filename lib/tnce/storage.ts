import "server-only";

import { Storage } from "@google-cloud/storage";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const credentials = JSON.parse(requiredEnv("GCS_KEY"));

export const tnceUploadBucket = requiredEnv("TNCE_UPLOAD_BUCKET");

export const storage = new Storage({
  projectId: credentials.project_id,
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
});