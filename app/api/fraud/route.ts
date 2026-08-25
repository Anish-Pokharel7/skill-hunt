import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { db } from "@/lib/db/store";
import { FraudAndRiskEngine } from "@/lib/engine/fraud-engine";
import { getServerSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const auth = await requireRoles(
    ["TAX_OFFICER", "GOVERNMENT_ADMIN", "AUDITOR", "SUPER_ADMIN"],
    req
  );
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  return NextResponse.json({
    success: true,
    total: db.fraudAlerts.length,
    alerts: db.fraudAlerts,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Trigger Network Anomaly Scan
    if (action === "RUN_ANOMALY_SCAN") {
      const auth = await requireRoles(
        ["TAX_OFFICER", "GOVERNMENT_ADMIN", "AUDITOR", "SUPER_ADMIN"],
        req
      );
      if (!auth.authorized || !auth.user) {
        return auth.errorResponse!;
      }

      const newAlerts = FraudAndRiskEngine.runNetworkAnomalyScan();
      return NextResponse.json({
        success: true,
        scannedPassports: db.passports.length,
        newAlertsFound: newAlerts.length,
        alerts: db.fraudAlerts,
        message: `Network AI Scan Complete. ${newAlerts.length} new potential risk vectors identified.`,
      });
    }

    // Consumer Whistleblower submission (Publicly accessible)
    const { user } = await getServerSession(req);
    const {
      reportedBy,
      serialNumber,
      storeName,
      city,
      issueType = "Suspected Counterfeit",
      description,
      pricePaid,
      statutoryMrp,
    } = body;

    if (!description) {
      return NextResponse.json(
        { error: "Description is required for submitting an anomaly report" },
        { status: 400 }
      );
    }

    const alert = FraudAndRiskEngine.reportConsumerFraud({
      reportedBy: user ? `${user.name} (${user.role})` : reportedBy || "Anonymous Citizen",
      serialNumber,
      storeName,
      city,
      issueType,
      description,
      pricePaid: pricePaid ? Number(pricePaid) : undefined,
      statutoryMrp: statutoryMrp ? Number(statutoryMrp) : undefined,
    });

    return NextResponse.json({
      success: true,
      alert,
      message: "Report submitted successfully to the National Enforcement & Anti-Fraud Desk.",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to process fraud request", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRoles(["TAX_OFFICER", "SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  try {
    const body = await req.json();
    const { alertId, status, actionNotes } = body;

    if (!alertId || !status) {
      return NextResponse.json({ error: "Missing alertId or status" }, { status: 400 });
    }

    const updated = FraudAndRiskEngine.updateFraudStatus(
      alertId,
      user,
      status,
      actionNotes || "Status updated by assigned enforcement officer."
    );

    if (!updated) {
      return NextResponse.json({ error: "Fraud alert not found" }, { status: 404 });
    }

    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      orgId: user.orgId,
      orgName: user.organizationName,
      action: `RESOLVE_FRAUD_ALERT_${status}`,
      resourceType: "FRAUD_ALERT",
      resourceId: alertId,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Alert ${alertId} updated to ${status}. Notes: ${actionNotes}`,
    });

    return NextResponse.json({
      success: true,
      alert: updated,
      message: `Fraud alert updated to ${status}.`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to update alert", message: errorMessage },
      { status: 500 }
    );
  }
}
