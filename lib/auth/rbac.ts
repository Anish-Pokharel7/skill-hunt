import { User, UserRole, SystemAuditLog } from "@/lib/db/types";
import { getServerSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export interface AuthGuardResult {
  authorized: boolean;
  user: User | null;
  errorResponse?: NextResponse;
  errorMessage?: string;
  statusCode?: number;
}

/**
 * Universal Server-Side Authentication Guard.
 * Strictly verifies identity on the server.
 */
export async function requireAuth(req?: Request): Promise<AuthGuardResult> {
  const { user } = await getServerSession(req);
  if (!user) {
    return {
      authorized: false,
      user: null,
      statusCode: 401,
      errorMessage: "Authentication required. Valid session cookie or Bearer token is missing.",
      errorResponse: NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication required. Please log in.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      ),
    };
  }

  if (user.status === "SUSPENDED") {
    return {
      authorized: false,
      user,
      statusCode: 403,
      errorMessage: "Your account has been suspended by system administrator.",
      errorResponse: NextResponse.json(
        {
          error: "Forbidden",
          message: "Account suspended. Contact system administrator.",
          code: "ACCOUNT_SUSPENDED",
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user,
  };
}

/**
 * Universal Server-Side Role Guard.
 * Ensures the authenticated user's role is in the allowed list.
 * Prevents unauthorized privilege escalation.
 */
export async function requireRoles(
  allowedRoles: UserRole[],
  req?: Request
): Promise<AuthGuardResult> {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) {
    return auth;
  }

  if (!allowedRoles.includes(auth.user.role)) {
    return {
      authorized: false,
      user: auth.user,
      statusCode: 403,
      errorMessage: `Access denied. Role '${auth.user.role}' is not authorized to access this resource. Required one of: ${allowedRoles.join(", ")}.`,
      errorResponse: NextResponse.json(
        {
          error: "Forbidden",
          message: `Forbidden: Role '${auth.user.role}' does not have sufficient permissions.`,
          code: "ROLE_UNAUTHORIZED",
          requiredRoles: allowedRoles,
          userRole: auth.user.role,
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: auth.user,
  };
}

/**
 * Universal Server-Side Anti-IDOR & Tenant Isolation Guard.
 * Ensures a user cannot view or mutate another organization's records
 * simply by tampering with the ID in the URL/payload.
 *
 * The Super Admin (Government Authority), Tax Officers, and Auditors possess
 * statutory system-wide oversight rights, while commercial actors
 * (Manufacturer, Importer, Business Employee) are STRICTLY
 * locked into their assigned organization (orgId).
 */
export function verifyTenantAccess(
  user: User,
  targetOrgId: string | undefined | null
): { allowed: boolean; reason?: string } {
  if (!targetOrgId) {
    return { allowed: true };
  }

  // Statutory oversight roles have cross-organization visibility for compliance/audit
  const statutoryRoles: UserRole[] = [
    "SUPER_ADMIN",
    "TAX_OFFICER",
    "AUDITOR",
  ];

  if (statutoryRoles.includes(user.role)) {
    return { allowed: true };
  }

  // Commercial tenants must strictly match their own org
  if (user.orgId === targetOrgId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `IDOR Violation: User from org '${user.orgId}' (${user.organizationName}) attempted to access resource owned by org '${targetOrgId}'.`,
  };
}

/**
 * Universal Server-Side Resource Ownership Guard
 * Validates complex entity ownership (Invoices, Batches, Consignments)
 */
export function verifyEntityAccess(
  user: User,
  entity: {
    orgId?: string;
    sellerOrgId?: string;
    buyerOrgId?: string;
    manufacturerOrgId?: string;
    importerOrgId?: string;
    businessOrgId?: string;
  }
): { allowed: boolean; reason?: string } {
  // Statutory oversight roles can view all records for compliance
  const statutoryRoles: UserRole[] = [
    "SUPER_ADMIN",
    "TAX_OFFICER",
    "AUDITOR",
  ];
  if (statutoryRoles.includes(user.role)) {
    return { allowed: true };
  }

  const userOrg = user.orgId;
  const matchesOrg =
    entity.orgId === userOrg ||
    entity.sellerOrgId === userOrg ||
    entity.buyerOrgId === userOrg ||
    entity.manufacturerOrgId === userOrg ||
    entity.importerOrgId === userOrg ||
    entity.businessOrgId === userOrg;

  if (matchesOrg) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `IDOR Violation: Access denied. Resource does not belong to your organization '${userOrg}'.`,
  };
}
