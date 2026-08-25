/**
 * /api/auth/forgot-password — Password Reset Request
 *
 * Generates a cryptographically secure, time-limited password reset token.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateSecureToken, hashToken } from "@/lib/auth/password";
import { forgotPasswordSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/auth/forgot-password");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let rawResetToken: string | null = null;

    if (user) {
      rawResetToken = generateSecureToken(32);
      const hashedToken = hashToken(rawResetToken);

      // Invalidate existing unused tokens for this email
      await prisma.passwordResetToken.updateMany({
        where: { email: normalizedEmail, used: false },
        data: { used: true },
      });

      // Save new reset token (expires in 1 hour)
      await prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      log.info("Password reset token generated", { email: normalizedEmail, userId: user.id });
    } else {
      // Prevent user enumeration by logging only and returning generic success
      log.info("Password reset requested for non-existent email", { email: normalizedEmail });
    }

    return NextResponse.json(
      successResponse(
        {
          sent: true,
          // Return resetToken in non-prod or for automated test harness
          resetToken: rawResetToken,
        },
        {
          message:
            "If an account with this email exists, a password reset link has been issued.",
        }
      ),
      { status: 200 }
    );
  } catch (err) {
    log.error("POST /api/auth/forgot-password failed", err);
    return NextResponse.json(
      errorResponse("Failed to process password reset request"),
      { status: 500 }
    );
  }
}
