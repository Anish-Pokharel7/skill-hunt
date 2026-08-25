"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { TaxRule } from "@/lib/db/types";
import {
  Scale,
  Calculator,
  Percent,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function TaxEnginePage() {
  const { user, role, loginAsRole } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [reconciliation, setReconciliation] = useState<any>(null);

  // Live Calculator State
  const [hsCode, setHsCode] = useState("1509.10");
  const [baseAmount, setBaseAmount] = useState("1000");
  const [quantity, setQuantity] = useState("5");
  const [isImport, setIsImport] = useState(false);
  const [offeredPrice, setOfferedPrice] = useState("1150");
  const [calcResult, setCalcResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

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
    setIsCalculating(true);
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
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">National Tax & Price Compliance Engine</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              13% VAT STANDARD
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-Tier Cascading Tax Formulation &bull; Input Tax Credit (ITC) Reconciliation &bull; MRP Anti-Gouging
          </p>
        </div>
      </div>

      {/* Interactive Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Fiscal Tax & Price Simulator</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Commodity HS Code & Category</label>
              <select
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
                className="glass-input w-full bg-slate-900 font-mono"
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
                <label className="block text-slate-300 font-medium mb-1">Base Unit Cost ($)</label>
                <input
                  type="number"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  className="glass-input w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="glass-input w-full font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Offered Retail Selling Price ($)</label>
              <input
                type="number"
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(e.target.value)}
                className="glass-input w-full font-mono"
              />
              <span className="text-[10px] text-slate-500">Evaluates against statutory Maximum Retail Price (MRP).</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs text-white font-medium block">Imported Consignment</span>
                <span className="text-[10px] text-slate-400">Applies Customs Port Tariffs</span>
              </div>
              <input
                type="checkbox"
                checked={isImport}
                onChange={(e) => setIsImport(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Right Computation Results (7 Cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-cyan-400" />
              Tax Breakdown & Statutory Compliance Assessment
            </h3>
            {calcResult?.taxResult && (
              <span className="text-xs font-mono font-bold text-cyan-300">
                Effective Tax: {calcResult.taxResult.effectiveTaxRate}%
              </span>
            )}
          </div>

          {calcResult?.taxResult && (
            <div className="space-y-4">
              {/* Multi-Tier Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Subtotal</span>
                  <span className="text-base font-mono font-bold text-white">
                    ${calcResult.taxResult.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">
                    Excise ({(calcResult.taxResult.exciseRate * 100).toFixed(0)}%)
                  </span>
                  <span className="text-base font-mono font-bold text-amber-400">
                    ${calcResult.taxResult.exciseAmount.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">
                    VAT 13%
                  </span>
                  <span className="text-base font-mono font-bold text-indigo-400">
                    ${calcResult.taxResult.vatAmount.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Total Fiscal Gross</span>
                  <span className="text-base font-mono font-bold text-emerald-400">
                    ${calcResult.taxResult.finalGrossAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Price Compliance & Anti-Gouging Diagnostic */}
              {calcResult.priceCompliance && (
                <div
                  className={`p-4 rounded-xl border ${
                    calcResult.priceCompliance.isCompliant
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                      : "bg-rose-950/30 border-rose-500/40 text-rose-200"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {calcResult.priceCompliance.isCompliant ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-sm">
                        {calcResult.priceCompliance.isCompliant
                          ? "COMPLIANT WITH STATUTORY MRP REGULATIONS"
                          : "STATUTORY PRICE GOUGING ALERT"}
                      </div>
                      <p>
                        {calcResult.priceCompliance.isCompliant
                          ? `Offered price of $${offeredPrice} is within the government ceiling of $${calcResult.priceCompliance.statutoryMrp.toFixed(2)}.`
                          : calcResult.priceCompliance.warningMessage}
                      </p>
                      <div className="pt-1 flex gap-4 text-[11px] font-mono">
                        <span>Statutory Cap: <strong>${calcResult.priceCompliance.statutoryMrp}</strong></span>
                        <span>Actual Margin: <strong>{(calcResult.priceCompliance.actualMargin * 100).toFixed(1)}%</strong></span>
                        <span>Statutory Margin Cap: <strong>{(calcResult.priceCompliance.maxProfitMarginCap * 100).toFixed(1)}%</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Organization ITC & Cascading Tax Ledger */}
      {reconciliation && (
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Input Tax Credit (ITC) & Cascading VAT Reconciliation Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Prevents tax cascading by offsetting Input VAT paid on purchases against Output VAT collected from sales.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AUDITED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-1">
              <span className="text-slate-400 block font-sans">Total Output VAT (From Sales)</span>
              <div className="text-xl font-bold text-white">${reconciliation.totalOutputVat.toLocaleString()}</div>
              <span className="text-[10px] text-slate-500 font-sans">{reconciliation.salesCount} Verified Invoices</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-1">
              <span className="text-slate-400 block font-sans">Input Tax Credit (ITC Paid)</span>
              <div className="text-xl font-bold text-cyan-400">-${reconciliation.totalInputVat.toLocaleString()}</div>
              <span className="text-[10px] text-slate-500 font-sans">{reconciliation.purchasesCount} Purchase Invoices</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1">
              <span className="text-slate-400 block font-sans">Net VAT Payable to Government</span>
              <div className="text-xl font-bold text-emerald-400">${reconciliation.netVatPayable.toLocaleString()}</div>
              <span className="text-[10px] text-emerald-400 font-sans">Output VAT &minus; Input VAT</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
