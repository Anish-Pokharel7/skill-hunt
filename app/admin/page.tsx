"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { Organization, TaxRule, SystemAuditLog } from "@/lib/db/types";
import {
  Building2,
  ShieldCheck,
  Scale,
  Users,
  FileCheck,
  AlertTriangle,
  Lock,
  Plus,
  CheckCircle2,
  RefreshCw,
  Search,
} from "lucide-react";

export default function AdminPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "tax-policy" | "audit-logs" | "tenants">("overview");

  // Tax policy edit modal state
  const [selectedHsCode, setSelectedHsCode] = useState("1509.10");
  const [vatRate, setVatRate] = useState("0.13");
  const [exciseRate, setExciseRate] = useState("0.02");
  const [marginCap, setMarginCap] = useState("0.25");
  const [priceCap, setPriceCap] = useState("1500");
  const [policyMessage, setPolicyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isAuthorized = role === "SUPER_ADMIN" || role === "GOVERNMENT_ADMIN";

  useEffect(() => {
    fetchData();
  }, [role]);

  const fetchData = async () => {
    try {
      const resTax = await fetch("/api/tax");
      const dataTax = await resTax.json();
      if (dataTax.success) {
        setTaxRules(dataTax.taxRules || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPolicyMessage("");
    try {
      const res = await fetch("/api/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hsCode: selectedHsCode,
          standardVatRate: Number(vatRate),
          exciseDutyRate: Number(exciseRate),
          maxProfitMarginCap: Number(marginCap),
          statutoryPriceCap: Number(priceCap),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPolicyMessage("Tax policy & statutory MRP ceiling updated on the National Ledger!");
        fetchData();
      } else {
        setPolicyMessage(`Error: ${data.message || data.error}`);
      }
    } catch {
      setPolicyMessage("Failed to update tax policy.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl glass-panel border border-rose-500/30 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">403 Forbidden: Server Role Restriction</h2>
        <p className="text-xs sm:text-sm text-slate-300">
          The <strong>Admin & Government Portal</strong> is strictly restricted to <code className="bg-slate-900 px-1.5 py-0.5 rounded text-purple-300">SUPER_ADMIN</code> and <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-300">GOVERNMENT_ADMIN</code>. Your current role is <strong className="text-white">{role}</strong>.
        </p>
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => loginAsRole("SUPER_ADMIN")}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
          >
            Switch to Super Admin
          </button>
          <button
            onClick={() => loginAsRole("GOVERNMENT_ADMIN")}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
          >
            Switch to Government Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Admin & Government Control Center</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
              {role}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            National Fiscal Oversight &bull; Statutory MRP Controls &bull; Tenant Validation &bull; Security Audits
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "overview" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("tax-policy")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "tax-policy" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Tax Policies
          </button>
          <button
            onClick={() => setActiveTab("tenants")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "tenants" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Tenants
          </button>
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
              <span className="text-xs text-slate-400 font-medium">National Fiscal Volume</span>
              <div className="text-2xl font-black text-white font-mono">$1,420,850,000</div>
              <span className="text-[11px] text-emerald-400 font-semibold">+14.2% YoY Tax Compliance</span>
            </div>
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
              <span className="text-xs text-slate-400 font-medium">13% Output VAT Reconciled</span>
              <div className="text-2xl font-black text-cyan-400 font-mono">$184,710,500</div>
              <span className="text-[11px] text-slate-400">Automated ITC matching</span>
            </div>
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Active Tenants (Orgs)</span>
              <div className="text-2xl font-black text-purple-400 font-mono">14,280</div>
              <span className="text-[11px] text-slate-400">Mfg, Importers, Retailers</span>
            </div>
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Statutory Violations</span>
              <div className="text-2xl font-black text-rose-400 font-mono">3 Open</div>
              <span className="text-[11px] text-rose-400 font-semibold">Assigned to Tax Officers</span>
            </div>
          </div>

          {/* Quick Info Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-400" />
                Statutory Tax Rates & MRP Ceilings
              </h3>
              <div className="divide-y divide-white/5 text-xs">
                {taxRules.map((rule) => (
                  <div key={rule.hsCode} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{rule.category}</div>
                      <div className="text-[11px] text-slate-400 font-mono">HS: {rule.hsCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-cyan-300">
                        VAT: {(rule.standardVatRate * 100).toFixed(0)}% | Excise: {(rule.exciseDutyRate * 100).toFixed(0)}%
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Max Margin: {(rule.maxProfitMarginCap * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Zero-Trust Server Policy Status
              </h3>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Anti-IDOR Tenant Guard:</strong> All invoice, batch, and inventory queries strictly enforce tenant boundaries on the server.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Statutory Price Gouging Shield:</strong> Point-of-sale transactions exceeding statutory MRP ceilings trigger automatic server-side blocking & fraud flags.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Digital Product Passport Registry:</strong> Cryptographic signatures verified on each consumer scan.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tax Policy Configuration */}
      {activeTab === "tax-policy" && (
        <div className="p-6 rounded-2xl glass-panel border border-white/10 max-w-2xl mx-auto space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">National Tax Rate & MRP Ceiling Editor</h3>
            <p className="text-xs text-slate-400">
              Modifying these policies immediately updates the server tax engine and POS anti-gouging checks nationwide.
            </p>
          </div>

          <form onSubmit={handleUpdatePolicy} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Select Commodity (HS Code)</label>
              <select
                value={selectedHsCode}
                onChange={(e) => {
                  setSelectedHsCode(e.target.value);
                  const found = taxRules.find((r) => r.hsCode === e.target.value);
                  if (found) {
                    setVatRate(found.standardVatRate.toString());
                    setExciseRate(found.exciseDutyRate.toString());
                    setMarginCap(found.maxProfitMarginCap.toString());
                    setPriceCap(found.statutoryPriceCap?.toString() || "");
                  }
                }}
                className="glass-input w-full"
              >
                {taxRules.map((r) => (
                  <option key={r.hsCode} value={r.hsCode} className="bg-slate-900">
                    {r.hsCode} - {r.category} ({r.description})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Standard VAT Rate (0.13 = 13%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  className="glass-input w-full font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Excise Duty Rate (0.02 = 2%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={exciseRate}
                  onChange={(e) => setExciseRate(e.target.value)}
                  className="glass-input w-full font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Profit Margin Cap (0.25 = 25%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={marginCap}
                  onChange={(e) => setMarginCap(e.target.value)}
                  className="glass-input w-full font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Statutory MRP Cap ($ USD / Local)</label>
                <input
                  type="number"
                  value={priceCap}
                  onChange={(e) => setPriceCap(e.target.value)}
                  className="glass-input w-full font-mono"
                  placeholder="Optional price ceiling"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? "Broadcasting to Ledger..." : "Update National Policy"}
            </button>

            {policyMessage && (
              <div className={`p-3 rounded-lg text-xs font-semibold ${
                policyMessage.includes("Error") ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
              }`}>
                {policyMessage}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Tab: Tenants */}
      {activeTab === "tenants" && (
        <div className="p-6 rounded-2xl glass-panel border border-white/10 space-y-4">
          <h3 className="text-base font-bold text-white">Registered Organizations & Tenant Ledger</h3>
          <p className="text-xs text-slate-400">
            Multi-tenant entities isolated under strict server-side partition keys.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400 font-mono">
                <tr>
                  <th className="py-2 px-3">Organization</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Tax PIN / PAN</th>
                  <th className="py-2 px-3">License No</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr className="hover:bg-slate-900/40">
                  <td className="py-3 px-3 font-semibold text-white">Apex BioTech & Consumer Goods Mfg Ltd</td>
                  <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">MANUFACTURER</span></td>
                  <td className="py-3 px-3 font-mono">MFG-PAN-9948201</td>
                  <td className="py-3 px-3 font-mono">MFG-IND-8849-01</td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">Verified</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="py-3 px-3 font-semibold text-white">Pacific Horizon Logistics & Importers Corp</td>
                  <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">IMPORTER</span></td>
                  <td className="py-3 px-3 font-mono">IMP-PAN-4410982</td>
                  <td className="py-3 px-3 font-mono">IMP-CUST-7721-04</td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">Verified</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="py-3 px-3 font-semibold text-white">Metro Retail Distribution & SuperMart Pvt Ltd</td>
                  <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">RETAILER</span></td>
                  <td className="py-3 px-3 font-mono">BIZ-VAT-8823104</td>
                  <td className="py-3 px-3 font-mono">RET-REG-3391-22</td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">Verified</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
