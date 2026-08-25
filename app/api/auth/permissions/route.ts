/**
 * /api/auth/permissions — Active Permissions & RBAC Matrix
 *
 * GET — Returns the authenticated user's active permissions and the system permission matrix.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { getRolePermissions, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { successResponse } from "@/lib/server/api-response";
import { Permission, UserRole } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  const userPermissions = getRolePermissions(user.role);

  return NextResponse.json(
    successResponse(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        permissions: userPermissions,
        isSuperAdmin: user.role === "SUPER_ADMIN",
        matrix: ROLE_PERMISSIONS,
      },
      {
        message: `Active permissions retrieved for ${user.role}.`,
      }
    ),
    { status: 200 }
  );
}
