import { cacheLife, cacheTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchUserPaymasterData } from "../../../../server/paymaster";

// biome-ignore lint/suspicious/useAwait: "use cache" functions need to be async
const fetchData = async (
  walletAddress: string,
): Promise<ReturnType<typeof fetchUserPaymasterData>> => {
  "use cache";
  cacheTag("user-data");
  cacheLife("seconds");
  return await fetchUserPaymasterData(walletAddress);
};

export const GET = async (request: NextRequest) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    throw new Error(
      "Unauthorized. Failed to get wallet address from request headers.",
    );
  }

  const userData = await fetchData(walletAddress);
  if (!userData) {
    return new Response("User not found", { status: 404 });
  }
  return NextResponse.json(userData);
};
