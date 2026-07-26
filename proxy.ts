import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createTNCEAdminSession,
  isValidTNCEAdminSession,
  TNCE_ADMIN_SESSION_COOKIE,
} from "@/lib/tnce/server/adminSession";

export async function proxy(
  request: NextRequest
) {
  const adminPassword =
    process.env.TNCE_ADMIN_PASSWORD;

  if (!adminPassword) {
    return new NextResponse(
      "TNCE admin protection is not configured.",
      {
        status: 500,
      }
    );
  }

  /*
   * A valid signed session keeps TNCE Admin unlocked
   * and will later authorize Owner Quick Publish.
   */
  if (
    await isValidTNCEAdminSession(
      request
    )
  ) {
    return NextResponse.next();
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (authorization) {
    const [scheme, encodedCredentials] =
      authorization.split(" ");

    if (
      scheme?.toLowerCase() ===
        "basic" &&
      encodedCredentials
    ) {
      try {
        const decodedCredentials =
          atob(encodedCredentials);

        const separatorIndex =
          decodedCredentials.indexOf(
            ":"
          );

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
          const session =
            await createTNCEAdminSession();

          const response =
            NextResponse.next();

          response.cookies.set(
            TNCE_ADMIN_SESSION_COOKIE,
            session.value,
            {
              httpOnly: true,
              secure:
                process.env.NODE_ENV ===
                "production",
              sameSite: "strict",
              path: "/",
              maxAge: session.maxAge,
            }
          );

          return response;
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