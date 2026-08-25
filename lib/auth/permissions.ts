import { UserRole, Permission, User } from "@/lib/db/types";
import { requireAuth, AuthGuardResult } from "@/lib/auth/rbac";
import { NextResponse } from "next/server";

/**
 * Complete Permission Matrix defining capabilities for each system role.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CONSUMER: [
    "PRODUCTS_VIEW_APPROVED",
    "PRODUCTS_SEARCH",
    "PRODUCTS_FILTER",
    "PRODUCTS_VIEW_DETAILS",
    "WHISTLEBLOWER_SUBMIT",
  ],
  SELLER: [
    "PRODUCTS_VIEW_APPROVED",
    "PRODUCTS_SEARCH",
    "PRODUCTS_FILTER",
    "PRODUCTS_VIEW_DETAILS",
    "PROFILE_MANAGE_OWN",
    "PRODUCTS_CREATE",
    "PRODUCTS_EDIT_OWN",
    "PRODUCTS_DELETE_OWN",
    "PRODUCTS_SUBMIT",
    "PRODUCTS_VIEW_OWN",
    "VERIFICATION_VIEW_STATUS",
    "VERIFICATION_RESPOND_CHANGES",
    "PRODUCTS_RESUBMIT",
    "DOCUMENTS_UPLOAD_OWN",
    "IMAGES_UPLOAD_OWN",
  ],
  GOVERNMENT_OFFICIAL: [
    "PRODUCTS_VIEW_APPROVED",
    "PRODUCTS_SEARCH",
    "PRODUCTS_FILTER",
    "PRODUCTS_VIEW_DETAILS",
    "PRODUCTS_VIEW_SUBMITTED",
    "PRODUCTS_REVIEW",
    "PRODUCTS_APPROVE",
    "PRODUCTS_REJECT",
    "PRODUCTS_REQUEST_CHANGES",
    "SELLERS_VIEW",
    "VERIFICATION_VIEW_HISTORY",
    "TAX_POLICY_VIEW",
    "CUSTOMS_INSPECT",
  ],
  ADMIN: [
    "PRODUCTS_VIEW_APPROVED",
    "PRODUCTS_SEARCH",
    "PRODUCTS_FILTER",
    "PRODUCTS_VIEW_DETAILS",
    "PRODUCTS_VIEW_SUBMITTED",
    "PRODUCTS_REVIEW",
    "PRODUCTS_APPROVE",
    "PRODUCTS_REJECT",
    "PRODUCTS_REQUEST_CHANGES",
    "PRODUCTS_MANAGE",
    "SELLERS_VIEW",
    "SELLERS_MANAGE",
    "CATEGORIES_MANAGE",
    "GOVERNMENT_USERS_MANAGE",
    "REPORTS_VIEW",
    "AUDIT_LOGS_VIEW",
    "VERIFICATION_VIEW_HISTORY",
  ],
  SUPER_ADMIN: [
    "PRODUCTS_VIEW_APPROVED",
    "PRODUCTS_SEARCH",
    "PRODUCTS_FILTER",
    "PRODUCTS_VIEW_DETAILS",
    "WHISTLEBLOWER_SUBMIT",
    "PROFILE_MANAGE_OWN",
    "PRODUCTS_CREATE",
    "PRODUCTS_EDIT_OWN",
    "PRODUCTS_DELETE_OWN",
    "PRODUCTS_SUBMIT",
    "PRODUCTS_VIEW_OWN",
    "VERIFICATION_VIEW_STATUS",
    "VERIFICATION_RESPOND_CHANGES",
    "PRODUCTS_RESUBMIT",
    "DOCUMENTS_UPLOAD_OWN",
    "IMAGES_UPLOAD_OWN",
    "PRODUCTS_VIEW_SUBMITTED",
    "PRODUCTS_REVIEW",
    "PRODUCTS_APPROVE",
    "PRODUCTS_REJECT",
    "PRODUCTS_REQUEST_CHANGES",
    "SELLERS_VIEW",
    "VERIFICATION_VIEW_HISTORY",
    "TAX_POLICY_VIEW",
    "CUSTOMS_INSPECT",
    "PRODUCTS_MANAGE",
    "SELLERS_MANAGE",
    "CATEGORIES_MANAGE",
    "GOVERNMENT_USERS_MANAGE",
    "REPORTS_VIEW",
    "AUDIT_LOGS_VIEW",
    "ADMINISTRATORS_MANAGE",
    "SYSTEM_SETTINGS_MANAGE",
    "PERMISSIONS_MANAGE",
    "SYSTEM_FULL_ACCESS",
  ],
  // Domain role mappings
  TAX_OFFICER: [
    "PRODUCTS_VIEW_APPROVED",
    "PRODUCTS_SEARCH",
    "PRODUCTS_FILTER",
    "PRODUCTS_VIEW_DETAILS",
    "PRODUCTS_VIEW_SUBMITTED",
    "PRODUCTS_REVIEW",
    "PRODUCTS_APPROVE",
    "PRODUCTS_REJECT",
    "PRODUCTS_REQUEST_CHANGES",
    "SELLERS_VIEW",
    "VERIFICATION_VIEW_HISTORY",
    "TAX_POLICY_VIEW",
    "REPORTS_VIEW",
    "AUDIT_LOGS_VIEW",
  ],
  MANUFACTURER: [
    "PRODUCTS_VIEW_APPROVED",
    "PRODUCTS_SEARCH",
    "PRODUCTS_FILTER",
    "PRODUCTS_VIEW_DETAILS",
    "PROFILE_MANAGE_OWN",
    "PRODUCTS_CREATE",
    "PRODUCTS_EDIT_OWN",
    "PRODUCTS_DELETE_OWN",
    "PRODUCTS_SUBMIT",
    "PRODUCTS_VIEW_OWN",
    "VERIFICATION_VIEW_STATUS",
    "VERIFICATION_RESPOND_CHANGES",
    "PRODUCTS_RESUBMIT",
    "DOCUMENTS_UPLOAD_OWN",
    "IMAGES_UPLOAD_OWN",
  ],
  IMPORTER: [
    "PRODUCTS_VIEW_APPROVED",
    "PRODUCTS_SEARCH",
    "PRODUCTS_FILTER",
    "PRODUCTS_VIEW_DETAILS",
    "PROFILE_MANAGE_OWN",
    "PRODUCTS_CREATE",
    "PRODUCTS_EDIT_OWN",
    "PRODUCTS_DELETE_OWN",
    "PRODUCTS_SUBMIT",
    "PRODUCTS_VIEW_OWN",
    "VERIFICATION_VIEW_STATUS",
    "VERIFICATION_RESPOND_CHANGES",
    "PRODUCTS_RESUBMIT",
    "DOCUMENTS_UPLOAD_OWN",
    "IMAGES_UPLOAD_OWN",
  ],
  BUSINESS_EMPLOYEE: [
    "PRODUCTS_VIEW_APPROVED",
    "PRODUCTS_SEARCH",
    "PRODUCTS_FILTER",
    "PRODUCTS_VIEW_DETAILS",
    "PROFILE_MANAGE_OWN",
    "PRODUCTS_CREATE",
    "PRODUCTS_EDIT_OWN",
    "PRODUCTS_DELETE_OWN",
    "PRODUCTS_SUBMIT",
    "PRODUCTS_VIEW_OWN",
    "VERIFICATION_VIEW_STATUS",
    "DOCUMENTS_UPLOAD_OWN",
    "IMAGES_UPLOAD_OWN",
  ],
  AUDITOR: [
    "PRODUCTS_VIEW_APPROVED",
    "PRODUCTS_SEARCH",
    "PRODUCTS_FILTER",
    "PRODUCTS_VIEW_DETAILS",
    "PRODUCTS_VIEW_SUBMITTED",
    "SELLERS_VIEW",
    "VERIFICATION_VIEW_HISTORY",
    "TAX_POLICY_VIEW",
    "REPORTS_VIEW",
    "AUDIT_LOGS_VIEW",
  ],
};

/**
 * Returns all permissions granted to a given role.
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Checks if a specific role possesses a required permission.
 * SUPER_ADMIN possesses SYSTEM_FULL_ACCESS and satisfies all checks.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (role === "SUPER_ADMIN") return true;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission) || permissions.includes("SYSTEM_FULL_ACCESS");
}

/**
 * Checks if a user has at least one of the required permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  if (role === "SUPER_ADMIN") return true;
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Checks if a user has all of the required permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  if (role === "SUPER_ADMIN") return true;
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Universal Server-Side Permission Guard.
 * Checks whether the authenticated user possesses the required permission(s).
 */
