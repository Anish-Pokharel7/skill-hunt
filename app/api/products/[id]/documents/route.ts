/**
 * /api/products/[id]/documents — Product Document Management
 *
 * GET    — List all compliance documents for a product (owner/govt only)
 * POST   — Upload a compliance document (base64 JSON body)
 * DELETE — Delete a specific document by documentId (query param)
 *
 * SECURITY: Private government/seller documents must NEVER become publicly
 * accessible. All documents are stored in uploads/private/documents/<productId>/
 * and served only via signed-token authenticated endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/rbac";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";
import {
  storeProductDocument,
  deleteStoredFile,
  validateDocumentFile,
  parseBase64DataUri,
  generateSignedAccessToken,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_DOCUMENTS_PER_PRODUCT,
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_DOCUMENT_EXTENSIONS,
  VALID_DOCUMENT_TYPES,
} from "@/lib/server/storage";

const log = Logger.child("api/products/[id]/documents");

const SELLER_ROLES = ["SELLER", "MANUFACTURER", "IMPORTER", "BUSINESS_EMPLOYEE"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const GOVERNMENT_ROLES = ["SUPER_ADMIN", "ADMIN", "GOVERNMENT_OFFICIAL", "TAX_OFFICER", "AUDITOR"];

// ---------------------------------------------------------------------------
// GET /api/products/[id]/documents — List documents (owner + govt roles only)
// ---------------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;

  try {
    const { id: productId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true },
    });

    if (!product) {
      return NextResponse.json(errorResponse("Product not found."), { status: 404 });
    }

    const isGovt = GOVERNMENT_ROLES.includes(user.role);
    const isOwner = product.seller?.userId === user.id;

    // CRITICAL: Only authorized roles may list documents — no public access
    if (!isGovt && !isOwner) {
      return NextResponse.json(
        errorResponse("Access denied: Only the product owner or government officials may access compliance documents."),
        { status: 403 }
      );
    }

    const documents = await prisma.productDocument.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        productId: true,
        documentType: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        verifiedByUserId: true,
        verifiedAt: true,
        rejectionReason: true,
        uploadedByUserId: true,
        createdAt: true,
        updatedAt: true,
        // storageReference is intentionally excluded — use the signed access endpoint
      },
    });

    // Attach a short-lived signed access token to each document for download
    const docsWithTokens = await Promise.all(
      documents.map(async (doc) => {
        const dbDoc = await prisma.productDocument.findUnique({
          where: { id: doc.id },
          select: { storageReference: true },
        });
        const accessToken = dbDoc
          ? generateSignedAccessToken(doc.id, dbDoc.storageReference, user.id)
          : null;
        return {
          ...doc,
          downloadUrl: accessToken
            ? `/api/products/${productId}/documents/${doc.id}/download?token=${accessToken}`
            : null,
          tokenExpiresInMinutes: 15,
        };
      })
    );

    return NextResponse.json(
      successResponse(docsWithTokens, { total: docsWithTokens.length }),
      { status: 200 }
    );
  } catch (err) {
    log.error("GET /api/products/[id]/documents failed", err);
    return NextResponse.json(errorResponse("Failed to fetch product documents."), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/products/[id]/documents — Upload a compliance document
//
// Accepts JSON body:
// {
//   "data": "data:application/pdf;base64,...",  — base64 data URI
//   "filename": "lab-certificate.pdf",
//   "documentType": "LAB_CERTIFICATE"
// }
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;
  const isAdmin = ADMIN_ROLES.includes(user.role);
  const isSeller = [...SELLER_ROLES].includes(user.role);

  if (!isAdmin && !isSeller) {
    return NextResponse.json(
      errorResponse("Access denied: Only sellers and administrators may upload compliance documents."),
      { status: 403 }
    );
  }

  try {
    const { id: productId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true },
    });

    if (!product) {
      return NextResponse.json(errorResponse("Product not found."), { status: 404 });
    }

    // Ownership check
    if (!isAdmin && product.seller?.userId !== user.id) {
      return NextResponse.json(
        errorResponse("Access denied: You may only upload documents to your own products."),
        { status: 403 }
      );
    }

    // Enforce document count limit
    const existingCount = await prisma.productDocument.count({ where: { productId } });
    if (existingCount >= MAX_DOCUMENTS_PER_PRODUCT) {
      return NextResponse.json(
        errorResponse(
          `Document limit reached. A product may have at most ${MAX_DOCUMENTS_PER_PRODUCT} documents.`
        ),
        { status: 422 }
      );
    }

    const body = await req.json();
    const { data, filename, documentType } = body;

    // Validate required fields
    if (!data || typeof data !== "string") {
      return NextResponse.json(
        errorResponse("Missing required field: 'data' must be a base64-encoded data URI."),
        { status: 422 }
      );
    }
    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        errorResponse("Missing required field: 'filename'."),
        { status: 422 }
      );
    }
    if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType as any)) {
      return NextResponse.json(
        errorResponse(
          `Invalid or missing 'documentType'. Must be one of: ${VALID_DOCUMENT_TYPES.join(", ")}.`
        ),
        { status: 422 }
      );
    }

    // Parse base64 data URI
    const parsed = parseBase64DataUri(data);
    if (!parsed) {
      return NextResponse.json(
        errorResponse("Invalid document data. Must be a valid base64-encoded data URI."),
        { status: 422 }
      );
    }

    const { buffer, mimeType } = parsed;
    const validationError = validateDocumentFile(buffer, mimeType, filename);
    if (validationError) {
      return NextResponse.json(
        errorResponse(validationError, {
          allowedTypes: ALLOWED_DOCUMENT_MIME_TYPES,
          allowedExtensions: ALLOWED_DOCUMENT_EXTENSIONS,
          maxSizeMB: MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024),
        }),
        { status: 422 }
      );
    }

    // Store securely in private directory
    const stored = await storeProductDocument(productId, buffer, mimeType, filename);

    const document = await prisma.productDocument.create({
      data: {
        productId,
        documentType,
        storageReference: stored.storageReference,
        originalFilename: stored.sanitizedName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        status: isAdmin ? "VERIFIED" : "PENDING_REVIEW",
        uploadedByUserId: user.id,
        ...(isAdmin ? { verifiedByUserId: user.id, verifiedAt: new Date() } : {}),
      },
    });

    log.info("Product document uploaded (private storage)", {
      documentId: document.id,
      productId,
      documentType,
      sizeBytes: stored.sizeBytes,
      uploadedBy: user.id,
    });

    // Generate signed access token so uploader can immediately download their document
    const accessToken = generateSignedAccessToken(document.id, stored.storageReference, user.id);

    return NextResponse.json(
      successResponse(
        {
          id: document.id,
          productId: document.productId,
          documentType: document.documentType,
          originalFilename: document.originalFilename,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          status: document.status,
          uploadedByUserId: document.uploadedByUserId,
          createdAt: document.createdAt,
          downloadUrl: `/api/products/${productId}/documents/${document.id}/download?token=${accessToken}`,
          tokenExpiresInMinutes: 15,
          security: "Document stored in private storage. Access requires a time-limited signed token.",
        },
        { message: "Document uploaded and stored securely in private storage." }
      ),
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/products/[id]/documents failed", err);
    return NextResponse.json(errorResponse("Failed to upload document."), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/products/[id]/documents?documentId=... — Delete a document
// ---------------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;
  const isAdmin = ADMIN_ROLES.includes(user.role);
  const isSeller = [...SELLER_ROLES].includes(user.role);

  if (!isAdmin && !isSeller) {
    return NextResponse.json(
      errorResponse("Access denied: Only sellers and administrators may delete compliance documents."),
      { status: 403 }
    );
  }

  try {
    const { id: productId } = await params;
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        errorResponse("Missing required query parameter: documentId"),
        { status: 422 }
      );
    }

    const document = await prisma.productDocument.findFirst({
      where: { id: documentId, productId },
      include: { product: { include: { seller: true } } },
    });

    if (!document) {
      return NextResponse.json(errorResponse("Document not found."), { status: 404 });
    }

    // Ownership check
    if (!isAdmin && document.product.seller?.userId !== user.id) {
      return NextResponse.json(
        errorResponse("Access denied: You may only delete documents from your own products."),
        { status: 403 }
      );
    }

    // Prevent deletion of VERIFIED documents by non-admins
    if (!isAdmin && document.status === "VERIFIED") {
      return NextResponse.json(
        errorResponse(
          "Verified documents cannot be deleted by sellers. Contact a government official or administrator."
        ),
        { status: 403 }
      );
    }

    // Securely delete from private storage
    deleteStoredFile(document.storageReference);

    // Remove from database
    await prisma.productDocument.delete({ where: { id: documentId } });

    log.info("Product document deleted from private storage", {
      documentId,
      productId,
      deletedBy: user.id,
    });

    return NextResponse.json(
      successResponse({ documentId }, { message: "Document deleted successfully." }),
      { status: 200 }
    );
  } catch (err) {
    log.error("DELETE /api/products/[id]/documents failed", err);
    return NextResponse.json(errorResponse("Failed to delete document."), { status: 500 });
  }
}
