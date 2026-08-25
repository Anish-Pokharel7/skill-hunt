import { NextRequest, NextResponse } from "next/server";
import { requireAuth, verifyEntityAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { id } = await params;
  const invoice = db.invoices.find((inv) => inv.id === id || inv.invoiceNumber === id);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // STRICT SERVER-SIDE ANTI-IDOR CHECK
  const accessCheck = verifyEntityAccess(auth.user, invoice);
  if (!accessCheck.allowed) {
    // Record security violation attempt in system audit log
    db.logAudit({
      userId: auth.user.id,
      userName: auth.user.name,
      userRole: auth.user.role,
      orgId: auth.user.orgId,
      orgName: auth.user.organizationName,
      action: "ATTEMPT_CROSS_ORG_INVOICE_READ",
      resourceType: "INVOICE",
      resourceId: id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "BLOCKED_IDOR",
      details: accessCheck.reason || "Unauthorized IDOR access attempt blocked.",
    });

    return NextResponse.json(
      {
        error: "Forbidden: Insecure Direct Object Reference (IDOR) Blocked",
        message: "You are not authorized to view invoices outside your assigned organization.",
        code: "IDOR_PREVENTED",
        userRole: auth.user.role,
        userOrgId: auth.user.orgId,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    invoice,
  });
}
