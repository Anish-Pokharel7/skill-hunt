/**
 * /api/auth/register — User Registration
 *
 * Creates a new user with cryptographic password hashing (scrypt + salt),
 * tenant organization assignment, and email verification token generation.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, generateSecureToken, hashToken } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { registerSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";
import { User, UserRole } from "@/lib/db/types";

const log = Logger.child("api/auth/register");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { name, email, password, role, orgId, phone, designation } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new AppError("An account with this email address already exists.", 409);
    }

    // 2. Hash password with scrypt + salt
    const passwordHash = await hashPassword(password);

    // 3. Resolve organization
    let resolvedOrgId = orgId || null;
    let resolvedOrgName = "Public Consumer Domain";

    if (resolvedOrgId) {
      const org = await prisma.organization.findUnique({ where: { id: resolvedOrgId } });
      if (org) {
        resolvedOrgName = org.name;
      } else {
        resolvedOrgId = null;
      }
    }

    // Default to public consumer organization if none provided
    if (!resolvedOrgId && role === "CONSUMER") {
      const defaultConsumerOrg = await prisma.organization.findFirst({
        where: { type: "CONSUMER" },
      });
      if (defaultConsumerOrg) {
        resolvedOrgId = defaultConsumerOrg.id;
        resolvedOrgName = defaultConsumerOrg.name;
      }
    }

    // 4. Create User in Database
    const initialStatus = role === "CONSUMER" ? "ACTIVE" : "PENDING_VERIFICATION";

    const dbUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        status: initialStatus,
        orgId: resolvedOrgId,
        designation: designation || (role === "CONSUMER" ? "Citizen Consumer" : "Staff Member"),
      },
      include: {
        organization: true,
      },
    });

    // 5. Generate Email Verification Token
    const rawVerificationToken = generateSecureToken(32);
    await prisma.emailVerificationToken.create({
      data: {
        email: normalizedEmail,
        token: hashToken(rawVerificationToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // 6. Create Session Token for immediate login
    const userPayload: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as UserRole,
      orgId: dbUser.orgId || "org_consumer_01",
      organizationName: dbUser.organization?.name || resolvedOrgName,
      status: dbUser.status as "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION",
      phone: phone || undefined,
      designation: dbUser.designation || undefined,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt.toISOString(),
    };

    const sessionToken = createSessionToken(userPayload);

    log.info("User registered successfully", {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    });

    const response = NextResponse.json(
      successResponse(
        {
          user: userPayload,
          token: sessionToken,
          emailVerificationToken: rawVerificationToken, // Provided for automated testing / confirmation
        },
        { message: "Registration successful. Welcome to VERIPRICE." }
      ),
      { status: 201 }
    );

    // Set secure HTTP session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      ...SESSION_COOKIE_OPTIONS,
    });

    return response;
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/auth/register failed", err);
    return NextResponse.json(errorResponse("Registration failed due to an internal error"), {
      status: 500,
    });
  }
}
