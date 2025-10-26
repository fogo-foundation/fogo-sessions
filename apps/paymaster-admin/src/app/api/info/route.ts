import { verifyLogInToken } from "@fogo/sessions-sdk";
import { NextResponse, type NextRequest } from "next/server";


import { connection } from "../../../fogo-connection";
import { fetchUserPaymasterData } from "../../../server/paymaster";



export const GET = async (request: NextRequest) => {
  const sessionToken = request.nextUrl.searchParams.get("sessionToken");
  if (!sessionToken) {
    return NextResponse.json({ error: "No session token" }, { status: 401 });
  }
  const acc = await verifyLogInToken(sessionToken, connection);
  if (!acc) {
    return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
  }
 const paymasterData = await fetchUserPaymasterData({ walletAddress: acc.user.toString() });
  return NextResponse.json({ paymasterData});
}
