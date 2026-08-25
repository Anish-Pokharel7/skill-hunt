import { db } from "@/lib/db/store";
import { FraudAlert, User } from "@/lib/db/types";

export class FraudAndRiskEngine {
  /**
   * Run automated anomaly heuristics across the network
   */
  public static runNetworkAnomalyScan(): FraudAlert[] {
    const newAlerts: FraudAlert[] = [];
    const timestamp = new Date().toISOString();

    // 1. Check for Duplicate / High-Frequency Scans
    for (const passport of db.passports) {
      if (passport.scanCount > 10 && passport.isAuthentic) {
        const existing = db.fraudAlerts.find(
          (a) => a.targetSerialNumber === passport.serialNumber && a.status !== "RESOLVED_FALSE_POSITIVE"
        );
        if (!existing) {
          const alert: FraudAlert = {
            id: `alert_scan_${Date.now()}_${passport.serialNumber.slice(-4)}`,
            type: "DUPLICATE_SCAN",
            severity: "HIGH",
            title: `Abnormal Scan Velocity on Serial ${passport.serialNumber}`,
            description: `Passport has been scanned ${passport.scanCount} times across multiple consumer devices. High probability of counterfeit duplication.`,
            targetSerialNumber: passport.serialNumber,
            targetBatchId: passport.batchId,
            targetOrgName: passport.manufacturerName,
            riskScore: 78,
            status: "OPEN",
            reportedBy: "Automated Risk Sentry",
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          db.fraudAlerts.unshift(alert);
          newAlerts.push(alert);
        }
      }
    }

    // 2. Check for Tax Credit (ITC) Carousel Mismatches
    const orgs = db.orgs.filter((o) => o.type === "RETAILER_DISTRIBUTOR" || o.type === "IMPORTER");
    for (const org of orgs) {
      const orgInvoices = db.invoices.filter((i) => i.buyerOrgId === org.id);
      const claimedInputVat = orgInvoices.reduce((sum, i) => sum + i.totalVat, 0);

      // Verify if sellers actually reported the corresponding output VAT
      const verifiedOutputVat = db.invoices
        .filter((i) => i.buyerOrgId === org.id && i.fiscalStatus === "VALIDATED")
        .reduce((sum, i) => sum + i.totalVat, 0);

      if (claimedInputVat > verifiedOutputVat * 1.5 && claimedInputVat > 50000) {
        const existing = db.fraudAlerts.find(
          (a) => a.targetOrgId === org.id && a.type === "TAX_CAROUSEL_MISMATCH"
        );
        if (!existing) {
          const alert: FraudAlert = {
            id: `alert_tax_${Date.now()}_${org.id.slice(-4)}`,
            type: "TAX_CAROUSEL_MISMATCH",
            severity: "CRITICAL",
            title: `Carousel VAT Mismatch: ${org.name}`,
            description: `Organization claimed $${claimedInputVat.toFixed(2)} in Input Tax Credit (ITC), but verified supplier invoices only account for $${verifiedOutputVat.toFixed(2)}.`,
            targetOrgId: org.id,
            targetOrgName: org.name,
            riskScore: 92,
            status: "OPEN",
            reportedBy: "National Tax Engine",
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          db.fraudAlerts.unshift(alert);
          newAlerts.push(alert);
        }
      }
    }

    return newAlerts;
  }

  /**
   * Submit a Whistleblower / Citizen fraud report
   */
  public static reportConsumerFraud(params: {
    reportedBy: string;
    serialNumber?: string;
    storeName?: string;
    city?: string;
    issueType: string;
    description: string;
    pricePaid?: number;
    statutoryMrp?: number;
  }): FraudAlert {
    const timestamp = new Date().toISOString();
    const isPriceOvercharge =
      params.pricePaid && params.statutoryMrp && params.pricePaid > params.statutoryMrp;

    const alert: FraudAlert = {
      id: `alert_whistle_${Date.now()}`,
      type: isPriceOvercharge ? "PRICE_GOUGING" : "CONSUMER_WHISTLEBLOWER",
      severity: isPriceOvercharge ? "HIGH" : "MEDIUM",
      title: `Consumer Report: ${params.issueType} at ${params.storeName || "Retail Outlet"}`,
      description: `${params.description}. Location: ${params.city || "Unknown"}. ${
        params.serialNumber ? `Target Serial: ${params.serialNumber}` : ""
      }`,
      targetSerialNumber: params.serialNumber,
      targetOrgName: params.storeName,
      riskScore: isPriceOvercharge ? 85 : 70,
      status: "OPEN",
      reportedBy: params.reportedBy || "Anonymous Citizen Whistleblower",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.fraudAlerts.unshift(alert);
    return alert;
  }

  /**
   * Update or resolve a fraud alert
   */
  public static updateFraudStatus(
    alertId: string,
    officer: User,
    status: FraudAlert["status"],
    actionNotes: string
  ): FraudAlert | null {
    const alert = db.fraudAlerts.find((a) => a.id === alertId);
    if (!alert) return null;

    alert.status = status;
    alert.assignedOfficerId = officer.id;
    alert.assignedOfficerName = officer.name;
    alert.actionNotes = actionNotes;
    alert.updatedAt = new Date().toISOString();

    return alert;
  }
}
