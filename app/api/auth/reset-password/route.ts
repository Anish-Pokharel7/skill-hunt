/**
 * /api/auth/reset-password — Password Reset Execution
 *
 * Validates a password reset token, checks expiration, hashes the new password with scrypt,
 * and updates user credentials.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, hashToken } from "@/lib/auth/password";
import { resetPasswordSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/auth/reset-password");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { token, newPassword } = parsed.data;
    const hashedToken = hashToken(token);

    // 1. Locate reset token record
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!resetRecord) {
      throw new AppError("Invalid or expired password reset token.", 400);
    }

    if (resetRecord.used) {
      throw new AppError("This password reset token has already been used.", 400);
    }

    if (new Date() > resetRecord.expiresAt) {
      throw new AppError("Password reset token has expired. Please request a new one.", 400);
    }

    // 2. Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // 3. Update user password and invalidate token in transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetRecord.email },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    log.info("Password successfully reset", { email: resetRecord.email });

    return NextResponse.json(
      successResponse(
        { reset: true },
        { message: "Your password has been successfully reset. You may now log in." }
      ),
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/auth/reset-password failed", err);
    return NextResponse.json(
      errorResponse("Failed to reset password due to an internal error"),
      { status: 500 }
    );
  }
}
