/**
 * /api/auth/logout — User Session Termination
 *
 * Clears HTTP-only session and refresh cookies and revokes refresh tokens in database.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/password";
import { SESSION_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth/session";
import { successResponse } from "@/lib/server/api-response";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/auth/logout");

export async function POST(req: NextRequest) {
  try {
    // 1. Revoke refresh token in database if available in cookie or header
    const refreshCookie = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
    if (refreshCookie) {
      try {
        await prisma.refreshToken.updateMany({
          where: { token: hashToken(refreshCookie) },
          data: { revoked: true },
        });
      } catch {
        // Non-blocking
      }
    }

    log.info("User logged out successfully");

    const response = NextResponse.json(
      successResponse({ loggedOut: true }, { message: "Successfully logged out." }),
      { status: 200 }
    );

    // 2. Clear cookies
    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.delete(REFRESH_COOKIE_NAME);

    return response;
  } catch (err) {
    log.error("POST /api/auth/logout failed", err);
    const response = NextResponse.json(
      successResponse({ loggedOut: true }, { message: "Session cleared." }),
      { status: 200 }
    );
    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.delete(REFRESH_COOKIE_NAME);
    return response;
  }
}
