/**
 * /api/auth/verify-email — Email Verification & Account Activation
 *
 * Verifies email verification tokens and marks user account ACTIVE.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/password";
import { verifyEmailSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { AppError } from "@/lib/server/errors";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/auth/verify-email");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { token } = parsed.data;
    const hashedToken = hashToken(token);

    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (!tokenRecord) {
      throw new AppError("Invalid email verification token.", 400);
    }

    if (tokenRecord.used) {
      throw new AppError("This verification token has already been used.", 400);
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new AppError("Email verification token has expired.", 400);
    }

    // Activate user account and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { email: tokenRecord.email },
        data: { status: "ACTIVE" },
      }),
      prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { used: true },
      }),
    ]);

    log.info("Email verified successfully", { email: tokenRecord.email });

    return NextResponse.json(
      successResponse(
        { verified: true, email: tokenRecord.email },
        { message: "Email address verified successfully. Your account is now active." }
      ),
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(errorResponse(err.message), { status: err.statusCode });
    }
    log.error("POST /api/auth/verify-email failed", err);
    return NextResponse.json(errorResponse("Failed to verify email"), { status: 500 });
  }
}