export async function requirePermission(
  permission: Permission,
  req?: Request
): Promise<AuthGuardResult> {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) {
    return auth;
  }

  if (!hasPermission(auth.user.role, permission)) {
    return {
      authorized: false,
      user: auth.user,
      statusCode: 403,
      errorMessage: `Access denied. Role '${auth.user.role}' lacks the required permission: '${permission}'.`,
      errorResponse: NextResponse.json(
        {
          error: "Forbidden",
          message: `Access denied: Missing required permission '${permission}'.`,
          code: "PERMISSION_DENIED",
          requiredPermission: permission,
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
 * Universal Server-Side Guard for Any Permission in a set.
 */
export async function requireAnyPermission(
  permissions: Permission[],
  req?: Request
): Promise<AuthGuardResult> {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) {
    return auth;
  }

  if (!hasAnyPermission(auth.user.role, permissions)) {
    return {
      authorized: false,
      user: auth.user,
      statusCode: 403,
      errorMessage: `Access denied. Role '${auth.user.role}' lacks one of required permissions: ${permissions.join(", ")}.`,
      errorResponse: NextResponse.json(
        {
          error: "Forbidden",
          message: "Access denied: Insufficient permissions.",
          code: "PERMISSION_DENIED",
          requiredPermissions: permissions,
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
