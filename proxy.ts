import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const adminPassword = process.env.TNCE_ADMIN_PASSWORD;

  if (!adminPassword) {
    return new NextResponse(
      "TNCE admin protection is not configured.",
      {
        status: 500,
      }
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (authorization) {
    const [scheme, encodedCredentials] =
      authorization.split(" ");

    if (
      scheme?.toLowerCase() === "basic" &&
      encodedCredentials
    ) {
      try {
        const decodedCredentials =
          atob(encodedCredentials);

        const separatorIndex =
          decodedCredentials.indexOf(":");

        const username =
          separatorIndex >= 0
            ? decodedCredentials.slice(
                0,
                separatorIndex
              )
            : "";

        const password =
          separatorIndex >= 0
            ? decodedCredentials.slice(
                separatorIndex + 1
              )
            : "";

        if (
          username === "admin" &&
          password === adminPassword
        ) {
          return NextResponse.next();
        }
      } catch {
        // Invalid Basic Auth header.
      }
    }
  }

  return new NextResponse(
    "Authentication required.",
    {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Basic realm="TNCE Admin", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    }
  );
}

export const config = {
  matcher: [
    "/admin/tnce/:path*",
    "/api/tnce/admin/:path*",
  ],
};