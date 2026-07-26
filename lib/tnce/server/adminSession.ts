import type { NextRequest } from "next/server";

export const TNCE_ADMIN_SESSION_COOKIE =
  "tnce_admin_session";

const SESSION_LENGTH_SECONDS =
  30 * 24 * 60 * 60;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

async function signSessionValue(
  expiresAt: string,
  password: string
) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(expiresAt)
    );

  return bytesToHex(
    new Uint8Array(signature)
  );
}

function constantTimeEqual(
  first: string,
  second: string
) {
  if (first.length !== second.length) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < first.length;
    index++
  ) {
    difference |=
      first.charCodeAt(index) ^
      second.charCodeAt(index);
  }

  return difference === 0;
}

export async function createTNCEAdminSession() {
  const password =
    process.env.TNCE_ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "TNCE admin protection is not configured."
    );
  }

  const expiresAt = String(
    Date.now() +
      SESSION_LENGTH_SECONDS * 1000
  );

  const signature =
    await signSessionValue(
      expiresAt,
      password
    );

  return {
    value:
      expiresAt + "." + signature,
    maxAge: SESSION_LENGTH_SECONDS,
  };
}

export async function isValidTNCEAdminSession(
  request: NextRequest
) {
  const password =
    process.env.TNCE_ADMIN_PASSWORD;

  if (!password) {
    return false;
  }

  const cookieValue =
    request.cookies.get(
      TNCE_ADMIN_SESSION_COOKIE
    )?.value || "";

  const separatorIndex =
    cookieValue.indexOf(".");

  if (separatorIndex <= 0) {
    return false;
  }

  const expiresAt =
    cookieValue.slice(
      0,
      separatorIndex
    );

  const suppliedSignature =
    cookieValue.slice(
      separatorIndex + 1
    );

  const expiration =
    Number(expiresAt);

  if (
    !Number.isFinite(expiration) ||
    expiration <= Date.now() ||
    !suppliedSignature
  ) {
    return false;
  }

  const expectedSignature =
    await signSessionValue(
      expiresAt,
      password
    );

  return constantTimeEqual(
    suppliedSignature,
    expectedSignature
  );
}
