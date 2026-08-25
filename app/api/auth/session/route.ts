import { NextRequest, NextResponse } from "next/server";
import { getServerSession, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { SEED_USERS } from "@/lib/auth/mock-users";
import { UserRole } from "@/lib/db/types";
import { db } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  const { user } = await getServerSession(req);
  return NextResponse.json({
    authenticated: !!user,
    user: user || null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, role, email } = body;

    let targetUser = SEED_USERS.find((u) => u.id === userId);
    if (!targetUser && role) {
      targetUser = SEED_USERS.find((u) => u.role === (role as UserRole));
    }
    if (!targetUser && email) {
      targetUser = SEED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "Invalid credentials or user not found", code: "USER_NOT_FOUND" },
        { status: 401 }
      );
    }

    const token = createSessionToken(targetUser);

    db.logAudit({
      userId: targetUser.id,
      userName: targetUser.name,
      userRole: targetUser.role,
      orgId: targetUser.orgId,
      orgName: targetUser.organizationName,
      action: "USER_LOGIN_SUCCESS",
      resourceType: "USER",
      resourceId: targetUser.id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `User logged in with role ${targetUser.role}.`,
    });

    const response = NextResponse.json({
      success: true,
      user: targetUser,
      token,
    });

    // Set secure cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: false, // Accessible for client-side state hydration
      path: "/",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Login failed", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
