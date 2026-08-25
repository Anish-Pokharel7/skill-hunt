/**
 * /api/public/products — Public Product Catalogue
 *
 * GET — Returns paginated, publicly visible products.
 *
 * Visibility Rule:
 *   VERIFIED → PUBLIC
 *   All other statuses (DRAFT, SUBMITTED, UNDER_REVIEW, REJECTED,
 *   CHANGES_REQUESTED, RESUBMITTED, PENDING) → PRIVATE (excluded)
 *
 * No authentication required.
 * Sensitive fields (actualCost, seller internal data, reviewer info,
 * government notes, storageReferences) are stripped from responses.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/public/products");

// The only status exposed to the public
const PUBLIC_STATUSES = ["VERIFIED", "APPROVED"];

// Fields stripped from all public responses for each related model
const PUBLIC_IMAGE_SELECT = {
  id: true,
  url: true,
  altText: true,
  isPrimary: true,
  sortOrder: true,
  mimeType: true,
  // storageReference intentionally excluded
};

const PUBLIC_CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
};

const PUBLIC_SELLER_SELECT = {
  id: true,
  businessName: true,
  // panVatNumber, contactEmail, contactPhone, address, verificationNotes excluded
};

// ─── GET /api/public/products ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "24", 10)));
  const skip = (page - 1) * pageSize;

  // Filters
  const categorySlug = searchParams.get("category");   // filter by category slug
  const categoryId = searchParams.get("categoryId");    // filter by category ID
  const search = searchParams.get("search") || searchParams.get("q"); // free-text search
  const brand = searchParams.get("brand");
  const origin = searchParams.get("origin");            // IMPORTED | DOMESTIC_MANUFACTURED
  const vatApplicable = searchParams.get("vatApplicable"); // true | false
  const minPrice = parseFloat(searchParams.get("minPrice") || "0") || 0;
  const maxPrice = parseFloat(searchParams.get("maxPrice") || "0") || 0;
  const isNepalMade = searchParams.get("isNepalMade");  // true | false
  const currency = searchParams.get("currency") || "NPR";

  // Sort
  const sortBy = searchParams.get("sortBy") || "createdAt"; // name | consumerPrice | createdAt | approvedAt
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const ALLOWED_SORT_FIELDS = ["name", "consumerPrice", "createdAt", "approvedAt", "brand"];
  const resolvedSort = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";

  try {
    // Resolve category by slug if provided
    let resolvedCategoryId = categoryId;
    if (categorySlug && !resolvedCategoryId) {
      const cat = await prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      resolvedCategoryId = cat?.id ?? null;
    }

    const where: Record<string, any> = {
      verificationStatus: { in: PUBLIC_STATUSES },
      ...(resolvedCategoryId ? { categoryId: resolvedCategoryId } : {}),
      ...(brand ? { brand: { contains: brand } } : {}),
      ...(origin ? { originType: origin } : {}),
      ...(isNepalMade === "true" ? { isNepalManufactured: true } : {}),
      ...(isNepalMade === "false" ? { isNepalManufactured: false } : {}),
      ...(vatApplicable === "true" ? { isVatApplicable: true } : {}),
      ...(vatApplicable === "false" ? { isVatApplicable: false } : {}),
      ...(currency ? { currency } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
              { brand: { contains: search } },
              { manufacturerName: { contains: search } },
            ],
          }
        : {}),
      ...(minPrice > 0 || maxPrice > 0
        ? {
            consumerPrice: {
              ...(minPrice > 0 ? { gte: minPrice } : {}),
              ...(maxPrice > 0 ? { lte: maxPrice } : {}),
            },
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [resolvedSort]: sortDir },
        select: {
          id: true,
          name: true,
          description: true,
          brand: true,
          model: true,
          manufacturerName: true,
          countryOfOrigin: true,
          originType: true,
          isNepalManufactured: true,
          isVatApplicable: true,
          vatRate: true,
          consumerPrice: true,  // MRP only — actualCost intentionally excluded
          currency: true,
          verificationStatus: true,
          approvedAt: true,
          createdAt: true,
          // Internal/sensitive fields excluded:
          // actualCost, vatPaid, verificationNotes, rejectionReason,
          // reviewerId, reviewerName, reviewerRole, reviewStartedAt,
          // changesRequestedAt, changesRequestedNotes, submissionNotes
          category: { select: PUBLIC_CATEGORY_SELECT },
          seller: { select: PUBLIC_SELLER_SELECT },
          images: {
            select: PUBLIC_IMAGE_SELECT,
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Build a brief price summary with VAT display
    const enriched = products.map((p) => ({
      ...p,
      priceDisplay: {
        currency: p.currency,
        mrp: p.consumerPrice,
        vatIncluded: p.isVatApplicable,
        vatRate: p.isVatApplicable ? `${(p.vatRate * 100).toFixed(0)}%` : "Exempt",
        priceLabel: `${p.currency} ${p.consumerPrice.toLocaleString()}`,
      },
      primaryImage: p.images.find((img) => img.isPrimary) || p.images[0] || null,
    }));

    return NextResponse.json(
      {
        success: true,
        data: enriched,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          timestamp: new Date().toISOString(),
          filters: {
            ...(search ? { search } : {}),
            ...(categorySlug || resolvedCategoryId
              ? { category: categorySlug || resolvedCategoryId }
              : {}),
            ...(brand ? { brand } : {}),
          },
        },
      },
      {
        status: 200,
        headers: {
          // Public product catalogue — cacheable at edge for 60s
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    log.error("GET /api/public/products failed", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch public product catalogue." },
      { status: 500 }
    );
  }
}
