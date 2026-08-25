/**
 * /api/products/[id]/documents — Product Documents Management
 *
 * GET  — Retrieve all compliance/verification documents for a product
 * POST — Attach a new verification document (LAB_CERTIFICATE, BILL_OF_ENTRY, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/rbac";
import { uploadProductDocumentSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/products/[id]/documents");

const STATUTORY_ROLES = ["SUPER_ADMIN", "TAX_OFFICER", "AUDITOR"];

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

    // IDOR / Tenant check
    if (!STATUTORY_ROLES.includes(user.role) && product.seller?.userId !== user.id) {
      return NextResponse.json(
        errorResponse("Access denied: Product does not belong to your seller profile"),
        { status: 403 }
      );
    }

    const documents = await prisma.productDocument.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      successResponse(documents, { total: documents.length }),
      { status: 200 }
    );
  } catch (err) {
    log.error("GET /api/products/[id]/documents failed", err);
    return NextResponse.json(errorResponse("Failed to fetch product documents"), { status: 500 });
  }
}

export async function POST(
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

    // IDOR / Tenant check
    if (user.role !== "SUPER_ADMIN" && product.seller?.userId !== user.id) {
      return NextResponse.json(
        errorResponse("Access denied: You cannot upload documents to another seller's product"),
        { status: 403 }
      );
    }

    const body = await req.json();
    const payload = { ...body, productId: id };
    const parsed = uploadProductDocumentSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { documentType, filename, storageReference } = parsed.data;

    const document = await prisma.productDocument.create({
      data: {
        productId: id,
        documentType,
        filename,
        storageReference,
        status: user.role === "SUPER_ADMIN" ? "VERIFIED" : "PENDING_REVIEW",
      },
    });

    log.info("Product document attached", {
      documentId: document.id,
      productId: id,
      documentType,
      uploadedBy: user.id,
    });

    return NextResponse.json(
      successResponse(document, { message: "Document attached successfully." }),
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/products/[id]/documents failed", err);
    return NextResponse.json(errorResponse("Failed to attach product document"), {
      status: 500,
    });
  }
}
