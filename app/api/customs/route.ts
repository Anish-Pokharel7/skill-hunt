import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { db } from "@/lib/db/store";
import { TaxAndPriceEngine } from "@/lib/engine/tax-engine";
import { CustomsDeclaration } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  let declarations: CustomsDeclaration[] = [];

  if (user.role === "IMPORTER") {
    declarations = db.customs.filter((c) => c.importerOrgId === user.orgId);
  } else {
    declarations = db.customs;
  }

  return NextResponse.json({
    success: true,
    total: declarations.length,
    declarations,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRoles(["IMPORTER", "SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  try {
    const body = await req.json();
    const {
      productSummary,
      portOfOrigin,
      portOfEntry,
      hsCode,
      declaredValueUsd,
      exchangeRate = 133.5, // USD to Local Currency
      batchIds = [],
    } = body;

    if (!productSummary || !hsCode || !declaredValueUsd) {
      return NextResponse.json(
        { error: "Missing required fields (productSummary, hsCode, declaredValueUsd)" },
        { status: 400 }
      );
    }

    const declaredValueLocal = Number(declaredValueUsd) * Number(exchangeRate);
    const taxCalc = TaxAndPriceEngine.calculateTaxes({
      hsCode,
      baseAmount: declaredValueLocal,
      quantity: 1,
      isImport: true,
    });

    const boeSeq = (db.customs.length + 4401).toString();
    const declarationId = `cust_dec_${Date.now()}`;
    const billOfEntryNo = `BOE-CUST-${new Date().getFullYear()}-${boeSeq}`;
    const consignmentId = `CNS-${new Date().getFullYear()}-${boeSeq}`;

    const newDeclaration: CustomsDeclaration = {
      id: declarationId,
      consignmentId,
      billOfEntryNo,
      importerOrgId: user.orgId,
      importerName: user.organizationName,
      portOfOrigin: portOfOrigin || "International Port of Origin",
      portOfEntry: portOfEntry || "National Inland Container Customs Depot",
      arrivalDate: new Date().toISOString(),
      hsCode,
      batchIds,
      productSummary,
      declaredValueUsd: Number(declaredValueUsd),
      declaredValueLocal,
      customsDutyRate: taxCalc.customsDutyRate,
      customsDutyAmount: taxCalc.customsDutyAmount,
      importVatAmount: taxCalc.vatAmount,
      totalCustomsDutyPaid: taxCalc.customsDutyAmount + taxCalc.vatAmount,
      clearanceStatus: "PENDING_DUTY",
      createdAt: new Date().toISOString(),
    };

    db.customs.unshift(newDeclaration);

    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      orgId: user.orgId,
      orgName: user.organizationName,
      action: "SUBMIT_CUSTOMS_MANIFEST",
      resourceType: "CUSTOMS",
      resourceId: declarationId,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Submitted Bill of Entry ${billOfEntryNo} under HS Code ${hsCode} with declared value $${declaredValueUsd}.`,
    });

    return NextResponse.json({
      success: true,
      declaration: newDeclaration,
      taxBreakdown: taxCalc,
      message: `Bill of Entry ${billOfEntryNo} filed. Pending duty settlement.`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to submit customs manifest", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRoles(["TAX_OFFICER", "GOVERNMENT_ADMIN", "SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  try {
    const body = await req.json();
    const { declarationId, action, officerNotes } = body;

    const declaration = db.customs.find((c) => c.id === declarationId);
    if (!declaration) {
      return NextResponse.json({ error: "Declaration not found" }, { status: 404 });
    }

    if (action === "CLEAR_CONSIGNMENT") {
      declaration.clearanceStatus = "CLEARED";
      declaration.clearedByTaxOfficerId = user.id;
      declaration.clearanceTimestamp = new Date().toISOString();
      declaration.officerNotes = officerNotes || "Customs inspection passed. Import duty and VAT settled.";
    } else if (action === "HOLD_INSPECTION") {
      declaration.clearanceStatus = "HELD_FOR_INSPECTION";
      declaration.officerNotes = officerNotes || "Consignment held for physical forensic audit.";
    }

    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      orgId: user.orgId,
      orgName: user.organizationName,
      action: `CUSTOMS_${action}`,
      resourceType: "CUSTOMS",
      resourceId: declarationId,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Customs action ${action} performed on ${declaration.billOfEntryNo} by ${user.name}.`,
    });

    return NextResponse.json({
      success: true,
      declaration,
      message: `Customs declaration status updated to ${declaration.clearanceStatus}.`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to update customs declaration", message: errorMessage },
      { status: 500 }
    );
  }
}
