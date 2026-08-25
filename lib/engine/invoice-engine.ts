import { db } from "@/lib/db/store";
import { Invoice, InvoiceLineItem, User } from "@/lib/db/types";
import { TaxAndPriceEngine } from "@/lib/engine/tax-engine";
import { DigitalProductPassportEngine } from "@/lib/engine/dpp-engine";

export interface CreateInvoiceItemInput {
  serialNumber?: string;
  batchId: string;
  batchNumber: string;
  productName: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CreateInvoiceParams {
  issuerUser: User;
  invoiceType: "B2B_SUPPLY" | "B2C_RETAIL" | "IMPORT_INVOICE" | "EXPORT_INVOICE";
  sellerOrgId: string;
  sellerName: string;
  sellerTaxPin: string;
  sellerAddress: string;
  buyerOrgId?: string;
  buyerName: string;
  buyerTaxPin?: string;
  buyerType: "BUSINESS" | "INDIVIDUAL_CONSUMER" | "GOVERNMENT";
  items: CreateInvoiceItemInput[];
  paymentMethod: "CASH" | "BANK_TRANSFER" | "DIGITAL_WALLET" | "CARD";
}

export class FiscalInvoiceEngine {
  /**
   * Generates a new cryptographically verified E-Invoice
   */
  public static async createFiscalInvoice(params: CreateInvoiceParams): Promise<{
    invoice: Invoice;
    priceGougingWarnings: string[];
  }> {
    const timestamp = new Date().toISOString();
    const invoiceSeq = (db.invoices.length + 1001).toString();
    const invoiceNumber = `INV-${params.invoiceType === "B2B_SUPPLY" ? "B2B" : "B2C"}-${new Date().getFullYear()}-${invoiceSeq}`;
    const invoiceId = `inv_fiscal_${Date.now()}`;

    let subtotal = 0;
    let totalDiscount = 0;
    let totalExcise = 0;
    let totalVat = 0;
    let grandTotal = 0;
    let hasPriceGouging = false;
    const priceGougingWarnings: string[] = [];

    const computedItems: InvoiceLineItem[] = [];

    for (let i = 0; i < params.items.length; i++) {
      const item = params.items[i];
      const batch = db.batches.find((b) => b.id === item.batchId);
      const mrp = batch?.statutoryMrp || item.unitPrice * 1.2;
      const discount = item.discount || 0;

      // Price Gouging Check
      const compliance = TaxAndPriceEngine.validatePriceCompliance(
        item.hsCode,
        item.unitPrice,
        batch?.baseCost || item.unitPrice * 0.7,
        mrp
      );

      if (!compliance.isCompliant && compliance.warningMessage) {
        hasPriceGouging = true;
        priceGougingWarnings.push(compliance.warningMessage);
      }

      const taxableUnit = item.unitPrice - discount / (item.quantity || 1);
      const taxResult = TaxAndPriceEngine.calculateTaxes({
        hsCode: item.hsCode,
        baseAmount: taxableUnit,
        quantity: item.quantity,
      });

      const lineTotal = taxResult.finalGrossAmount;

      computedItems.push({
        id: `item_${invoiceId}_${i + 1}`,
        serialNumber: item.serialNumber,
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        productName: item.productName,
        hsCode: item.hsCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        mrp,
        discount,
        taxableAmount: taxResult.taxableValue,
        vatRate: taxResult.vatRate,
        vatAmount: taxResult.vatAmount,
        exciseRate: taxResult.exciseRate,
        exciseAmount: taxResult.exciseAmount,
        totalAmount: lineTotal,
      });

      subtotal += taxResult.taxableValue;
      totalDiscount += discount;
      totalExcise += taxResult.exciseAmount;
      totalVat += taxResult.vatAmount;
      grandTotal += lineTotal;

      // If serial number was provided, update passport state to sold
      if (item.serialNumber) {
        DigitalProductPassportEngine.appendJourneyEvent(item.serialNumber, {
          stage: params.invoiceType === "B2C_RETAIL" ? "POINT_OF_SALE" : "DISTRIBUTED",
          actorRole: params.issuerUser.role,
          actorName: params.issuerUser.name,
          actorOrgName: params.sellerName,
          location: params.sellerAddress,
          details: `Invoiced on ${invoiceNumber} to ${params.buyerName}. Fiscal IRN recorded.`,
        });
      }
    }

    const irnRaw = `${invoiceNumber}:${params.sellerTaxPin}:${grandTotal}:${timestamp}`;
    const irn = `IRN-${DigitalProductPassportEngine.generateCryptographicHash(irnRaw)}`;
    const fiscalStampHash = `FISC-STAMP:${DigitalProductPassportEngine.generateCryptographicHash(
      `${irn}:${totalVat}:${params.issuerUser.id}`
    ).substring(0, 18)}`;

    const invoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      irn,
      invoiceType: params.invoiceType,
      sellerOrgId: params.sellerOrgId,
      sellerName: params.sellerName,
      sellerTaxPin: params.sellerTaxPin,
      sellerAddress: params.sellerAddress,
      buyerOrgId: params.buyerOrgId,
      buyerName: params.buyerName,
      buyerTaxPin: params.buyerTaxPin,
      buyerType: params.buyerType,
      items: computedItems,
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalExcise: Number(totalExcise.toFixed(2)),
      totalVat: Number(totalVat.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      paymentMethod: params.paymentMethod,
      fiscalStatus: hasPriceGouging ? "FLAGGED_DISCREPANCY" : "VALIDATED",
      issuedByUserId: params.issuerUser.id,
      issuedByName: params.issuerUser.name,
      qrCodeUrl: `https://skillhunt.gov/invoices/${invoiceId}`,
      fiscalStampHash,
      isPriceGougingDetected: hasPriceGouging,
      createdAt: timestamp,
    };

    db.invoices.unshift(invoice);

    // If Price Gouging was detected, automatically trigger Fraud Alert
    if (hasPriceGouging) {
      db.fraudAlerts.unshift({
        id: `alert_gouging_${Date.now()}`,
        type: "PRICE_GOUGING",
        severity: "HIGH",
        title: `Statutory Price Gouging Detected on ${invoiceNumber}`,
        description: priceGougingWarnings.join("; "),
        targetInvoiceId: invoice.id,
        targetOrgId: params.sellerOrgId,
        targetOrgName: params.sellerName,
        riskScore: 85,
        status: "OPEN",
        reportedBy: "Automated Fiscal Invoice Engine",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    return { invoice, priceGougingWarnings };
  }
}
