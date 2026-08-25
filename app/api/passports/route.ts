import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db/store";
import { UserRole } from "@/lib/db/types";

function requireSuperAdmin(user: { role: UserRole } | null) {
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: SUPER_ADMIN role required", code: "FORBIDDEN" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { user } = await getServerSession(req);
  const authError = requireSuperAdmin(user);
  if (authError) return authError;

  return NextResponse.json({
    success: true,
    passports: db.passports,
  });
}