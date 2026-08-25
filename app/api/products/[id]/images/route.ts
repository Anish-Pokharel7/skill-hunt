/**
 * /api/products/[id]/images — Product Image Management
 *
 * GET    — List all images for a product (public)
 * POST   — Upload a new product image (multipart/form-data or base64 JSON)
 * DELETE — Remove a specific image by imageId (query param)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";
import {
  storeProductImage,
  deleteStoredFile,
  validateImageFile,
  parseBase64DataUri,
  sanitizeFilename,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
} from "@/lib/server/storage";

const log = Logger.child("api/products/[id]/images");

const SELLER_ROLES = ["SELLER", "MANUFACTURER", "IMPORTER", "BUSINESS_EMPLOYEE"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

// ---------------------------------------------------------------------------
// GET /api/products/[id]/images — List product images (public)
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const images = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        productId: true,
        url: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        altText: true,
        isPrimary: true,
        sortOrder: true,
        metadata: true,
        createdAt: true,
        // storageReference is intentionally excluded from public listing
      },
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

// ---------------------------------------------------------------------------
// POST /api/products/[id]/images — Upload product image
//
// Accepts JSON body with base64-encoded image data:
// {
//   "data": "data:image/jpeg;base64,/9j/4AAQ...",  — base64 data URI
//   "filename": "product-front.jpg",
//   "altText": "Front view of product",
//   "isPrimary": true,
//   "sortOrder": 0
// }
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;
  const isAdmin = ADMIN_ROLES.includes(user.role);
  const isSeller = [...SELLER_ROLES].includes(user.role);

  if (!isAdmin && !isSeller) {
    return NextResponse.json(
      errorResponse("Access denied: Only sellers and administrators can upload product images."),
      { status: 403 }
    );
  }

  try {
    const { id: productId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true },
    });

    if (!product) {
      return NextResponse.json(errorResponse("Product not found."), { status: 404 });
    }

    // Ownership check: seller can only manage their own product's images
    if (!isAdmin && product.seller?.userId !== user.id) {
      return NextResponse.json(
        errorResponse("Access denied: You can only upload images to your own products."),
        { status: 403 }
      );
    }

    // Enforce image count limit
    const existingCount = await prisma.productImage.count({ where: { productId } });
    if (existingCount >= MAX_IMAGES_PER_PRODUCT) {
      return NextResponse.json(
        errorResponse(
          `Image limit reached. A product may have at most ${MAX_IMAGES_PER_PRODUCT} images. Please delete an existing image first.`
        ),
        { status: 422 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { data, filename, altText, isPrimary = false, sortOrder = 0 } = body;

    if (!data || typeof data !== "string") {
      return NextResponse.json(
        errorResponse("Missing required field: 'data' must be a base64-encoded data URI (e.g. data:image/jpeg;base64,...)"),
        { status: 422 }
      );
    }

    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        errorResponse("Missing required field: 'filename'"),
        { status: 422 }
      );
    }

    // Parse and validate base64 data URI
    const parsed = parseBase64DataUri(data);
    if (!parsed) {
      return NextResponse.json(
        errorResponse("Invalid image data. Must be a valid base64-encoded data URI (data:image/jpeg;base64,...)."),
        { status: 422 }
      );
    }

    const { buffer, mimeType } = parsed;
    const validationError = validateImageFile(buffer, mimeType, filename);
    if (validationError) {
      return NextResponse.json(
        errorResponse(validationError, {
          allowedTypes: ALLOWED_IMAGE_MIME_TYPES,
          allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
          maxSizeMB: MAX_IMAGE_SIZE_BYTES / (1024 * 1024),
        }),
        { status: 422 }
      );
    }

    // If this is set as primary, unset any existing primary
    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Store file on disk
    const stored = await storeProductImage(productId, buffer, mimeType, filename);

    // Build public URL (served via the serve endpoint below)
    const imageRecord = await prisma.productImage.create({
      data: {
        productId,
        storageReference: stored.storageReference,
        url: `/api/products/${productId}/images/serve?ref=${encodeURIComponent(stored.storageReference)}`,
        originalFilename: stored.sanitizedName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        altText: altText || null,
        isPrimary: !!isPrimary,
        sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
        uploadedByUserId: user.id,
        metadata: JSON.stringify({ sha256: stored.sha256, uploadedAt: stored.uploadedAt }),
      },
    });

    // Update the URL to include the image ID for cleaner serving
    const updated = await prisma.productImage.update({
      where: { id: imageRecord.id },
      data: { url: `/api/products/${productId}/images/${imageRecord.id}/serve` },
    });

    log.info("Product image uploaded", {
      imageId: updated.id,
      productId,
      sizeBytes: stored.sizeBytes,
      uploadedBy: user.id,
    });

    return NextResponse.json(
      successResponse(
        {
          id: updated.id,
          productId: updated.productId,
          url: updated.url,
          originalFilename: updated.originalFilename,
          mimeType: updated.mimeType,
          sizeBytes: updated.sizeBytes,
          altText: updated.altText,
          isPrimary: updated.isPrimary,
          sortOrder: updated.sortOrder,
          createdAt: updated.createdAt,
        },
        { message: "Image uploaded and attached to product successfully." }
      ),
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/products/[id]/images failed", err);
    return NextResponse.json(errorResponse("Failed to upload product image."), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/products/[id]/images?imageId=... — Delete a product image
// ---------------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;
  const isAdmin = ADMIN_ROLES.includes(user.role);
  const isSeller = [...SELLER_ROLES].includes(user.role);

  if (!isAdmin && !isSeller) {
    return NextResponse.json(
      errorResponse("Access denied: Only sellers and administrators can delete product images."),
      { status: 403 }
    );
  }

  try {
    const { id: productId } = await params;
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json(
        errorResponse("Missing required query parameter: imageId"),
        { status: 422 }
      );
    }

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
      include: { product: { include: { seller: true } } },
    });

    if (!image) {
      return NextResponse.json(errorResponse("Image not found."), { status: 404 });
    }

    // Ownership check
    if (!isAdmin && image.product.seller?.userId !== user.id) {
      return NextResponse.json(
        errorResponse("Access denied: You can only delete images from your own products."),
        { status: 403 }
      );
    }

    // Delete from disk
    deleteStoredFile(image.storageReference);

    // Delete from database
    await prisma.productImage.delete({ where: { id: imageId } });

    // If deleted was primary, promote the next image
    if (image.isPrimary) {
      const next = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      if (next) {
        await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }

    log.info("Product image deleted", { imageId, productId, deletedBy: user.id });

    return NextResponse.json(
      successResponse({ imageId }, { message: "Image deleted successfully." }),
      { status: 200 }
    );
  } catch (err) {
    log.error("DELETE /api/products/[id]/images failed", err);
    return NextResponse.json(errorResponse("Failed to delete product image."), { status: 500 });
  }
}
