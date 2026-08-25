/**
 * /api/products/[id]/verify — Product Verification Workflow
 *
 * POST — SUPER_ADMIN (Government Authority) only: approve, reject, or flag a product.
 *
 * Workflow:
 *   PENDING -> VERIFIED (with verifiedAt timestamp and notes)
 *   PENDING -> REJECTED (with mandatory rejectionReason and notes)
 *   VERIFIED -> FLAGGED / REJECTED (if anomalies or fraud detected)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { verifyProductSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]/verify");

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
    const parsed = verifyProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { status, verificationNotes, rejectionReason } = parsed.data;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: true,
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    if (status === "REJECTED" && !rejectionReason) {
      throw new AppError("Rejection reason is mandatory when rejecting a product", 422);
    }

    const isVerified = status === "VERIFIED";

    const updated = await prisma.product.update({
      where: { id },
      data: {
        verificationStatus: status,
        verificationNotes,
        rejectionReason: isVerified ? null : rejectionReason || null,
        verifiedAt: isVerified ? new Date() : null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, businessName: true, verificationStatus: true } },
        images: true,
        documents: true,
      },
    });

    // Record Status Transition History
    await prisma.productSubmissionHistory.create({
      data: {
        productId: id,
        fromStatus: product.verificationStatus,
        toStatus: status,
        submittedByUserId: user.id,
        submittedByName: user.name,
        submittedByRole: user.role,
        submissionNotes: verificationNotes,
        documentsCount: updated.documents?.length || 0,
        imagesCount: updated.images?.length || 0,
        timestamp: new Date(),
      },
    });

    log.info("Product verification status updated", {
      productId: id,
      newStatus: status,
      officerId: user.id,
      officerName: user.name,
    });

    return NextResponse.json(
      successResponse(updated, {
        message: `Product verification status successfully set to ${status}.`,
      }),
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/products/[id]/verify failed", err);
    return NextResponse.json(errorResponse("Failed to update product verification"), {
      status: 500,
    });
  }
}
