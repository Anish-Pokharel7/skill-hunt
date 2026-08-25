/**
 * /api/audit-logs — Centralized System Audit Logs API
 *
 * GET — Query, filter, and inspect immutable system audit logs.
 * Protected: SUPER_ADMIN, ADMIN, TAX_OFFICER, AUDITOR.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/rbac";
import { successResponse, paginatedResponse, errorResponse } from "@/lib/server/api-response";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("api/audit-logs");

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "TAX_OFFICER",
  "AUDITOR",
  "GOVERNMENT_OFFICIAL",
] as const;

export async function GET(req: NextRequest) {
  const auth = await requireRoles(ALLOWED_ROLES as any, req);
  if (!auth.authorized || !auth.user) return auth.errorResponse!;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const resourceType = searchParams.get("resourceType") || searchParams.get("entity");
  const userId = searchParams.get("userId") || searchParams.get("actor");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
  const skip = (page - 1) * pageSize;

  try {
    const where: Record<string, any> = {
      ...(action ? { action } : {}),
      ...(resourceType ? { resourceType } : {}),
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { details: { contains: search } },
              { userName: { contains: search } },
              { resourceId: { contains: search } },
              { action: { contains: search } },
            ],
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.systemAuditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.systemAuditLog.count({ where }),
    ]);

    return NextResponse.json(
      paginatedResponse(logs, total, page, pageSize, {
        summary: `Retrieved ${logs.length} audit logs. Total matches: ${total}.`,
      }),
      { status: 200 }
    );
  } catch (err) {
    log.error("GET /api/audit-logs failed", err);
    return NextResponse.json(errorResponse("Failed to fetch system audit logs"), {
      status: 500,
    });
  }
}