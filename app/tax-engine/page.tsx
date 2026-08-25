"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { TaxRule } from "@/lib/db/types";
import {
  Scale,
  Calculator,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function TaxEnginePage() {
  const { user, role } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [reconciliation, setReconciliation] = useState<any>(null);

  // Live Calculator State
  const [hsCode, setHsCode] = useState("1509.10");
  const [baseAmount, setBaseAmount] = useState("1000");
  const [quantity, setQuantity] = useState("5");
  const [isImport, setIsImport] = useState(false);
  const [offeredPrice, setOfferedPrice] = useState("1150");
  const [calcResult, setCalcResult] = useState<any>(null);

  useEffect(() => {
    fetchTaxData();
    runCalculation();
  }, [hsCode, baseAmount, quantity, isImport, offeredPrice]);

  const fetchTaxData = async () => {
    try {
      const res = await fetch("/api/tax");
      const data = await res.json();
      if (data.success) {
        setTaxRules(data.taxRules || []);
        setReconciliation(data.orgReconciliation || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const runCalculation = async () => {
    try {
      const res = await fetch("/api/tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hsCode,
          baseAmount: Number(baseAmount),
          quantity: Number(quantity),
          isImport,
          offeredPrice: Number(offeredPrice),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCalcResult(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e5e2da]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#181c1a]">National Tax & Price Compliance Engine</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
              13% STATUTORY VAT
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            Multi-Tier Cascading Tax Formulation &bull; Input Tax Credit (ITC) Reconciliation &bull; MRP Ceilings
          </p>
        </div>
      </div>

      {/* Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded gov-card space-y-3">
          <div className="flex items-center gap-2 border-b border-[#e5e2da] pb-3">
            <Calculator className="w-4 h-4 text-[#1b4332]" />
            <h3 className="text-sm font-bold text-[#181c1a]">Fiscal Tax & Price Simulator</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#333d37] font-medium mb-1">Commodity HS Code & Category</label>
              <select
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
                className="gov-input w-full font-mono"
              >
                {taxRules.map((r) => (
                  <option key={r.hsCode} value={r.hsCode}>
                    {r.hsCode} - {r.category}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Base Unit Cost ($)</label>
                <input
                  type="number"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  className="gov-input w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="gov-input w-full font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#333d37] font-medium mb-1">Offered Retail Selling Price ($)</label>
              <input
                type="number"
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(e.target.value)}
                className="gov-input w-full font-mono"
              />
              <span className="text-[10px] text-[#65736a]">Evaluated against statutory Maximum Retail Price (MRP).</span>
            </div>

            <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#181c1a] font-medium block">Imported Consignment</span>
                <span className="text-[10px] text-[#65736a]">Applies Customs Port Tariffs</span>
              </div>
              <input
                type="checkbox"
                checked={isImport}
                onChange={(e) => setIsImport(e.target.checked)}
                className="w-4 h-4 text-[#1b4332] rounded"
              />
            </div>
          </div>
        </div>

        {/* Right Computation Results (7 Cols) */}
        <div className="lg:col-span-7 p-5 rounded gov-card space-y-3">
          <div className="flex items-center justify-between border-b border-[#e5e2da] pb-3">
            <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-[#1b4332]" />
              Tax Breakdown & Compliance Assessment
            </h3>
            {calcResult?.taxResult && (
              <span className="text-xs font-mono font-bold text-[#1b4332]">
                Effective Tax: {calcResult.taxResult.effectiveTaxRate}%
              </span>
            )}
          </div>

          {calcResult?.taxResult && (
            <div className="space-y-3">
              {/* Multi-Tier Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[10px] text-[#65736a] block font-sans">Subtotal</span>
                  <span className="text-sm font-bold text-[#181c1a]">
                    ${calcResult.taxResult.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[10px] text-[#65736a] block font-sans">
                    Excise ({(calcResult.taxResult.exciseRate * 100).toFixed(0)}%)
                  </span>
                  <span className="text-sm font-bold text-[#8a5b14]">
                    ${calcResult.taxResult.exciseAmount.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[10px] text-[#65736a] block font-sans">
                    VAT 13%
                  </span>
                  <span className="text-sm font-bold text-[#1b4332]">
                    ${calcResult.taxResult.vatAmount.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[10px] text-[#65736a] block font-sans">Total Gross</span>
                  <span className="text-sm font-bold text-[#181c1a]">
                    ${calcResult.taxResult.finalGrossAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Price Compliance & Anti-Gouging Diagnostic */}
              {calcResult.priceCompliance && (
                <div
                  className={`p-3.5 rounded border ${
                    calcResult.priceCompliance.isCompliant
                      ? "bg-[#f4f7f5] border-[#cad2c5] text-[#163828]"
                      : "bg-[#fdf3f2] border-[#f2cfcd] text-[#8c322c]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {calcResult.priceCompliance.isCompliant ? (
                      <CheckCircle2 className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#8c322c] shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs space-y-1">
                      <div className="font-bold">
                        {calcResult.priceCompliance.isCompliant
                          ? "COMPLIANT WITH STATUTORY MRP REGULATIONS"
                          : "STATUTORY PRICE GOUGING ALERT"}
                      </div>
                      <p className="text-[#333d37]">
                        {calcResult.priceCompliance.isCompliant
                          ? `Offered price of $${offeredPrice} is within the government ceiling of $${calcResult.priceCompliance.statutoryMrp.toFixed(2)}.`
                          : calcResult.priceCompliance.warningMessage}
                      </p>
                      <div className="pt-1 flex gap-4 text-[11px] font-mono text-[#333d37]">
                        <span>Statutory Cap: <strong>${calcResult.priceCompliance.statutoryMrp}</strong></span>
                        <span>Actual Margin: <strong>{(calcResult.priceCompliance.actualMargin * 100).toFixed(1)}%</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input Tax Credit (ITC) Ledger */}
      {reconciliation && (
        <div className="p-5 rounded gov-card space-y-3">
          <div className="flex items-center justify-between border-b border-[#e5e2da] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#1b4332]" />
                Input Tax Credit (ITC) & Cascading VAT Reconciliation Ledger
              </h3>
              <p className="text-xs text-[#65736a]">
                Prevents tax cascading by offsetting Input VAT paid on purchases against Output VAT collected from sales.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
              AUDITED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-1">
              <span className="text-[#65736a] block font-sans">Output VAT (From Sales)</span>
              <div className="text-lg font-bold text-[#181c1a]">${reconciliation.totalOutputVat.toLocaleString()}</div>
              <span className="text-[10px] text-[#65736a] font-sans">{reconciliation.salesCount} Invoices</span>
            </div>
            <div className="p-3.5 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-1">
              <span className="text-[#65736a] block font-sans">Input Tax Credit (ITC Paid)</span>
              <div className="text-lg font-bold text-[#1b4332]">-${reconciliation.totalInputVat.toLocaleString()}</div>
              <span className="text-[10px] text-[#65736a] font-sans">{reconciliation.purchasesCount} Purchases</span>
            </div>
            <div className="p-3.5 rounded bg-[#f8f7f4] border border-[#cad2c5] space-y-1">
              <span className="text-[#65736a] block font-sans">Net VAT Payable</span>
              <div className="text-lg font-bold text-[#1b4332]">${reconciliation.netVatPayable.toLocaleString()}</div>
              <span className="text-[10px] text-[#1b4332] font-sans">Output VAT &minus; Input VAT</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
