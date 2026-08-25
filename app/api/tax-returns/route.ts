import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db/store";
import { UserRole } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const { user } = await getServerSession(req);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "TAX_OFFICER", "AUDITOR"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient role permissions", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    returns: db.taxReturns,
  });
}