import { cacheTag, cacheLife } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { fetchUserPaymasterData } from "../../../../server/paymaster";

const fetchData = async (
  walletAddress: string,
): Promise<ReturnType<typeof fetchUserPaymasterData>> => {
  "use cache";
  cacheTag("user-data");
  cacheLife("seconds");
  return fetchUserPaymasterData(walletAddress);
};

export const GET = async (request: NextRequest) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }

  const userData = await fetchData(walletAddress);
  if (!userData) {
    return NextResponse.json("User not found", { status: 404 });
  }
  return NextResponse.json(userData);
};
