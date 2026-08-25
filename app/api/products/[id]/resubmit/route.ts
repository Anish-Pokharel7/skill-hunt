/**
 * /api/products/[id]/resubmit — Resubmit Product After Changes
 *
 * POST — Seller responds to requested changes and resubmits product back into the review queue.
 *
 * Workflow:
 *   CHANGES_REQUESTED -> RESUBMITTED -> (ready for Gov Official UNDER_REVIEW)
 *
 * Enforces:
 *   - Seller ownership validation
 *   - Current status must be CHANGES_REQUESTED (or REJECTED)
 *   - Required field and compliance document validation
 *   - Mandatory resubmission notes describing amendments
 *   - Immutable audit trail in ProductSubmissionHistory
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { resubmitProductSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { db } from "@/lib/db/store";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]/resubmit");

const RESUBMITTABLE_STATUSES = ["CHANGES_REQUESTED", "REJECTED", "DRAFT"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(
    ["SELLER", "BUSINESS_EMPLOYEE", "MANUFACTURER", "IMPORTER", "ADMIN", "SUPER_ADMIN"],
    req
  );
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = resubmitProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { resubmissionNotes, changesDescription } = parsed.data;

    // 1. Fetch product
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        seller: true,
        documents: true,
        images: true,
      },
    });

    if (!product) {
      return NextResponse.json(errorResponse("Product not found"), { status: 404 });
    }

    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

    // 2. Ownership Check
    if (!isAdmin) {
      if (!product.seller || product.seller.userId !== user.id) {
        return NextResponse.json(
          errorResponse("Access denied: You can only resubmit your own products."),
          { status: 403 }
        );
      }
      if (product.seller.verificationStatus === "SUSPENDED") {
        return NextResponse.json(
          errorResponse("Your seller profile is suspended. You cannot resubmit products."),
          { status: 403 }
        );
      }
    }

    // 3. Status Transition Check
    const currentStatus = product.verificationStatus;
    if (currentStatus === "UNDER_REVIEW") {
      throw new AppError(
        "Product is currently under review by government officials. Please wait for feedback.",
        400
      );
    }
    if (currentStatus === "VERIFIED" || currentStatus === "APPROVED") {
      throw new AppError("Product is already verified and approved.", 400);
    }
    if (!RESUBMITTABLE_STATUSES.includes(currentStatus as (typeof RESUBMITTABLE_STATUSES)[number])) {
      throw new AppError(
        `Cannot resubmit from status "${currentStatus}". Resubmission is allowed for: ${RESUBMITTABLE_STATUSES.join(", ")}.`,
        400
      );
    }

    // 4. Required Field Verification
    const fieldErrors: Record<string, string> = {};
    if (!product.name || product.name.trim().length < 2) {
      fieldErrors.name = "Product name must be at least 2 characters.";
    }
    if (!product.categoryId || !product.category?.isActive) {
      fieldErrors.categoryId = "A valid active category is required.";
    }
    if (typeof product.actualCost !== "number" || product.actualCost <= 0) {
      fieldErrors.actualCost = "Actual manufacturing/import cost must be greater than 0.";
    }
    if (typeof product.consumerPrice !== "number" || product.consumerPrice <= 0) {
      fieldErrors.consumerPrice = "Statutory Maximum Retail Price (MRP) must be greater than 0.";
    }
    if (product.consumerPrice < product.actualCost) {
      fieldErrors.consumerPrice = "Consumer MRP cannot be less than actual manufacturing cost.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        errorResponse("Product failed statutory field verification.", fieldErrors, "VALIDATION_FAILED"),
        { status: 422 }
      );
    }

    // 5. Document Check
    if (!product.documents || product.documents.length === 0) {
      return NextResponse.json(
        errorResponse(
          "At least one compliance or verification document is mandatory before resubmitting.",
          { documentsCount: 0, requiredMinimum: 1 },
          "DOCUMENTS_REQUIRED"
        ),
        { status: 422 }
      );
    }

    const now = new Date();
    const fullSubmissionNotes = changesDescription
      ? `${resubmissionNotes}\n\nChanges Made: ${changesDescription}`
      : resubmissionNotes;

    // 6. Update Product Status to RESUBMITTED
    const updated = await prisma.product.update({
      where: { id },
      data: {
        verificationStatus: "RESUBMITTED",
        submittedAt: now,
        submissionNotes: fullSubmissionNotes,
        rejectionReason: null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, businessName: true, verificationStatus: true } },
        images: true,
        documents: true,
      },
    });

    // 7. Record History
    const historyEntry = await prisma.productSubmissionHistory.create({
      data: {
        productId: product.id,
        fromStatus: currentStatus,
        toStatus: "RESUBMITTED",
        action: "RESUBMITTED",
        submittedByUserId: user.id,
        submittedByName: user.name,
        submittedByRole: user.role,
        submissionNotes: fullSubmissionNotes,
        documentsCount: product.documents.length,
        imagesCount: product.images.length,
        timestamp: now,
      },
    });

    // 8. Log Audit
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      orgId: user.orgId,
      orgName: user.organizationName,
      action: "PRODUCT_RESUBMITTED",
      resourceType: "PRODUCT",
      resourceId: product.id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Product '${product.name}' resubmitted (from ${currentStatus} -> RESUBMITTED) with notes: ${resubmissionNotes}`,
    });

    log.info("Product resubmitted", {
      productId: id,
      fromStatus: currentStatus,
      toStatus: "RESUBMITTED",
      resubmittedBy: user.id,
      historyId: historyEntry.id,
    });

    return NextResponse.json(
      successResponse(
        {
          product: updated,
          submission: historyEntry,
        },
        { message: "Product has been successfully resubmitted into the government verification queue." }
      ),
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    log.error("POST /api/products/[id]/resubmit failed", err);
    return NextResponse.json(errorResponse("Failed to resubmit product"), { status: 500 });
  }
}
