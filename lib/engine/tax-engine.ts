import { db } from "@/lib/db/store";
import { TaxRule } from "@/lib/db/types";

export interface TaxCalculationInput {
  hsCode: string;
  baseAmount: number;
  quantity?: number;
  isImport?: boolean;
  overrideVatRate?: number;
  overrideExciseRate?: number;
}

export interface TaxCalculationResult {
  hsCode: string;
  category: string;
  baseAmount: number;
  quantity: number;
  subtotal: number;
  exciseRate: number;
  exciseAmount: number;
  customsDutyRate: number;
  customsDutyAmount: number;
  taxableValue: number;
  vatRate: number;
  vatAmount: number;
  luxuryTaxRate: number;
  luxuryTaxAmount: number;
  totalTax: number;
  finalGrossAmount: number;
  effectiveTaxRate: number;
}

export interface MrpValidationResult {
  isCompliant: boolean;
  statutoryMrp: number;
  offeredPrice: number;
  maxProfitMarginCap: number;
  costBasis: number;
  actualMargin: number;
  priceExcessAmount: number;
  priceExcessPercent: number;
  severity: "NONE" | "LOW" | "HIGH" | "CRITICAL";
  warningMessage?: string;
}

export class TaxAndPriceEngine {
  /**
   * Look up Tax Rule by HS Code
   */
  public static getTaxRule(hsCode: string): TaxRule {
    const rule = db.taxRules.find((r) => r.hsCode === hsCode);
    if (rule) return rule;

    // Fallback default rule
    return {
      id: "default_rule",
      hsCode,
      category: "General Commodities",
      description: "Standard National Tax Bracket",
      standardVatRate: 0.13, // 13% Standard VAT
      exciseDutyRate: 0.0,
      customsDutyRate: 0.10,
      luxuryTaxRate: 0.0,
      maxProfitMarginCap: 0.20,
      statutoryPriceCap: undefined,
      updatedByRole: "GOVERNMENT_ADMIN",
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate Multi-Tier Fiscal Taxes (Excise + Customs + VAT 13% + Luxury Tax)
   */
  public static calculateTaxes(input: TaxCalculationInput): TaxCalculationResult {
    const rule = this.getTaxRule(input.hsCode);
    const qty = input.quantity || 1;
    const subtotal = input.baseAmount * qty;

    const exciseRate = input.overrideExciseRate ?? rule.exciseDutyRate;
    const vatRate = input.overrideVatRate ?? rule.standardVatRate;
    const customsDutyRate = input.isImport ? rule.customsDutyRate : 0;
    const luxuryTaxRate = rule.luxuryTaxRate;

    // Multi-tier tax compounding
    const exciseAmount = Number((subtotal * exciseRate).toFixed(2));
    const customsDutyAmount = Number((subtotal * customsDutyRate).toFixed(2));

    // Taxable base for VAT is Subtotal + Customs Duty + Excise
    const taxableValue = subtotal + exciseAmount + customsDutyAmount;
    const vatAmount = Number((taxableValue * vatRate).toFixed(2));
    const luxuryTaxAmount = Number((taxableValue * luxuryTaxRate).toFixed(2));

    const totalTax = exciseAmount + customsDutyAmount + vatAmount + luxuryTaxAmount;
    const finalGrossAmount = Number((subtotal + totalTax).toFixed(2));
    const effectiveTaxRate = subtotal > 0 ? Number(((totalTax / subtotal) * 100).toFixed(2)) : 0;

    return {
      hsCode: input.hsCode,
      category: rule.category,
      baseAmount: input.baseAmount,
      quantity: qty,
      subtotal,
      exciseRate,
      exciseAmount,
      customsDutyRate,
      customsDutyAmount,
      taxableValue,
      vatRate,
      vatAmount,
      luxuryTaxRate,
      luxuryTaxAmount,
      totalTax,
      finalGrossAmount,
      effectiveTaxRate,
    };
  }

  /**
   * Validate Maximum Retail Price (MRP) & Anti-Price-Gouging Rules
   */
  public static validatePriceCompliance(
    hsCode: string,
    offeredPrice: number,
    costBasis: number,
    statutoryMrp?: number
  ): MrpValidationResult {
    const rule = this.getTaxRule(hsCode);
    const effectiveMrp = statutoryMrp || rule.statutoryPriceCap || costBasis * (1 + rule.maxProfitMarginCap);

    const actualMargin = costBasis > 0 ? (offeredPrice - costBasis) / costBasis : 0;
    const priceExcessAmount = offeredPrice > effectiveMrp ? offeredPrice - effectiveMrp : 0;
    const priceExcessPercent = effectiveMrp > 0 && priceExcessAmount > 0 ? (priceExcessAmount / effectiveMrp) * 100 : 0;

    if (offeredPrice > effectiveMrp) {
      const severity = priceExcessPercent > 20 ? "CRITICAL" : "HIGH";
      return {
        isCompliant: false,
        statutoryMrp: effectiveMrp,
        offeredPrice,
        maxProfitMarginCap: rule.maxProfitMarginCap,
        costBasis,
        actualMargin,
        priceExcessAmount,
        priceExcessPercent,
        severity,
        warningMessage: `Price Gouging Alert: Selling price $${offeredPrice.toFixed(2)} exceeds statutory Maximum Retail Price ($${effectiveMrp.toFixed(2)}) by $${priceExcessAmount.toFixed(2)} (+${priceExcessPercent.toFixed(1)}%).`,
      };
    }

    if (actualMargin > rule.maxProfitMarginCap + 0.05) {
      return {
        isCompliant: false,
        statutoryMrp: effectiveMrp,
        offeredPrice,
        maxProfitMarginCap: rule.maxProfitMarginCap,
        costBasis,
        actualMargin,
        priceExcessAmount: 0,
        priceExcessPercent: 0,
        severity: "LOW",
        warningMessage: `Margin Alert: Profit markup of ${(actualMargin * 100).toFixed(1)}% exceeds the statutory guideline cap of ${(rule.maxProfitMarginCap * 100).toFixed(1)}%.`,
      };
    }

    return {
      isCompliant: true,
      statutoryMrp: effectiveMrp,
      offeredPrice,
      maxProfitMarginCap: rule.maxProfitMarginCap,
      costBasis,
      actualMargin,
      priceExcessAmount: 0,
      priceExcessPercent: 0,
      severity: "NONE",
    };
  }

  /**
   * Reconcile Organization Input Tax Credit (ITC) vs Output VAT
   */
  public static reconcileTaxReturn(orgId: string) {
    const orgInvoicesSold = db.invoices.filter(
      (inv) => inv.sellerOrgId === orgId && inv.fiscalStatus === "VALIDATED"
    );
    const orgInvoicesBought = db.invoices.filter(
      (inv) => inv.buyerOrgId === orgId && inv.fiscalStatus === "VALIDATED"
    );

    const totalOutputVat = orgInvoicesSold.reduce((sum, inv) => sum + inv.totalVat, 0);
    const totalInputVat = orgInvoicesBought.reduce((sum, inv) => sum + inv.totalVat, 0);
    const totalExcisePayable = orgInvoicesSold.reduce((sum, inv) => sum + inv.totalExcise, 0);

    const netVatPayable = Math.max(0, totalOutputVat - totalInputVat);
    const excessCredit = Math.max(0, totalInputVat - totalOutputVat);

    return {
      orgId,
      totalOutputVat,
      totalInputVat,
      netVatPayable,
      excessCredit,
      totalExcisePayable,
      salesCount: orgInvoicesSold.length,
      purchasesCount: orgInvoicesBought.length,
    };
  }
}
