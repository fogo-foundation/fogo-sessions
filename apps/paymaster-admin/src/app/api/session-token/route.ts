import { verifyLogInToken } from "@fogo/sessions-sdk";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from 'next/headers'


import { connection } from "../../../fogo-connection";
const ONE_WEEK = 60 * 60 * 24 * 7;

export const GET = async (request: NextRequest) => {
  const sessionToken = request.nextUrl.searchParams.get("sessionToken");
  if (!sessionToken) {
    return NextResponse.json({ error: "No session token" }, { status: 401 });
  }
  const acc = await verifyLogInToken(sessionToken, connection);
  if (!acc) {
    return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
  }
  const cookieStore = await cookies();
  cookieStore.set("sessionToken", sessionToken, {
    maxAge: ONE_WEEK,
  });
  return NextResponse.json({ address: acc.user });
}
