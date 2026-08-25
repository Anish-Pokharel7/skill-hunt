/**
 * /api/products/[id]/history — Product Submission & Status Transition History
 *
 * GET — Retrieve full chronological submission and review history for a product.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/rbac";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]/history");

const STATUTORY_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "GOVERNMENT_OFFICIAL",
  "TAX_OFFICER",
  "AUDITOR",
] as const;

export async function GET(
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

    const isStatutory = STATUTORY_ROLES.includes(user.role as (typeof STATUTORY_ROLES)[number]);
    const isOwner = product.seller?.userId === user.id;

    if (!isStatutory && !isOwner) {
      return NextResponse.json(
        errorResponse("Access denied: you can only view submission history for your own products."),
        { status: 403 }
      );
    }

    const history = await prisma.productSubmissionHistory.findMany({
      where: { productId: id },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json(
      successResponse(history, {
        total: history.length,
        productId: id,
        currentStatus: product.verificationStatus,
      }),
      { status: 200 }
    );
  } catch (err) {
    log.error("GET /api/products/[id]/history failed", err);
    return NextResponse.json(errorResponse("Failed to fetch product submission history"), {
      status: 500,
    });
  }
}
