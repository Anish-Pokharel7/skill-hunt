/**
 * /api/sellers/[id] — Single Seller Management
 *
 * GET    — Statutory roles: view any seller; BUSINESS_EMPLOYEE: own only
 * PATCH  — BUSINESS_EMPLOYEE: update own profile (non-verified fields)
 *          SUPER_ADMIN: update any seller
 * DELETE — SUPER_ADMIN only: suspend a seller (soft-delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { updateSellerSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/sellers/[id]");

async function resolveSeller(id: string) {
  return prisma.seller.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, status: true, orgId: true } },
      _count: { select: { products: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// GET /api/sellers/[id]
// ---------------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;

  try {
    const { id } = await params;
    const seller = await resolveSeller(id);

    if (!seller) {
      return NextResponse.json(errorResponse("Seller not found"), { status: 404 });
    }

    // Tenant isolation: non-statutory users can only view their own seller profile
    const statutoryRoles = ["SUPER_ADMIN", "TAX_OFFICER", "AUDITOR"];
    if (!statutoryRoles.includes(user.role) && seller.userId !== user.id) {
      return NextResponse.json(
        errorResponse("Access denied: you can only view your own seller profile"),
        { status: 403 }
      );
    }

    return NextResponse.json(successResponse(seller), { status: 200 });
  } catch (err) {
    log.error("GET /api/sellers/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to fetch seller"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/sellers/[id]
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;

  try {
    const { id } = await params;
    const seller = await resolveSeller(id);

    if (!seller) {
      return NextResponse.json(errorResponse("Seller not found"), { status: 404 });
    }

    // Only own seller or SUPER_ADMIN can edit
    if (user.role !== "SUPER_ADMIN" && seller.userId !== user.id) {
      return NextResponse.json(
        errorResponse("Access denied: you can only update your own seller profile"),
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateSellerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    // If registration/PAN changes, re-check uniqueness
    if (parsed.data.registrationNumber) {
      const dup = await prisma.seller.findFirst({
        where: { registrationNumber: parsed.data.registrationNumber, NOT: { id } },
      });
      if (dup) throw new AppError("Registration number already in use by another seller.", 409);
    }
    if (parsed.data.panVatNumber) {
      const dup = await prisma.seller.findFirst({
        where: { panVatNumber: parsed.data.panVatNumber, NOT: { id } },
      });
      if (dup) throw new AppError("PAN/VAT number already registered by another seller.", 409);
    }

    // Non-admin sellers can only edit contact/address info — not re-trigger verification bypass
    const allowedUpdates =
      user.role === "SUPER_ADMIN"
        ? parsed.data
        : {
            contactEmail: parsed.data.contactEmail,
            contactPhone: parsed.data.contactPhone,
            address: parsed.data.address,
          };

    const updated = await prisma.seller.update({
      where: { id },
      data: allowedUpdates,
    });

    log.info("Seller updated", { sellerId: id, by: user.id });
    return NextResponse.json(successResponse(updated), { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("PATCH /api/sellers/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to update seller"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/sellers/[id]
// SUPER_ADMIN only — suspends the seller (soft-delete)
// ---------------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(["SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  try {
    const { id } = await params;

    await prisma.seller.update({
      where: { id },
      data: {
        verificationStatus: "SUSPENDED",
        verificationNotes: "Seller suspended by Government Authority.",
      },
    });

    log.info("Seller suspended", { sellerId: id, by: auth.user.id });
    return NextResponse.json(
      successResponse({ id }, { message: "Seller account suspended" }),
      { status: 200 }
    );
  } catch (err) {
    log.error("DELETE /api/sellers/[id] failed", err);
    return NextResponse.json(errorResponse("Failed to suspend seller"), { status: 500 });
  }
}
