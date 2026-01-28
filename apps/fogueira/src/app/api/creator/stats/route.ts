import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const GET = async (request: NextRequest) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json(
      { error: "Unauthorized. Wallet address required." },
      { status: 401 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: { creator: true },
    });

    if (!user?.creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 },
      );
    }

    // Count pages
    const pagesCount = await prisma.page.count({
      where: { creatorId: user.creator.id },
    });

    // Count membership products
    const membersCount = await prisma.membershipProduct.count({
      where: { creatorId: user.creator.id },
    });

    // Calculate revenue from completed purchases
    const purchases = await prisma.membershipPurchase.findMany({
      where: {
        membershipProduct: {
          creatorId: user.creator.id,
        },
        status: "completed",
        amountPaid: {
          not: null,
        },
      },
      select: {
        amountPaid: true,
        tokenMint: true,
      },
    });

    // Sum up all amounts (they're stored as strings, need to convert)
    let totalRevenue = 0;
    for (const purchase of purchases) {
      if (purchase.amountPaid) {
        totalRevenue += Number(purchase.amountPaid);
      }
    }

    // Format revenue - assuming 6 decimals for tokens (FOGO token)
    // Convert from smallest unit to readable format
    const revenueValue = totalRevenue / Math.pow(10, 6);
    const revenue = `$${revenueValue.toFixed(2)}`;

    return NextResponse.json({
      pagesCount,
      membersCount,
      revenue,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
};

