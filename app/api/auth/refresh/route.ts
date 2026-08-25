/**
 * /api/auth/refresh — Refresh Token Strategy
 *
 * Exchanges a valid, unrevoked refresh token for a refreshed session token.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/session";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";
import { User, UserRole } from "@/lib/db/types";

const log = Logger.child("api/auth/refresh");

export async function POST(req: NextRequest) {
  try {
    let rawRefreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (!rawRefreshToken) {
      try {
        const body = await req.json();
        rawRefreshToken = body.refreshToken;
      } catch {
        // No body
      }
    }

    if (!rawRefreshToken) {
      return NextResponse.json(
        errorResponse("Refresh token missing", null, "REFRESH_TOKEN_REQUIRED"),
        { status: 401 }
      );
    }

    const hashedToken = hashToken(rawRefreshToken);

    const record = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
    });

    if (!record || record.revoked) {
      throw new AppError("Invalid or revoked refresh token. Please log in again.", 401);
    }

    if (new Date() > record.expiresAt) {
      throw new AppError("Refresh token has expired. Please log in again.", 401);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: record.userId },
      include: { organization: true },
    });

    if (!dbUser || dbUser.status === "SUSPENDED") {
      throw new AppError("User account not found or suspended.", 403);
    }

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as UserRole,
      orgId: dbUser.orgId || "org_consumer_01",
      organizationName: dbUser.organization?.name || "Independent",
      status: dbUser.status as "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION",
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt.toISOString(),
    };

    const newSessionToken = createSessionToken(user);

    log.info("Session token refreshed", { userId: user.id });

    const response = NextResponse.json(
      successResponse(
        {
          token: newSessionToken,
          user,
        },
        { message: "Session successfully refreshed." }
      ),
      { status: 200 }
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: newSessionToken,
      ...SESSION_COOKIE_OPTIONS,
    });

    return response;
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/auth/refresh failed", err);
    return NextResponse.json(errorResponse("Failed to refresh session"), { status: 500 });
  }
}
