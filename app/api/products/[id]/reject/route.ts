/**
 * /api/products/[id]/reject - Reject Product
 * POST: Gov Official permanently rejects UNDER_REVIEW product -> REJECTED
 * Rules: PRODUCTS_REJECT permission; mandatory rejectionReason (min 20 chars) and verificationNotes.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { rejectProductSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]/reject");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(["SUPER_ADMIN", "ADMIN", "GOVERNMENT_OFFICIAL"], req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;
  const { user } = auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = rejectProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("Validation failed", parsed.error.flatten().fieldErrors), { status: 422 });
    }
    const { rejectionReason, verificationNotes } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id }, include: { documents: true, images: true } });
    if (!product) return NextResponse.json(errorResponse("Product not found"), { status: 404 });

    if (product.verificationStatus !== "UNDER_REVIEW") {
      throw new AppError(
        `Cannot reject from status "${product.verificationStatus}". Product must be UNDER_REVIEW.`,
        400
      );
    }

    const now = new Date();

    const updated = await prisma.product.update({
      where: { id },
      data: {
        verificationStatus: "REJECTED",
        rejectionReason,
        verificationNotes,
        verifiedAt: null,
        approvedAt: null,
        changesRequestedNotes: null,
        changesRequestedAt: null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, businessName: true, verificationStatus: true } },
        images: true,
        documents: true,
      },
    });

    await prisma.productSubmissionHistory.create({
      data: {
        productId: id,
        fromStatus: product.verificationStatus,
        toStatus: "REJECTED",
        action: "REJECTED",
        submittedByUserId: user.id,
        submittedByName: user.name,
        submittedByRole: user.role,
        reviewerId: user.id,
        submissionNotes: `${verificationNotes}\n\nRejection reason: ${rejectionReason}`,
        documentsCount: product.documents?.length ?? 0,
        imagesCount: product.images?.length ?? 0,
        timestamp: now,
      },
    });

    log.info("Product rejected", { productId: id, rejectedBy: user.id, rejectorName: user.name, rejectionReason });

    return NextResponse.json(
      successResponse(updated, { message: `Product has been REJECTED by ${user.name}.` }),
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    log.error("POST /api/products/[id]/reject failed", err);
    return NextResponse.json(errorResponse("Failed to reject product"), { status: 500 });
  }
}