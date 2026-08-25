/**
 * /api/public/products/[id] — Public Product Detail
 *
 * GET — Returns full detail for a single VERIFIED product.
 *
 * Visibility Rule:
 *   VERIFIED → PUBLIC
 *   All other statuses → 404 (identical to "not found" to avoid leaking existence)
 *
 * No authentication required.
 * Sensitive fields are strictly excluded from the Prisma query itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/public/products/[id]");

const PUBLIC_STATUSES = ["VERIFIED", "APPROVED"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, verificationStatus: { in: PUBLIC_STATUSES } },
      select: {
        id: true,
        name: true,
        description: true,
        brand: true,
        model: true,
        manufacturerName: true,
        countryOfOrigin: true,
        originType: true,
        isNepalManufactured: true,
        isVatApplicable: true,
        vatRate: true,
        consumerPrice: true,
        currency: true,
        verificationStatus: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        // ─ Private/internal fields intentionally omitted from select ─
        // actualCost, vatPaid, verificationNotes, rejectionReason,
        // submittedAt, submissionNotes, reviewerId, reviewerName,
        // reviewerRole, reviewStartedAt, changesRequestedAt,
        // changesRequestedNotes, sellerId
        category: {
          select: { id: true, name: true, slug: true, description: true },
        },
        seller: {
          select: { id: true, businessName: true },
        },
        images: {
          select: {
            id: true,
            url: true,
            altText: true,
            isPrimary: true,
            sortOrder: true,
            mimeType: true,
          },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
        documents: {
          where: { status: "VERIFIED" },
          select: {
            id: true,
            documentType: true,
            originalFilename: true,
            status: true,
            verifiedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Same 404 for both non-existent and non-public products.
    // Do not return 403 — that would reveal the product exists but is private.
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const primaryImage =
      product.images.find((img) => img.isPrimary) || product.images[0] || null;

    // VAT breakdown (consumer-friendly)
    const vatBreakdown = product.isVatApplicable
      ? {
          basePrice: Math.round((product.consumerPrice / (1 + product.vatRate)) * 100) / 100,
          vatAmount:
            Math.round(
              (product.consumerPrice - product.consumerPrice / (1 + product.vatRate)) * 100
            ) / 100,
        }
      : {};

    const enriched = {
      ...product,
      primaryImage,
      priceDisplay: {
        currency: product.currency,
        mrp: product.consumerPrice,
        vatIncluded: product.isVatApplicable,
        vatRate: product.isVatApplicable
          ? `${(product.vatRate * 100).toFixed(0)}%`
          : "Exempt",
        priceLabel: `${product.currency} ${product.consumerPrice.toLocaleString()}`,
        ...vatBreakdown,
      },
      compliance: {
        isNepalManufactured: product.isNepalManufactured,
        countryOfOrigin: product.countryOfOrigin,
        verifiedDocumentsCount: product.documents.length,
        verifiedDocumentTypes: product.documents.map((d) => d.documentType),
        governmentVerified: true,
        approvedAt: product.approvedAt,
      },
    };

    return NextResponse.json(
      { success: true, data: enriched, meta: { timestamp: new Date().toISOString() } },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    log.error("GET /api/public/products/[id] failed", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product." },
      { status: 500 }
    );
  }
}
