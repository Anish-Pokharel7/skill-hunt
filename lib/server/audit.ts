/**
 * lib/server/audit.ts
 *
 * Centralized Audit Logging Service.
 * Immutably records critical administrative, seller, user, product, category,
 * and security events into the database with full actor and delta context.
 */

import { prisma } from "@/lib/db/prisma";
import { db } from "@/lib/db/store";
import { AuditAction, AuditResourceType, UserRole } from "@/lib/db/types";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("central-audit");

export interface AuditActor {
  id: string;
  name: string;
  role: UserRole | string;
  orgId?: string;
  orgName?: string;
  email?: string;
}

export interface AuditLogParams {
  actor: AuditActor;
  action: AuditAction | string;
  entity: AuditResourceType | string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  details: string;
  status?: "SUCCESS" | "FAILURE" | "BLOCKED_UNAUTHORIZED" | "BLOCKED_IDOR" | "FLAGGED_ANOMALY" | string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

/**
 * Persists an audit log entry to database and in-memory store.
 */
export async function logAuditEvent(params: AuditLogParams) {
  const {
    actor,
    action,
    entity,
    entityId,
    previousValue,
    newValue,
    details,
    status = "SUCCESS",
    ipAddress = "127.0.0.1",
    metadata,
  } = params;

  const prevStr =
    previousValue !== undefined && previousValue !== null
      ? typeof previousValue === "string"
        ? previousValue
        : JSON.stringify(previousValue)
      : null;

  const newStr =
    newValue !== undefined && newValue !== null
      ? typeof newValue === "string"
        ? newValue
        : JSON.stringify(newValue)
      : null;

  const metaStr = metadata ? JSON.stringify(metadata) : null;
  const orgId = actor.orgId || "org_gov_01";
  const orgName = actor.orgName || "National Revenue & Customs Authority";

  try {
    const entry = await prisma.systemAuditLog.create({
      data: {
        userId: actor.id,
        userName: actor.name,
        userRole: actor.role,
        orgId,
        orgName,
        action,
        resourceType: entity,
        resourceId: entityId,
        previousValue: prevStr,
        newValue: newStr,
        ipAddress,
        status,
        details,
        metadata: metaStr,
      },
    });

    // Also push to in-memory store for real-time dashboard subscriptions
    db.logAudit({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role as any,
      orgId,
      orgName,
      action,
      resourceType: entity as any,
      resourceId: entityId,
      ipAddress,
      status: status as any,
      details,
      previousValue: prevStr,
      newValue: newStr,
      metadata: metaStr,
    });

    log.info(`Audit Log: [${action}] on ${entity}:${entityId} by ${actor.name} (${actor.role})`);
    return entry;
  } catch (err) {
    log.error("Failed to write centralized audit log", { err, action, entityId });
    return null;
  }
}

/** Helper to extract IP from request */
export function extractClientIp(req?: Request): string {
  if (!req) return "127.0.0.1";
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

// ---------------------------------------------------------------------------
// Specialized Action Helpers
// ---------------------------------------------------------------------------

export async function auditUserCreated(actor: AuditActor, user: any, req?: Request) {
  return logAuditEvent({
    actor,
    action: "USER_CREATED",
    entity: "USER",
    entityId: user.id,
    newValue: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
    details: `User account created: '${user.name}' (${user.email}) with role '${user.role}'.`,
    ipAddress: extractClientIp(req),
  });
}

export async function auditUserUpdated(actor: AuditActor, user: any, prevUser: any, req?: Request) {
  return logAuditEvent({
    actor,
    action: "USER_UPDATED",
    entity: "USER",
    entityId: user.id,
    previousValue: prevUser,
    newValue: user,
    details: `User account '${user.name}' (${user.id}) updated.`,
    ipAddress: extractClientIp(req),
  });
}

export async function auditSellerRegistered(actor: AuditActor, seller: any, req?: Request) {
  return logAuditEvent({
    actor,
    action: "SELLER_REGISTERED",
    entity: "SELLER",
    entityId: seller.id,
    newValue: { id: seller.id, businessName: seller.businessName, panVat: seller.panVatNumber },
    details: `New seller registered: '${seller.businessName}' (PAN/VAT: ${seller.panVatNumber}).`,
    ipAddress: extractClientIp(req),
  });
}

export async function auditProductCreated(actor: AuditActor, product: any, req?: Request) {
  return logAuditEvent({
    actor,
    action: "PRODUCT_CREATED",
    entity: "PRODUCT",
    entityId: product.id,
    newValue: { id: product.id, name: product.name, consumerPrice: product.consumerPrice, status: product.verificationStatus },
    details: `Product created: '${product.name}' with MRP NPR ${product.consumerPrice}.`,
    ipAddress: extractClientIp(req),
  });
}

export async function auditProductEdited(actor: AuditActor, product: any, prevProduct: any, req?: Request) {
  const isAdmin = actor.role === "SUPER_ADMIN" || actor.role === "ADMIN";
  return logAuditEvent({
    actor,
    action: isAdmin ? "ADMIN_PRODUCT_CHANGED" : "PRODUCT_EDITED",
    entity: "PRODUCT",
    entityId: product.id,
    previousValue: prevProduct,
    newValue: product,
    details: `${isAdmin ? "Admin modified" : "Seller edited"} product '${product.name}' (${product.id}).`,
    ipAddress: extractClientIp(req),
  });
}

export async function auditCategoryCreated(actor: AuditActor, category: any, req?: Request) {
  return logAuditEvent({
    actor,
    action: "CATEGORY_CREATED",
    entity: "CATEGORY",
    entityId: category.id,
    newValue: { id: category.id, name: category.name, slug: category.slug },
    details: `Product category created: '${category.name}' (${category.slug}).`,
    ipAddress: extractClientIp(req),
  });
}

export async function auditCategoryModified(actor: AuditActor, category: any, prevCategory: any, req?: Request) {
  return logAuditEvent({
    actor,
    action: "CATEGORY_MODIFIED",
    entity: "CATEGORY",
    entityId: category.id,
    previousValue: prevCategory,
    newValue: category,
    details: `Category '${category.name}' (${category.id}) updated.`,
    ipAddress: extractClientIp(req),
  });
}

export async function auditAdminLogin(user: any, req?: Request) {
  return logAuditEvent({
    actor: { id: user.id, name: user.name, role: user.role, orgId: user.orgId, orgName: user.organizationName },
    action: "ADMIN_LOGIN",
    entity: "AUTH",
    entityId: user.id,
    details: `Administrator login: '${user.name}' (${user.email}) as role '${user.role}'.`,
    ipAddress: extractClientIp(req),
    metadata: { timestamp: new Date().toISOString() },
  });
}

export async function auditPermissionChanged(
  actor: AuditActor,
  targetRoleOrUser: string,
  prevPermissions: any,
  newPermissions: any,
  req?: Request
) {
  return logAuditEvent({
    actor,
    action: "PERMISSION_CHANGED",
    entity: "PERMISSION",
    entityId: targetRoleOrUser,
    previousValue: prevPermissions,
    newValue: newPermissions,
    details: `Permissions updated for role/user '${targetRoleOrUser}' by ${actor.name}.`,
    ipAddress: extractClientIp(req),
  });
}
