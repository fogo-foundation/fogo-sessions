import { verifyLogInToken } from "@fogo/sessions-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { connection } from "./fogo-connection";

export const config = {
  matcher: "/api/:path*",
};

export default async function proxy(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const sessionToken = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!sessionToken) {
    return NextResponse.json("Missing token", { status: 401 });
  }

  try {
    const acc = await verifyLogInToken(sessionToken, connection);
    if (!acc) {
      return NextResponse.json("Invalid session token", { status: 401 });
    }

    // Add the authenticated user wallet address info to request headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-authenticated-user", acc.user.toString());

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    return NextResponse.json(
      error instanceof Error ? error.message : "Authentication failed",
      { status: 401 },
    );
  }
}
