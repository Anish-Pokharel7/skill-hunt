/**
 * /api/products/[id]/documents/[documentId]/verify
 *
 * POST — Government officials verify or reject a compliance document.
 *
 * Allowed roles: GOVERNMENT_OFFICIAL, ADMIN, SUPER_ADMIN
 *
 * Body: { "status": "VERIFIED" | "REJECTED", "rejectionReason": "..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { Logger } from "@/lib/server/logger";
import { z } from "zod";

const log = Logger.child("api/products/[id]/documents/[documentId]/verify");

const verifyDocumentSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().min(10, "Rejection reason must be at least 10 characters.").optional(),
}).refine(
  (d) => d.status === "VERIFIED" || (d.status === "REJECTED" && !!d.rejectionReason),
  { message: "A rejection reason is required when rejecting a document.", path: ["rejectionReason"] }
);

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "GOVERNMENT_OFFICIAL", "TAX_OFFICER"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const auth = await requireRoles([...ALLOWED_ROLES], req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;

  try {
    const { id: productId, documentId } = await params;

    const document = await prisma.productDocument.findFirst({
      where: { id: documentId, productId },
    });

    if (!document) {
      return NextResponse.json(errorResponse("Document not found."), { status: 404 });
    }

    if (document.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        errorResponse(
          `Document is already ${document.status.replace("_", " ").toLowerCase()}. Only PENDING_REVIEW documents can be verified or rejected.`
        ),
        { status: 409 }
      );
    }

    const body = await req.json();
    const parsed = verifyDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { status, rejectionReason } = parsed.data;

    const updated = await prisma.productDocument.update({
      where: { id: documentId },
      data: {
        status,
        verifiedByUserId: user.id,
        verifiedAt: new Date(),
        rejectionReason: status === "REJECTED" ? (rejectionReason || null) : null,
      },
    });

    log.info("Document verification status updated", {
      documentId,
      productId,
      newStatus: status,
      reviewedBy: user.id,
    });

    return NextResponse.json(
      successResponse(
        {
          id: updated.id,
          documentType: updated.documentType,
          originalFilename: updated.originalFilename,
          status: updated.status,
          verifiedByUserId: updated.verifiedByUserId,
          verifiedAt: updated.verifiedAt,
          rejectionReason: updated.rejectionReason,
        },
        {
          message:
            status === "VERIFIED"
              ? "Document verified and accepted."
              : "Document rejected. The seller will be notified of the rejection reason.",
        }
      ),
      { status: 200 }
    );
  } catch (err) {
    log.error("POST /api/products/[id]/documents/[documentId]/verify failed", err);
    return NextResponse.json(errorResponse("Failed to update document verification status."), {
      status: 500,
    });
  }
}
