import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { db } from "@/lib/db/store";
import { FiscalInvoiceEngine } from "@/lib/engine/invoice-engine";
import { Invoice, UserRole } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  const oversightRoles: UserRole[] = ["SUPER_ADMIN", "TAX_OFFICER", "AUDITOR"];

  let invoices: Invoice[] = [];

  if (oversightRoles.includes(user.role)) {
    invoices = db.invoices;
  } else {
    // Strict Tenant Isolation: users can ONLY see invoices where their Org is Seller or Buyer
    invoices = db.invoices.filter(
      (inv) => inv.sellerOrgId === user.orgId || inv.buyerOrgId === user.orgId
    );
  }

  return NextResponse.json({
    success: true,
    total: invoices.length,
    invoices,
  });
}

export async function POST(req: NextRequest) {
  const allowedRoles: UserRole[] = [
    "BUSINESS_EMPLOYEE",
    "MANUFACTURER",
    "IMPORTER",
    "SUPER_ADMIN",
  ];

  const auth = await requireRoles(allowedRoles, req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  try {
    const body = await req.json();
    const {
      invoiceType = "B2C_RETAIL",
      buyerName,
      buyerTaxPin,
      buyerType = "INDIVIDUAL_CONSUMER",
      buyerOrgId,
      items,
      paymentMethod = "CASH",
    } = body;

    if (!buyerName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid invoice payload: buyerName and at least one item required" },
        { status: 400 }
      );
    }

    // SERVER-ENFORCED SELLER IDENTITY: User cannot forge sellerOrgId
    const sellerOrg = db.orgs.find((o) => o.id === user.orgId) || {
      id: user.orgId,
      name: user.organizationName,
      taxPin: "TAX-PIN-GENERIC",
      address: "Commercial Outlet Address",
    };

    const { invoice, priceGougingWarnings } = await FiscalInvoiceEngine.createFiscalInvoice({
      issuerUser: user,
      invoiceType,
      sellerOrgId: user.orgId,
      sellerName: user.organizationName,
      sellerTaxPin: sellerOrg.taxPin,
      sellerAddress: (sellerOrg as { address?: string }).address || "Commercial Plaza",
      buyerOrgId,
      buyerName,
      buyerTaxPin,
      buyerType,
      items,
      paymentMethod,
    });

    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      orgId: user.orgId,
      orgName: user.organizationName,
      action: "ISSUE_FISCAL_INVOICE",
      resourceType: "INVOICE",
      resourceId: invoice.id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Issued ${invoice.invoiceNumber} (Total: $${invoice.grandTotal}, VAT: $${invoice.totalVat}). IRN: ${invoice.irn}`,
    });

    return NextResponse.json({
      success: true,
      invoice,
      priceGougingWarnings,
      message: `Fiscal E-Invoice ${invoice.invoiceNumber} registered with IRN verification!`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to issue fiscal invoice", message: errorMessage },
      { status: 500 }
    );
  }
}
