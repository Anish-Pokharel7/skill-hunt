import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db/store";
import { Organization, OrgType } from "@/lib/db/types";
import { UserRole, User } from "@/lib/db/types";

function requireSuperAdmin(user: User | null): User | NextResponse {
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: SUPER_ADMIN role required", code: "FORBIDDEN" },
      { status: 403 }
    );
  }
  return user;
}

export async function GET(req: NextRequest) {
  const { user } = await getServerSession(req);
  const authedUser = requireSuperAdmin(user);
  if (authedUser instanceof NextResponse) return authedUser;

  return NextResponse.json({
    success: true,
    organizations: db.orgs,
  });
}

export async function POST(req: NextRequest) {
  const { user } = await getServerSession(req);
  const authedUser = requireSuperAdmin(user);
  if (authedUser instanceof NextResponse) return authedUser;

  try {
    const body = await req.json();
    const { name, type, taxPin, licenseNumber, jurisdiction, address, contactEmail, verified } = body;

    if (!name || !type || !taxPin || !licenseNumber) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, taxPin, licenseNumber" },
        { status: 400 }
      );
    }

    const newOrg: Organization = {
      id: `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      type: type as OrgType,
      taxPin,
      licenseNumber,
      jurisdiction: jurisdiction || "National",
      address: address || "",
      contactEmail: contactEmail || "",
      verified: verified || false,
      createdAt: new Date().toISOString(),
    };

    db.orgs.push(newOrg);

    db.logAudit({
      userId: authedUser.id,
      userName: authedUser.name,
      userRole: authedUser.role,
      orgId: authedUser.orgId,
      orgName: authedUser.organizationName,
      action: "CREATE_ORGANIZATION",
      resourceType: "USER",
      resourceId: newOrg.id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Created new organization: ${name} (${type})`,
    });

    return NextResponse.json({
      success: true,
      organization: newOrg,
      message: "Organization registered successfully.",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to create organization", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { user } = await getServerSession(req);
  const authedUser = requireSuperAdmin(user);
  if (authedUser instanceof NextResponse) return authedUser;

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing organization ID" }, { status: 400 });
    }

    const orgIndex = db.orgs.findIndex((o) => o.id === id);
    if (orgIndex === -1) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const oldOrg = db.orgs[orgIndex];
    db.orgs[orgIndex] = { ...oldOrg, ...updates };

    db.logAudit({
      userId: authedUser.id,
      userName: authedUser.name,
      userRole: authedUser.role,
      orgId: authedUser.orgId,
      orgName: authedUser.organizationName,
      action: "UPDATE_ORGANIZATION",
      resourceType: "USER",
      resourceId: id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Updated organization: ${oldOrg.name}`,
    });

    return NextResponse.json({
      success: true,
      organization: db.orgs[orgIndex],
      message: "Organization updated successfully.",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to update organization", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { user } = await getServerSession(req);
  const authedUser = requireSuperAdmin(user);
  if (authedUser instanceof NextResponse) return authedUser;

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing organization ID" }, { status: 400 });
    }

    const orgIndex = db.orgs.findIndex((o) => o.id === id);
    if (orgIndex === -1) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const org = db.orgs[orgIndex];
    db.orgs.splice(orgIndex, 1);

    db.logAudit({
      userId: authedUser.id,
      userName: authedUser.name,
      userRole: authedUser.role,
      orgId: authedUser.orgId,
      orgName: authedUser.organizationName,
      action: "DELETE_ORGANIZATION",
      resourceType: "USER",
      resourceId: id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Deleted organization: ${org.name}`,
    });

    return NextResponse.json({
      success: true,
      message: "Organization deleted successfully.",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to delete organization", message: errorMessage },
      { status: 500 }
    );
  }
}