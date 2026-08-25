/**
 * /api/categories/[id] — Single Category Management
 *
 * GET    — Public: get a single category with product count
 * PATCH  — SUPER_ADMIN only: update a category
 * DELETE — SUPER_ADMIN only: soft-delete (isActive = false)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { updateCategorySchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/categories/[id]");

// ---------------------------------------------------------------------------
// GET /api/categories/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      return NextResponse.json(errorResponse("Category not found"), { status: 404 });
    }

    return NextResponse.json(successResponse(category), { status: 200 });
  } catch (err) {
    log.error("GET /api/categories/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to fetch category"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/categories/[id]
// SUPER_ADMIN only
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(["SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    // Check slug uniqueness if being changed
    if (parsed.data.slug) {
      const existing = await prisma.category.findFirst({
        where: { slug: parsed.data.slug, NOT: { id } },
      });
      if (existing) {
        throw new AppError(`Category slug '${parsed.data.slug}' is already taken.`, 409);
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });

    log.info("Category updated", { categoryId: id, by: auth.user.id });
    return NextResponse.json(successResponse(updated), { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("PATCH /api/categories/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to update category"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/categories/[id]
// SUPER_ADMIN only — soft-delete (marks inactive, never hard-deletes)
// ---------------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(["SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  try {
    const { id } = await params;

    // Prevent hard deletion if products reference this category
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      // Soft deactivate instead of hard delete
      await prisma.category.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json(
        successResponse(
          { id, deactivated: true },
          { message: `Category deactivated (${productCount} products still reference it — cannot hard-delete)` }
        ),
        { status: 200 }
      );
    }

    await prisma.category.delete({ where: { id } });
    log.info("Category deleted", { categoryId: id, by: auth.user.id });
    return NextResponse.json(
      successResponse({ id }, { message: "Category deleted" }),
      { status: 200 }
    );
  } catch (err) {
    log.error("DELETE /api/categories/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to delete category"), { status: 500 });
  }
}
