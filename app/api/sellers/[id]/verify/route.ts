/**
 * /api/sellers/[id]/verify — Seller Verification Workflow
 *
 * POST — SUPER_ADMIN only: approve or reject a pending seller
 *
 * Verification state machine:
 *   PENDING → VERIFIED (Gov approves)
 *   PENDING → REJECTED (Gov rejects with notes)
 *   VERIFIED → SUSPENDED (Gov suspends active seller)
 *   SUSPENDED → VERIFIED (Gov reinstates)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { verifySellerSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/sellers/[id]/verify");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(
    ["SUPER_ADMIN", "ADMIN", "GOVERNMENT_OFFICIAL", "TAX_OFFICER"],
    req
  );
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;


  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = verifySellerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { status, verificationNotes } = parsed.data;

    const seller = await prisma.seller.findUnique({ where: { id } });
    if (!seller) {
      return NextResponse.json(errorResponse("Seller not found"), { status: 404 });
    }

    const updated = await prisma.seller.update({
      where: { id },
      data: {
        verificationStatus: status,
        verificationNotes,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    log.info("Seller verification updated", {
      sellerId: id,
      newStatus: status,
      officerId: user.id,
    });

    return NextResponse.json(
      successResponse(updated, {
        message: `Seller ${status === "VERIFIED" ? "approved" : status === "REJECTED" ? "rejected" : "suspended"} successfully.`,
      }),
      { status: 200 }
    );
  } catch (err) {
    log.error("POST /api/sellers/[id]/verify failed", err);
    return NextResponse.json(errorResponse("Failed to update seller verification"), { status: 500 });
  }
}
