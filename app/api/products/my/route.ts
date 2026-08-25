/**
 * /api/products/my — Authenticated Seller's Product Management
 *
 * GET — Authenticated: retrieve all products belonging strictly to the authenticated seller
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/rbac";
import { paginatedResponse, errorResponse } from "@/lib/server/api-response";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/my");

const STATUTORY_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "GOVERNMENT_OFFICIAL",
  "TAX_OFFICER",
  "AUDITOR",
] as const;

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
  const originType = searchParams.get("originType"); // IMPORTED | DOMESTIC_MANUFACTURED
  const search = searchParams.get("search");

  try {
    const isStatutory = STATUTORY_ROLES.includes(user.role as (typeof STATUTORY_ROLES)[number]);
    const seller = await prisma.seller.findUnique({ where: { userId: user.id } });

    if (!seller && !isStatutory) {
      return NextResponse.json(
        errorResponse("No seller profile found for your account. Please register as a seller first."),
        { status: 404 }
      );
    }

    // Determine target seller ID
    const targetSellerId = seller?.id || (isStatutory ? searchParams.get("sellerId") || undefined : undefined);

    const where = {
      ...(targetSellerId ? { sellerId: targetSellerId } : {}),
      ...(status ? { verificationStatus: status } : {}),
      ...(categoryId ? { categoryId } : {}),
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
          _count: { select: { documents: true, images: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    log.info("Fetched seller products", {
      userId: user.id,
      sellerId: seller?.id,
      count: products.length,
      total,
    });

    return NextResponse.json(paginatedResponse(products, total, page, pageSize), { status: 200 });
  } catch (err) {
    log.error("GET /api/products/my failed", err);
    return NextResponse.json(errorResponse("Failed to fetch seller products"), { status: 500 });
  }
}
