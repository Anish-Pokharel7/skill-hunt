/**
 * /api/products/[id]/request-changes - Request Changes from Seller
 * POST: Gov Official requests changes for UNDER_REVIEW product -> CHANGES_REQUESTED
 * Rules: PRODUCTS_REQUEST_CHANGES permission; mandatory changesRequired description.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { requestChangesSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]/request-changes");

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
    const parsed = requestChangesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResponse("Validation failed", parsed.error.flatten().fieldErrors), { status: 422 });
    }
    const { changesRequired, deadline } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id }, include: { documents: true, images: true } });
    if (!product) return NextResponse.json(errorResponse("Product not found"), { status: 404 });

    if (product.verificationStatus !== "UNDER_REVIEW") {
      throw new AppError(
        `Cannot request changes from status "${product.verificationStatus}". Product must be UNDER_REVIEW.`,
        400
      );
    }

    const now = new Date();

    const updated = await prisma.product.update({
      where: { id },
      data: {
        verificationStatus: "CHANGES_REQUESTED",
        changesRequestedAt: now,
        changesRequestedNotes: changesRequired,
        verificationNotes: deadline
          ? `Changes requested by ${user.name}. Deadline: ${deadline}`
          : `Changes requested by ${user.name}.`,
        verifiedAt: null,
        approvedAt: null,
        rejectionReason: null,
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
        toStatus: "CHANGES_REQUESTED",
        action: "CHANGES_REQUESTED",
        submittedByUserId: user.id,
        submittedByName: user.name,
        submittedByRole: user.role,
        reviewerId: user.id,
        submissionNotes: deadline ? `${changesRequired}\n\nDeadline: ${deadline}` : changesRequired,
        documentsCount: product.documents?.length ?? 0,
        imagesCount: product.images?.length ?? 0,
        timestamp: now,
      },
    });

    log.info("Changes requested for product", { productId: id, requestedBy: user.id, deadline });

    return NextResponse.json(
      successResponse(updated, { message: `Changes have been requested from the seller by ${user.name}.` }),
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    log.error("POST /api/products/[id]/request-changes failed", err);
    return NextResponse.json(errorResponse("Failed to request changes for product"), { status: 500 });
  }
}