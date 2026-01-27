import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

const onboardSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_-]+$/, "Username can only contain lowercase letters, numbers, underscores, and hyphens"),
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  avatarBlobKey: z.string().optional(),
  bannerBlobKey: z.string().optional(),
});

export const POST = async (request: NextRequest) => {
  const walletAddress = request.headers.get("x-authenticated-user");
  if (!walletAddress) {
    return NextResponse.json(
      { error: "Unauthorized. Wallet address required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const data = onboardSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress },
      include: { creator: true },
    });

    if (existingUser?.creator) {
      return NextResponse.json(
        { error: "Creator profile already exists" },
        { status: 400 }
      );
    }

    // Check username uniqueness
    const usernameTaken = await prisma.creator.findUnique({
      where: { username: data.username },
    });

    if (usernameTaken) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 }
      );
    }

    // Create or get user, then create creator
    const user = existingUser || await prisma.user.create({
      data: { walletAddress },
    });

    const creator = await prisma.creator.create({
      data: {
        userId: user.id,
        username: data.username,
        displayName: data.displayName,
        bio: data.bio ?? null,
        avatarBlobKey: data.avatarBlobKey ?? null,
        bannerBlobKey: data.bannerBlobKey ?? null,
      },
    });

    return NextResponse.json({ creator });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to create creator profile" },
      { status: 500 }
    );
  }
};

