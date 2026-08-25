/**
 * /api/products/[id]/submit — Product Submission System
 *
 * POST — Owner Seller or Admin submits a product for government statutory review.
 *
 * Workflow:
 *   DRAFT / PENDING / CHANGES_REQUESTED / REJECTED -> SUBMITTED
 *
 * Enforces:
 *   - Ownership validation (cannot submit other sellers' products)
 *   - Required-field verification (complete product metadata)
 *   - Required-document verification (at least 1 compliance document required)
 *   - Status transition validation
 *   - Submission timestamping
 *   - Immutable submission audit history
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { submitProductSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { db } from "@/lib/db/store";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]/submit");

const SUBMITTABLE_STATUSES = [
  "DRAFT",
  "PENDING",
  "CHANGES_REQUESTED",
  "REJECTED",
] as const;

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

    // 1. Fetch product with category, seller, documents, and images
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

    // 2. Ownership Validation
    if (!isAdmin) {
      if (!product.seller || product.seller.userId !== user.id) {
        return NextResponse.json(
          errorResponse("Access denied: you can only submit your own products for review."),
          { status: 403 }
        );
      }

      // Check seller account active
      if (product.seller.verificationStatus === "SUSPENDED") {
        return NextResponse.json(
          errorResponse("Your seller profile is suspended. You cannot submit products for review."),
          { status: 403 }
        );
      }
    }

    // 3. Status Transition Validation
    const currentStatus = product.verificationStatus;
    if (currentStatus === "SUBMITTED") {
      return NextResponse.json(
        errorResponse(
          "Product has already been submitted and is currently in the government review queue.",
          null,
          "ALREADY_SUBMITTED"
        ),
        { status: 409 }
      );
    }
    if (currentStatus === "UNDER_REVIEW") {
      return NextResponse.json(
        errorResponse(
          "Product is already under active review by statutory compliance officers.",
          null,
          "ALREADY_UNDER_REVIEW"
        ),
        { status: 409 }
      );
    }
    if (currentStatus === "VERIFIED") {
      return NextResponse.json(
        errorResponse(
          "Product has already been approved and verified.",
          null,
          "ALREADY_VERIFIED"
        ),
        { status: 409 }
      );
    }

    if (!SUBMITTABLE_STATUSES.includes(currentStatus as (typeof SUBMITTABLE_STATUSES)[number])) {
      return NextResponse.json(
        errorResponse(
          `Cannot submit product with status '${currentStatus}'. Allowed starting statuses: ${SUBMITTABLE_STATUSES.join(", ")}.`,
          null,
          "INVALID_STATUS_TRANSITION"
        ),
        { status: 400 }
      );
    }

    // 4. Required-Field Verification
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
    if (!product.countryOfOrigin || product.countryOfOrigin.trim().length === 0) {
      fieldErrors.countryOfOrigin = "Country of origin is required.";
    }
    if (!product.originType || !["IMPORTED", "DOMESTIC_MANUFACTURED"].includes(product.originType)) {
      fieldErrors.originType = "Valid origin type (IMPORTED or DOMESTIC_MANUFACTURED) is required.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        errorResponse("Product failed statutory field verification for submission.", fieldErrors, "VALIDATION_FAILED"),
        { status: 422 }
      );
    }

    // 5. Required-Document Verification
    if (!product.documents || product.documents.length === 0) {
      return NextResponse.json(
        errorResponse(
          "Submission rejected: At least one compliance or verification document (e.g. Lab Certificate, Bill of Entry, Tax Clearance, or Manufacturer Authorization) is mandatory before submitting for review.",
          { documentsCount: 0, requiredMinimum: 1 },
          "DOCUMENTS_REQUIRED"
        ),
        { status: 422 }
      );
    }

    // 6. Optional Submission Body Notes
    let submissionNotes = "Product submitted for statutory review.";
    try {
      const body = await req.json();
      const parsed = submitProductSchema.safeParse(body);
      if (parsed.success && parsed.data.submissionNotes) {
        submissionNotes = parsed.data.submissionNotes;
      }
    } catch {
      // Body is optional
    }

    const now = new Date();

    // 7. Update Product Status and Timestamp
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        verificationStatus: "SUBMITTED",
        submittedAt: now,
        submissionNotes,
        rejectionReason: null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: {
          select: {
            id: true,
            businessName: true,
            panVatNumber: true,
            verificationStatus: true,
          },
        },
        documents: true,
        images: true,
      },
    });

    // 8. Record Immutable Submission History
    const historyEntry = await prisma.productSubmissionHistory.create({
      data: {
        productId: product.id,
        fromStatus: currentStatus,
        toStatus: "SUBMITTED",
        submittedByUserId: user.id,
        submittedByName: user.name,
        submittedByRole: user.role,
        submissionNotes,
        documentsCount: product.documents.length,
        imagesCount: product.images.length,
        timestamp: now,
      },
    });

    // 9. System Audit Log
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      orgId: user.orgId,
      orgName: user.organizationName,
      action: "PRODUCT_SUBMITTED",
      resourceType: "PRODUCT",
      resourceId: product.id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Product '${product.name}' submitted for review (from ${currentStatus} -> SUBMITTED) with ${product.documents.length} document(s).`,
    });

    log.info("Product successfully submitted", {
      productId: id,
      fromStatus: currentStatus,
      toStatus: "SUBMITTED",
      submittedBy: user.id,
      historyId: historyEntry.id,
    });

    return NextResponse.json(
      successResponse(
        {
          product: updatedProduct,
          submission: historyEntry,
        },
        { message: "Product successfully submitted for statutory verification." }
      ),
      { status: 200 }
    );
  } catch (err) {
    log.error("POST /api/products/[id]/submit failed", err);
    return NextResponse.json(errorResponse("Failed to submit product for review"), { status: 500 });
  }
}
