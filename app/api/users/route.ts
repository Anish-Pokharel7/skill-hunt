import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db/store";
import { User, UserRole } from "@/lib/db/types";

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
    users: db.users,
  });
}

export async function POST(req: NextRequest) {
  const { user } = await getServerSession(req);
  const authedUser = requireSuperAdmin(user);
  if (authedUser instanceof NextResponse) return authedUser;

  try {
    const body = await req.json();
    const { email, name, role, orgId, phone, designation, employeeCode, status } = body;

    if (!email || !name || !role || !orgId) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, role, orgId" },
        { status: 400 }
      );
    }

    const org = db.orgs.find((o) => o.id === orgId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      name,
      role: role as UserRole,
      orgId,
      organizationName: org.name,
      phone,
      designation,
      employeeCode,
      status: status || "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    db.logAudit({
      userId: authedUser.id,
      userName: authedUser.name,
      userRole: authedUser.role,
      orgId: authedUser.orgId,
      orgName: authedUser.organizationName,
      action: "CREATE_USER",
      resourceType: "USER",
      resourceId: newUser.id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Created new user: ${name} (${role}) in ${org.name}`,
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: "User created successfully.",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to create user", message: errorMessage },
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
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const userIndex = db.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oldUser = db.users[userIndex];
    
    if (updates.orgId) {
      const org = db.orgs.find((o) => o.id === updates.orgId);
      if (org) {
        updates.organizationName = org.name;
      }
    }

    db.users[userIndex] = { ...oldUser, ...updates };

    db.logAudit({
      userId: authedUser.id,
      userName: authedUser.name,
      userRole: authedUser.role,
      orgId: authedUser.orgId,
      orgName: authedUser.organizationName,
      action: "UPDATE_USER",
      resourceType: "USER",
      resourceId: id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Updated user: ${oldUser.name}`,
    });

    return NextResponse.json({
      success: true,
      user: db.users[userIndex],
      message: "User updated successfully.",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to update user", message: errorMessage },
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
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const userIndex = db.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUser = db.users[userIndex];
    db.users.splice(userIndex, 1);

    db.logAudit({
      userId: authedUser.id,
      userName: authedUser.name,
      userRole: authedUser.role,
      orgId: authedUser.orgId,
      orgName: authedUser.organizationName,
      action: "DELETE_USER",
      resourceType: "USER",
      resourceId: id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Deleted user: ${targetUser.name}`,
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to delete user", message: errorMessage },
      { status: 500 }
    );
  }
}