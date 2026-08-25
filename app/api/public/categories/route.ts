/**
 * /api/public/categories — Public Category Directory
 *
 * GET — Returns all active categories with VERIFIED product counts.
 *       No authentication required.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/public/categories");

const PUBLIC_STATUSES = ["VERIFIED", "APPROVED"];

export async function GET(_req: NextRequest) {
  try {
    // Fetch categories and their VERIFIED product counts in two steps
    // to avoid Prisma's _count-with-where TypeScript ambiguity.
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    // Count VERIFIED products per category
    const counts = await prisma.product.groupBy({
      by: ["categoryId"],
      where: { verificationStatus: { in: PUBLIC_STATUSES } },
      _count: { id: true },
    });

    const countMap = new Map(counts.map((c) => [c.categoryId, c._count.id]));

    const shaped = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      createdAt: cat.createdAt,
      productCount: countMap.get(cat.id) ?? 0,
    }));

    // Sort most-populated first, then alphabetically
    shaped.sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));

    return NextResponse.json(
      {
        success: true,
        data: shaped,
        meta: {
          total: shaped.length,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    log.error("GET /api/public/categories failed", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories." },
      { status: 500 }
    );
  }
}
