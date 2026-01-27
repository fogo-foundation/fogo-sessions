import { put } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

/**
 * POST /api/creator/assets/upload
 *
 * Upload a file to Vercel Blob storage.
 * Requires authentication via the middleware.
 */
export async function POST(request: NextRequest) {
  try {
    // Get creator from auth header (set by middleware)
    const walletAddress = request.headers.get("x-authenticated-user");

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get creator
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Allowed: images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV)",
        },
        { status: 400 },
      );
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${user.creator.id}/${timestamp}-${sanitizedName}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    // Save asset record in database
    const asset = await prisma.asset.create({
      data: {
        creatorId: user.creator.id,
        blobKey: blob.url,
        mimeType: file.type,
        sizeBytes: file.size,
        filename: file.name,
      },
    });

    return NextResponse.json({
      asset: {
        id: asset.id,
        url: blob.url,
        mimeType: asset.mimeType,
        filename: asset.filename,
        sizeBytes: asset.sizeBytes,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
