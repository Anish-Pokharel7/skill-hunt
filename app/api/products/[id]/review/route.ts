/**
 * /api/products/[id]/review - Start Government Review
 * POST: Gov Official takes ownership of a SUBMITTED product -> UNDER_REVIEW
 * Rules: PRODUCTS_REVIEW permission required; reviewer lock prevents takeover by different reviewer.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { reviewProductSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]/review");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(["SUPER_ADMIN", "ADMIN", "GOVERNMENT_OFFICIAL"], req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;
  const { user } = auth;

  try {
    const { id } = await params;
    const contentLength = req.headers.get("content-length");
    const body = contentLength === "0" || contentLength === null
      ? {}
      : await req.json().catch(() => ({}));
    const parsed = reviewProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("Validation failed", parsed.error.flatten().fieldErrors), { status: 422 });
    }
    const { notes } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id }, include: { documents: true, images: true } });
    if (!product) return NextResponse.json(errorResponse("Product not found"), { status: 404 });

    const alreadyUnderReviewBySelf = product.verificationStatus === "UNDER_REVIEW" && product.reviewerId === user.id;

    if (!["SUBMITTED", "RESUBMITTED"].includes(product.verificationStatus) && !alreadyUnderReviewBySelf) {
      throw new AppError(`Cannot start review from status "${product.verificationStatus}". Product must be SUBMITTED or RESUBMITTED.`, 400);
    }


    if (product.verificationStatus === "UNDER_REVIEW" && product.reviewerId && product.reviewerId !== user.id) {
      throw new AppError(`This product is already under review by another reviewer (${product.reviewerName ?? product.reviewerId}).`, 409);
    }

    const now = new Date();

    const updated = await prisma.product.update({
      where: { id },
      data: {
        verificationStatus: "UNDER_REVIEW",
        reviewerId: user.id,
        reviewerName: user.name,
        reviewerRole: user.role,
        reviewStartedAt: alreadyUnderReviewBySelf ? product.reviewStartedAt : now,
        verificationNotes: notes ?? product.verificationNotes,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, businessName: true, verificationStatus: true } },
        images: true,
        documents: true,
      },
    });

    if (!alreadyUnderReviewBySelf) {
      await prisma.productSubmissionHistory.create({
        data: {
          productId: id,
          fromStatus: product.verificationStatus,
          toStatus: "UNDER_REVIEW",
          action: "REVIEW_STARTED",
          submittedByUserId: user.id,
          submittedByName: user.name,
          submittedByRole: user.role,
          reviewerId: user.id,
          submissionNotes: notes,
          documentsCount: product.documents?.length ?? 0,
          imagesCount: product.images?.length ?? 0,
          timestamp: now,
        },
      });
    }

    log.info("Product review started", { productId: id, reviewerId: user.id, reviewerName: user.name });

    return NextResponse.json(
      successResponse(updated, { message: `Product is now UNDER_REVIEW by ${user.name}.` }),
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    log.error("POST /api/products/[id]/review failed", err);
    return NextResponse.json(errorResponse("Failed to start product review"), { status: 500 });
  }
}