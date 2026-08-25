/**
 * /api/sellers — Seller Registration & Listing
 *
 * GET  — SUPER_ADMIN, TAX_OFFICER, AUDITOR: list all sellers (with filters)
 *        BUSINESS_EMPLOYEE: gets own seller profile only
 * POST — BUSINESS_EMPLOYEE: self-register as a seller (status starts PENDING)
 *        SUPER_ADMIN: can register on behalf of any user
 *
 * Authorization model:
 *   - Commercial actors (BUSINESS_EMPLOYEE) are strictly tenant-scoped
 *   - Statutory roles (SUPER_ADMIN, TAX_OFFICER, AUDITOR) have system-wide read access
 *   - Only SUPER_ADMIN can verify/reject sellers (see /api/sellers/[id]/verify)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { createSellerSchema } from "@/lib/server/validators";
import { successResponse, paginatedResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/sellers");

// ---------------------------------------------------------------------------
// GET /api/sellers
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user } = auth;
  const { searchParams } = new URL(req.url);

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "25", 10));
  const skip = (page - 1) * pageSize;

  // Filters
  const status = searchParams.get("status"); // PENDING | VERIFIED | REJECTED | SUSPENDED
  const search = searchParams.get("search");

  try {
    const statutoryRoles = [
      "SUPER_ADMIN",
      "ADMIN",
      "GOVERNMENT_OFFICIAL",
      "TAX_OFFICER",
      "AUDITOR",
    ] as const;
    const isStatutory = statutoryRoles.includes(user.role as (typeof statutoryRoles)[number]);


    const where = {
      ...(status ? { verificationStatus: status } : {}),
      ...(search
        ? {
            OR: [
              { businessName: { contains: search } },
              { panVatNumber: { contains: search } },
              { registrationNumber: { contains: search } },
              { contactEmail: { contains: search } },
            ],
          }
        : {}),
      // Non-statutory users can only see their own seller profile
      ...(!isStatutory ? { userId: user.id } : {}),
    };

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true, status: true } },
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.seller.count({ where }),
    ]);

    return NextResponse.json(
      paginatedResponse(sellers, total, page, pageSize),
      { status: 200 }
    );
  } catch (err) {
    log.error("GET /api/sellers failed", err);
    return NextResponse.json(errorResponse("Failed to fetch sellers"), { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/sellers — Register as a seller
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Sellers are registered by SELLER, BUSINESS_EMPLOYEE, ADMIN, or SUPER_ADMIN
  const auth = await requireRoles(
    ["SELLER", "BUSINESS_EMPLOYEE", "ADMIN", "SUPER_ADMIN"],
    req
  );
  if (!auth.authorized || !auth.user) return auth.errorResponse!;


  const { user } = auth;

  try {
    const body = await req.json();
    const parsed = createSellerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { businessName, registrationNumber, panVatNumber, contactEmail, contactPhone, address } =
      parsed.data;

    // Determine which userId this seller will be linked to
    // SUPER_ADMIN can pass targetUserId, otherwise it's themselves
    const targetUserId = body.targetUserId && user.role === "SUPER_ADMIN" ? body.targetUserId : user.id;

    // Idempotency: one seller profile per user
    const existingByUser = await prisma.seller.findUnique({ where: { userId: targetUserId } });
    if (existingByUser) {
      throw new AppError("This user already has a registered seller profile.", 409);
    }

    // Business uniqueness checks
    const duplicateReg = await prisma.seller.findUnique({ where: { registrationNumber } });
    if (duplicateReg) {
      throw new AppError(`Registration number '${registrationNumber}' is already in use.`, 409);
    }

    const duplicatePan = await prisma.seller.findUnique({ where: { panVatNumber } });
    if (duplicatePan) {
      throw new AppError(`PAN/VAT number '${panVatNumber}' is already registered.`, 409);
    }

    const seller = await prisma.seller.create({
      data: {
        userId: targetUserId,
        businessName,
        registrationNumber,
        panVatNumber,
        contactEmail,
        contactPhone,
        address,
        verificationStatus: user.role === "SUPER_ADMIN" ? "VERIFIED" : "PENDING",
        verificationNotes:
          user.role === "SUPER_ADMIN"
            ? "Auto-verified by Government Authority on registration."
            : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    log.info("Seller registered", {
      sellerId: seller.id,
      businessName,
      by: user.id,
      status: seller.verificationStatus,
    });

    return NextResponse.json(
      successResponse(seller, {
        message:
          seller.verificationStatus === "VERIFIED"
            ? "Seller profile created and verified."
            : "Seller profile submitted for verification. You will be notified once reviewed.",
      }),
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/sellers failed", err);
    return NextResponse.json(errorResponse("Failed to register seller"), { status: 500 });
  }
}
