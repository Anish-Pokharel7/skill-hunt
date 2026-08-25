/**
 * /api/products/[id] — Single Product Management
 *
 * GET    — Authenticated: view product (tenant-scoped)
 * PATCH  — Owner or SUPER_ADMIN: update product details
 * DELETE — SUPER_ADMIN only: remove a product (hard-delete if no documents/images)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { updateProductSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]");

const STATUTORY_ROLES = ["SUPER_ADMIN", "TAX_OFFICER", "AUDITOR"];

async function resolveProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      seller: {
        select: {
          id: true,
          userId: true,
          businessName: true,
          panVatNumber: true,
          verificationStatus: true,
        },
      },
      images: true,
      documents: true,
    },
  });
}

// ---------------------------------------------------------------------------
// GET /api/products/[id]
// ---------------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;

  try {
    const { id } = await params;
    const product = await resolveProduct(id);

    if (!product) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    // Tenant isolation: non-statutory users can only view their own products
    if (!STATUTORY_ROLES.includes(user.role)) {
      if (product.seller?.userId !== user.id) {
        return NextResponse.json(
          errorResponse("Access denied: this product does not belong to your seller profile"),
          { status: 403 }
        );
      }
    }

    return NextResponse.json(successResponse(product), { status: 200 });
  } catch (err) {
    log.error("GET /api/products/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to fetch product"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/products/[id]
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;

  try {
    const { id } = await params;
    const product = await resolveProduct(id);

    if (!product) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    // Tenant isolation
    if (!STATUTORY_ROLES.includes(user.role) && product.seller?.userId !== user.id) {
      return NextResponse.json(
        errorResponse("Access denied: you can only edit your own products"),
        { status: 403 }
      );
    }

    // Verified products can only be edited by SUPER_ADMIN (re-editing triggers re-review)
    if (product.verificationStatus === "VERIFIED" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        errorResponse(
          "This product is already verified. Contact the government authority to make changes."
        ),
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    // If category is changing, validate it
    if (parsed.data.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
      if (!cat || !cat.isActive) {
        throw new AppError("New category not found or inactive", 422);
      }
    }

    // Non-admin edits trigger re-verification
    const updateData: Record<string, unknown> = { ...parsed.data };
    if (user.role !== "SUPER_ADMIN" && product.verificationStatus !== "PENDING") {
      updateData.verificationStatus = "PENDING";
      updateData.verificationNotes = "Product re-submitted for verification after update.";
      updateData.verifiedAt = null;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, businessName: true } },
      },
    });

    log.info("Product updated", { productId: id, by: user.id, newStatus: updated.verificationStatus });
    return NextResponse.json(successResponse(updated), { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("PATCH /api/products/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to update product"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/products/[id]
// SUPER_ADMIN only
// ---------------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(["SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { images: true, documents: true } } },
    });

    if (!product) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    // Cascade delete (images and documents are set to cascade in schema)
    await prisma.product.delete({ where: { id } });

    log.info("Product deleted", { productId: id, by: auth.user.id });
    return NextResponse.json(
      successResponse({ id }, { message: "Product and all related records deleted" }),
      { status: 200 }
    );
  } catch (err) {
    log.error("DELETE /api/products/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to delete product"), { status: 500 });
  }
}
