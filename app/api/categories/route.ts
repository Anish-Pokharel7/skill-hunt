/**
 * /api/categories — Product Category Management
 *
 * GET  — Public: returns all active categories (optionally all if includeInactive=true for admin)
 * POST — SUPER_ADMIN only: creates a new category
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { createCategorySchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/categories");

// ---------------------------------------------------------------------------
// GET /api/categories
// Public: consumers and apps read this. Admins can pass ?includeInactive=true
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Require auth for inactive visibility
    if (includeInactive) {
      const auth = await requireRoles(
        ["SUPER_ADMIN", "ADMIN", "GOVERNMENT_OFFICIAL", "TAX_OFFICER", "AUDITOR"],
        req
      );
      if (!auth.authorized) return auth.errorResponse!;
    }

    const categories = await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      successResponse(categories, { total: categories.length }),
      { status: 200 }
    );
  } catch (err) {
    log.error("GET /api/categories failed", err);
    return NextResponse.json(errorResponse("Failed to fetch categories"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/categories
// SUPER_ADMIN and ADMIN: create a new product category
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await requireRoles(["SUPER_ADMIN", "ADMIN"], req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;


  const { user } = auth;

  try {
    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { name, slug, description, isActive } = parsed.data;

    // Check slug uniqueness
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError(`Category slug '${slug}' already exists.`, 409);
    }

    const category = await prisma.category.create({
      data: { name, slug, description, isActive },
    });

    log.info("Category created", { categoryId: category.id, by: user.id });

    return NextResponse.json(
      successResponse(category, { message: "Category created successfully" }),
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/categories failed", err);
    return NextResponse.json(errorResponse("Failed to create category"), { status: 500 });
  }
}
