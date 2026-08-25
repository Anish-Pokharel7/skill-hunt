/**
 * /api/products — Product Registry
 *
 * GET  — Authenticated: list products (tenant-scoped for sellers, full list for statutory roles)
 * POST — BUSINESS_EMPLOYEE (verified seller) or SUPER_ADMIN: register a new product
 *
 * Authorization model:
 *   - BUSINESS_EMPLOYEE sees only their own seller's products
 *   - MANUFACTURER / IMPORTER sees own org's products (via seller linkage)
 *   - SUPER_ADMIN, TAX_OFFICER, AUDITOR have system-wide read access
 *   - Products start as PENDING and must be verified by SUPER_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { createProductSchema } from "@/lib/server/validators";
import { successResponse, paginatedResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products");

const STATUTORY_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "GOVERNMENT_OFFICIAL",
  "TAX_OFFICER",
  "AUDITOR",
] as const;
type StatutoryRole = (typeof STATUTORY_ROLES)[number];

function isStatutory(role: string): role is StatutoryRole {
  return STATUTORY_ROLES.includes(role as StatutoryRole);
}

// ---------------------------------------------------------------------------
// GET /api/products
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;
  const { searchParams } = new URL(req.url);

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "25", 10));
  const skip = (page - 1) * pageSize;

  // Filters
  const status = searchParams.get("status"); // PENDING | VERIFIED | REJECTED | FLAGGED
  const categoryId = searchParams.get("categoryId");
  const sellerId = searchParams.get("sellerId");
  const search = searchParams.get("search");
  const originType = searchParams.get("originType"); // IMPORTED | DOMESTIC_MANUFACTURED

  try {
    // Tenant scoping: non-statutory users can only see their own seller's products
    let sellerFilter: { sellerId?: string } = {};
    if (!isStatutory(user.role)) {
      const ownSeller = await prisma.seller.findUnique({ where: { userId: user.id } });
      if (!ownSeller) {
        // User hasn't registered as a seller — return empty list
        return NextResponse.json(paginatedResponse([], 0, page, pageSize), { status: 200 });
      }
      sellerFilter = { sellerId: ownSeller.id };
    }

    const where = {
      ...sellerFilter,
      ...(status ? { verificationStatus: status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(sellerId && isStatutory(user.role) ? { sellerId } : {}),
      ...(originType ? { originType } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { brand: { contains: search } },
              { model: { contains: search } },
              { manufacturerName: { contains: search } },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
          images: { select: { id: true, url: true, metadata: true } },
          _count: { select: { documents: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(products, total, page, pageSize), { status: 200 });
  } catch (err) {
    log.error("GET /api/products failed", err);
    return NextResponse.json(errorResponse("Failed to fetch products"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/products — Register a new product
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await requireRoles(
    ["SELLER", "BUSINESS_EMPLOYEE", "MANUFACTURER", "IMPORTER", "ADMIN", "SUPER_ADMIN"],
    req
  );
  if (!auth.authorized || !auth.user) return auth.errorResponse!;


  const { user } = auth;

  try {
    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const {
      name,
      description,
      brand,
      model,
      categoryId,
      manufacturerName,
      countryOfOrigin,
      originType,
      isNepalManufactured,
      isVatApplicable,
      vatRate,
      actualCost,
      consumerPrice,
      currency,
    } = parsed.data;

    // Validate category exists and is active
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || !category.isActive) {
      throw new AppError("Category not found or is inactive", 422);
    }

    // Resolve seller: non-admin users must have a verified seller profile
    let sellerId: string | null = null;

    if (user.role !== "SUPER_ADMIN") {
      const seller = await prisma.seller.findUnique({ where: { userId: user.id } });
      if (!seller) {
        throw new AppError(
          "You must have a registered seller profile before listing products. Please register as a seller first.",
          403
        );
      }
      if (seller.verificationStatus !== "VERIFIED") {
        throw new AppError(
          `Your seller profile status is '${seller.verificationStatus}'. Only verified sellers may list products.`,
          403
        );
      }
      sellerId = seller.id;
    } else {
      // SUPER_ADMIN can optionally link to a specific seller
      if (body.sellerId) {
        const seller = await prisma.seller.findUnique({ where: { id: body.sellerId } });
        if (!seller) throw new AppError("Specified seller not found", 404);
        sellerId = seller.id;
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        brand,
        model: model ?? null,
        categoryId,
        sellerId,
        manufacturerName,
        countryOfOrigin,
        originType,
        isNepalManufactured,
        isVatApplicable,
        vatRate,
        vatPaid: 0.0,
        actualCost,
        consumerPrice,
        currency,
        // SUPER_ADMIN's products are auto-verified; others start PENDING
        verificationStatus: user.role === "SUPER_ADMIN" ? "VERIFIED" : "PENDING",
        verificationNotes:
          user.role === "SUPER_ADMIN"
            ? "Auto-verified by Government Authority on creation."
            : null,
        verifiedAt: user.role === "SUPER_ADMIN" ? new Date() : null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, businessName: true, verificationStatus: true } },
      },
    });

    log.info("Product registered", {
      productId: product.id,
      name,
      status: product.verificationStatus,
      by: user.id,
    });

    return NextResponse.json(
      successResponse(product, {
        message:
          product.verificationStatus === "VERIFIED"
            ? "Product registered and verified."
            : "Product submitted for verification. You will be notified once reviewed by the government authority.",
      }),
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/products failed", err);
    return NextResponse.json(errorResponse("Failed to register product"), { status: 500 });
  }
}
