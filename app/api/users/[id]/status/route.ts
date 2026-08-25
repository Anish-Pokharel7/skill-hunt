/**
 * /api/users/[id]/status — User Account Activation & Suspension
 *
 * POST — SUPER_ADMIN only: activate, suspend, or reactivate user accounts with mandatory reason.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { updateUserStatusSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/users/[id]/status");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(["SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { user: adminUser } = auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateUserStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { status, reason } = parsed.data;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(errorResponse("User not found"), { status: 404 });
    }

    // Prevent suspending the primary super admin
    if (targetUser.email === "admin@veriprice.gov" && status === "SUSPENDED") {
      return NextResponse.json(
        errorResponse("Primary government authority account cannot be suspended."),
        { status: 403 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      include: { organization: true },
    });

    // If suspended, revoke all active refresh tokens
    if (status === "SUSPENDED") {
      await prisma.refreshToken.updateMany({
        where: { userId: id },
        data: { revoked: true },
      });
    }

    // Centralized Audit Log
    try {
      await prisma.systemAuditLog.create({
        data: {
          userId: adminUser.id,
          userName: adminUser.name,
          userRole: adminUser.role,
          orgId: adminUser.orgId || "org_gov_01",
          orgName: adminUser.organizationName || "Government Authority",
          action: "USER_STATUS_CHANGED",
          resourceType: "USER",
          resourceId: id,
          previousValue: JSON.stringify({ status: targetUser.status }),
          newValue: JSON.stringify({ status }),
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
          status: "SUCCESS",
          details: `User '${targetUser.name}' status changed: ${targetUser.status} -> ${status}. Reason: ${reason}`,
          metadata: JSON.stringify({ reason, targetEmail: targetUser.email }),
        },
      });
    } catch {
      // Non-blocking
    }

    log.info("User account status updated", {
      targetUserId: id,
      newStatus: status,
      reason,
      changedBy: adminUser.id,
    });


    return NextResponse.json(
      successResponse(
        {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          status: updatedUser.status,
          reason,
        },
        { message: `Account status updated to ${status}.` }
      ),
      { status: 200 }
    );
  } catch (err) {
    log.error("POST /api/users/[id]/status failed", err);
    return NextResponse.json(errorResponse("Failed to update user status"), { status: 500 });
  }
}
