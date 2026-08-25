/**
 * /api/products/[id] — Single Product Management (CRUD)
 *
 * GET    — View product details (public for VERIFIED, tenant-scoped for unverified/drafts)
 * PATCH  — Owner seller, ADMIN, or SUPER_ADMIN: update product details
 * DELETE — Owner seller, ADMIN, or SUPER_ADMIN: delete product and cascade cleanups
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { updateProductSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { recordProductFieldDiffs } from "@/lib/server/product-history";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]");

const STATUTORY_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "GOVERNMENT_OFFICIAL",
  "TAX_OFFICER",
  "AUDITOR",
] as const;

function isStatutory(role: string): boolean {
  return STATUTORY_ROLES.includes(role as (typeof STATUTORY_ROLES)[number]);
}

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
      submissions: { orderBy: { timestamp: "desc" } },
      history: { orderBy: { createdAt: "desc" } },
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

    // Access control:
    // 1. Statutory roles can view all products
    // 2. Verified products are accessible to all authenticated users
    // 3. Unverified (PENDING/REJECTED/FLAGGED) products can ONLY be viewed by the owner seller
    const isOwner = product.seller?.userId === user.id;
    if (!isStatutory(user.role) && !isOwner && product.verificationStatus !== "VERIFIED") {
      return NextResponse.json(
        errorResponse("Access denied: this product does not belong to your seller profile"),
        { status: 403 }
      );
    }

    return NextResponse.json(successResponse(product), { status: 200 });
  } catch (err) {
    log.error("GET /api/products/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to fetch product"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/products/[id] — Edit Product
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(
    ["SELLER", "BUSINESS_EMPLOYEE", "MANUFACTURER", "IMPORTER", "ADMIN", "SUPER_ADMIN"],
    req
  );
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;

  try {
    const { id } = await params;
    const product = await resolveProduct(id);

    if (!product) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

    // Strict Product Ownership Validation: A seller must never be able to modify another seller's product
    if (!isAdmin) {
      if (!product.seller || product.seller.userId !== user.id) {
        return NextResponse.json(
          errorResponse("Access denied: you can only edit your own products"),
          { status: 403 }
        );
      }

      // Seller Validation: Check user's seller status
      const ownSeller = await prisma.seller.findUnique({ where: { userId: user.id } });
      if (!ownSeller) {
        throw new AppError("Seller profile not found. Please register as a seller first.", 403);
      }
      if (ownSeller.verificationStatus === "SUSPENDED") {
        throw new AppError("Your seller account is suspended. You cannot edit products.", 403);
      }
    }

    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    // Category Validation: If categoryId is provided, verify it exists and is active
    if (parsed.data.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
      if (!cat || !cat.isActive) {
        throw new AppError("Category not found or is inactive", 422);
      }
    }

    // Build update payload
    const updateData: Record<string, unknown> = { ...parsed.data };

    // Non-admin edits to verified/rejected products trigger re-verification workflow
    if (!isAdmin && product.verificationStatus !== "PENDING") {
      updateData.verificationStatus = "PENDING";
      updateData.verificationNotes = "Product re-submitted for verification after update.";
      updateData.verifiedAt = null;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: {
          select: {
            id: true,
            businessName: true,
            panVatNumber: true,
            verificationStatus: true,
          },
        },
        images: true,
        documents: true,
        history: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    // Record granular field history
    const reason = typeof body.reason === "string" ? body.reason : null;
    await recordProductFieldDiffs({
      productId: id,
      oldProduct: product,
      updatedData: updateData,
      user: { id: user.id, name: user.name, role: user.role },
      reason,
      metadata: { ip: req.headers.get("x-forwarded-for") || "127.0.0.1" },
    });

    log.info("Product updated and change history recorded", {
      productId: id,
      by: user.id,
      newStatus: updated.verificationStatus,
    });

    return NextResponse.json(
      successResponse(updated, { message: "Product updated successfully." }),
      { status: 200 }
    );

  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("PATCH /api/products/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to update product"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/products/[id] — Delete Product
// ---------------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(
    ["SELLER", "BUSINESS_EMPLOYEE", "MANUFACTURER", "IMPORTER", "ADMIN", "SUPER_ADMIN"],
    req
  );
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;

  try {
    const { id } = await params;
    const product = await resolveProduct(id);

    if (!product) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

    // Strict Product Ownership Validation: A seller must never be able to delete another seller's product
    if (!isAdmin) {
      if (!product.seller || product.seller.userId !== user.id) {
        return NextResponse.json(
          errorResponse("Access denied: you can only delete your own products"),
          { status: 403 }
        );
      }

      // Seller Validation: Check user's seller status
      const ownSeller = await prisma.seller.findUnique({ where: { userId: user.id } });
      if (!ownSeller) {
        throw new AppError("Seller profile not found.", 403);
      }
      if (ownSeller.verificationStatus === "SUSPENDED") {
        throw new AppError("Your seller account is suspended. You cannot delete products.", 403);
      }
    }

    // Cascade delete product and all related images/documents
    await prisma.product.delete({ where: { id } });

    log.info("Product deleted", { productId: id, by: user.id });

    return NextResponse.json(
      successResponse({ id }, { message: "Product and all related records deleted successfully." }),
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("DELETE /api/products/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to delete product"), { status: 500 });
  }
}
