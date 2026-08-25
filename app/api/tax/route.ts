import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { db } from "@/lib/db/store";
import { TaxAndPriceEngine } from "@/lib/engine/tax-engine";
import { TaxRule } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  const url = new URL(req.url);
  const hsCodeQuery = url.searchParams.get("hsCode");

  if (hsCodeQuery) {
    const rule = TaxAndPriceEngine.getTaxRule(hsCodeQuery);
    return NextResponse.json({ success: true, rule });
  }

  // Get reconciliation for user's organization
  const orgReconciliation = TaxAndPriceEngine.reconcileTaxReturn(user.orgId);

  return NextResponse.json({
    success: true,
    taxRules: db.taxRules,
    taxReturns: db.taxReturns,
    orgReconciliation,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRoles(["GOVERNMENT_ADMIN", "SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  try {
    const body = await req.json();
    const {
      hsCode,
      category,
      description,
      standardVatRate,
      exciseDutyRate,
      customsDutyRate,
      luxuryTaxRate = 0,
      maxProfitMarginCap = 0.2,
      statutoryPriceCap,
    } = body;

    if (!hsCode || standardVatRate === undefined) {
      return NextResponse.json(
        { error: "Missing required fields (hsCode, standardVatRate)" },
        { status: 400 }
      );
    }

    const existingIndex = db.taxRules.findIndex((r) => r.hsCode === hsCode);
    const ruleData: TaxRule = {
      id: existingIndex >= 0 ? db.taxRules[existingIndex].id : `tax_rule_${Date.now()}`,
      hsCode,
      category: category || "General Goods",
      description: description || "Statutory national tax policy",
      standardVatRate: Number(standardVatRate),
      exciseDutyRate: Number(exciseDutyRate || 0),
      customsDutyRate: Number(customsDutyRate || 0),
      luxuryTaxRate: Number(luxuryTaxRate || 0),
      maxProfitMarginCap: Number(maxProfitMarginCap),
      statutoryPriceCap: statutoryPriceCap ? Number(statutoryPriceCap) : undefined,
      updatedByRole: user.role,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      db.taxRules[existingIndex] = ruleData;
    } else {
      db.taxRules.push(ruleData);
    }

    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      orgId: user.orgId,
      orgName: user.organizationName,
      action: "UPDATE_TAX_POLICY",
      resourceType: "TAX_RULE",
      resourceId: ruleData.id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Updated tax rates for HS Code ${hsCode}: VAT ${(ruleData.standardVatRate * 100).toFixed(1)}%, Excise ${(ruleData.exciseDutyRate * 100).toFixed(1)}%.`,
    });

    return NextResponse.json({
      success: true,
      rule: ruleData,
      message: `Tax policy for HS Code ${hsCode} updated successfully.`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to update tax policy", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // Real-time calculation endpoint
  try {
    const body = await req.json();
    const { hsCode, baseAmount, quantity, isImport, statutoryMrp, offeredPrice } = body;

    const taxResult = TaxAndPriceEngine.calculateTaxes({
      hsCode: hsCode || "1509.10",
      baseAmount: Number(baseAmount || 100),
      quantity: Number(quantity || 1),
      isImport: !!isImport,
    });

    let priceCompliance = null;
    if (offeredPrice !== undefined) {
      priceCompliance = TaxAndPriceEngine.validatePriceCompliance(
        hsCode || "1509.10",
        Number(offeredPrice),
        Number(baseAmount || 100),
        statutoryMrp ? Number(statutoryMrp) : undefined
      );
    }

    return NextResponse.json({
      success: true,
      taxResult,
      priceCompliance,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Calculation failed", message: errorMessage },
      { status: 500 }
    );
  }
}
