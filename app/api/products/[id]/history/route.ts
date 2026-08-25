/**
 * /api/products/[id]/history — Product Change & Verification History
 *
 * GET — Retrieve full chronological change audit and verification history for a product.
 * Returns:
 *   - `changes`: Granular field updates (price changes, seller reassignments, admin overrides)
 *   - `verifications`: Statutory verification & submission state machine transitions
 *   - `timeline`: Unified chronological history combining all events
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
  const { searchParams } = new URL(req.url);
  const filterType = searchParams.get("type"); // e.g. PRICE_CHANGE, SELLER_CHANGE, STATUS_CHANGE
  const filterField = searchParams.get("field"); // e.g. consumerPrice, sellerId

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
        errorResponse("Access denied: you can only view history for your own products."),
        { status: 403 }
      );
    }

    // 1. Fetch granular field-level change history
    const whereChanges: Record<string, any> = { productId: id };
    if (filterType) whereChanges.changeType = filterType;
    if (filterField) whereChanges.fieldName = filterField;

    const [changeHistory, submissionHistory] = await Promise.all([
      prisma.productHistory.findMany({
        where: whereChanges,
        orderBy: { createdAt: "desc" },
      }),
      prisma.productSubmissionHistory.findMany({
        where: { productId: id },
        orderBy: { timestamp: "desc" },
      }),
    ]);

    // Build unified chronological timeline
    const timeline = [
      ...changeHistory.map((c) => ({
        id: c.id,
        category: "FIELD_CHANGE",
        type: c.changeType,
        field: c.fieldName,
        oldValue: c.oldValue,
        newValue: c.newValue,
        actor: { id: c.changedByUserId, name: c.changedByName, role: c.changedByRole },
        reason: c.reason,
        timestamp: c.createdAt,
      })),
      ...submissionHistory.map((s) => ({
        id: s.id,
        category: "VERIFICATION_STATUS",
        type: s.action,
        fromStatus: s.fromStatus,
        toStatus: s.toStatus,
        actor: { id: s.submittedByUserId, name: s.submittedByName, role: s.submittedByRole },
        reviewerId: s.reviewerId,
        notes: s.submissionNotes,
        timestamp: s.timestamp,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(
      successResponse(
        {
          productId: id,
          productName: product.name,
          currentStatus: product.verificationStatus,
          currentPrice: product.consumerPrice,
          currency: product.currency,
          changes: changeHistory,
          verifications: submissionHistory,
          timeline,
        },
        {
          totalChanges: changeHistory.length,
          totalVerifications: submissionHistory.length,
          totalEvents: timeline.length,
        }
      ),
      { status: 200 }
    );
  } catch (err) {
    log.error("GET /api/products/[id]/history failed", err);
    return NextResponse.json(errorResponse("Failed to fetch product history"), {
      status: 500,
    });
  }
}

