/**
 * /api/products/[id]/images — Product Images Management
 *
 * GET  — Retrieve all images associated with a product
 * POST — Attach a new verified product image with metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/rbac";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";
import { z } from "zod";

const log = Logger.child("api/products/[id]/images");

const addImageSchema = z.object({
  url: z.string().url("Valid image URL is required"),
  metadata: z.string().optional(), // JSON or description
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const images = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      successResponse(images, { total: images.length }),
      { status: 200 }
    );
  } catch (err) {
    log.error("GET /api/products/[id]/images failed", err);
    return NextResponse.json(errorResponse("Failed to fetch product images"), { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;

  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    // IDOR / Tenant check
    if (user.role !== "SUPER_ADMIN" && product.seller?.userId !== user.id) {
      return NextResponse.json(
        errorResponse("Access denied: You cannot upload images to another seller's product"),
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = addImageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { url, metadata } = parsed.data;

    const image = await prisma.productImage.create({
      data: {
        productId: id,
        url,
        metadata: metadata || null,
      },
    });

    log.info("Product image attached", {
      imageId: image.id,
      productId: id,
      uploadedBy: user.id,
    });

    return NextResponse.json(
      successResponse(image, { message: "Product image attached successfully." }),
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/products/[id]/images failed", err);
    return NextResponse.json(errorResponse("Failed to attach product image"), {
      status: 500,
    });
  }
}
