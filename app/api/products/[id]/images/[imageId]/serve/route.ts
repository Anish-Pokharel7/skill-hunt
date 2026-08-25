/**
 * /api/products/[id]/images/[imageId]/serve — Serve a Product Image
 *
 * GET — Streams the image file from local disk storage.
 * Product images are public — no auth required.
 * Cache-Control and content-type headers are set correctly.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { readStoredFile } from "@/lib/server/storage";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]/images/[imageId]/serve");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id: productId, imageId } = await params;

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

    const buffer = readStoredFile(image.storageReference);
    if (!buffer) {
      log.error("Image file missing from storage", {
        imageId,
        storageReference: image.storageReference,
      });
      return NextResponse.json({ error: "Image file not found on storage." }, { status: 404 });
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "ETag": `"${image.sha256}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    log.error("GET /api/products/[id]/images/[imageId]/serve failed", err);
    return NextResponse.json({ error: "Failed to serve image." }, { status: 500 });
  }
}
