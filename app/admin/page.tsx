"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { Organization, TaxRule, SystemAuditLog } from "@/lib/db/types";
import {
  Building2,
  ShieldCheck,
  Scale,
  Users,
  Lock,
  Plus,
  CheckCircle2,
  Search,
} from "lucide-react";

export default function AdminPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "tax-policy" | "tenants">("overview");

  // Tax policy edit state
  const [selectedHsCode, setSelectedHsCode] = useState("1509.10");
  const [vatRate, setVatRate] = useState("0.13");
  const [exciseRate, setExciseRate] = useState("0.02");
  const [marginCap, setMarginCap] = useState("0.25");
  const [priceCap, setPriceCap] = useState("1500");
  const [policyMessage, setPolicyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isAuthorized = role === "SUPER_ADMIN";

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
        setPolicyMessage("National tax policy & MRP ceiling updated successfully.");
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
      <div className="max-w-2xl mx-auto my-12 p-8 rounded gov-card text-center space-y-4 border border-[#e5e2da]">
        <div className="w-10 h-10 rounded bg-[#fbeeed] text-[#8c322c] mx-auto flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-[#181c1a]">403 Forbidden: Authorized Directorate Access Only</h2>
        <p className="text-xs text-[#4c5850]">
          The <strong>Admin & Government Directorate</strong> is restricted to <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#181c1a]">SUPER_ADMIN</code> (the Government Authority). Your current persona is <strong>{role}</strong>.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => loginAsRole("SUPER_ADMIN")}
            className="px-4 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e5e2da]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#181c1a]">Admin & Government Directorate</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
              {role}
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            National Fiscal Policy &bull; Statutory MRP Controls &bull; Tenant Organization Registry
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#ffffff] p-1 rounded border border-[#e5e2da] text-xs font-medium">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "overview" ? "bg-[#1b4332] text-white font-semibold" : "text-[#4c5850] hover:text-[#181c1a]"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("tax-policy")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "tax-policy" ? "bg-[#1b4332] text-white font-semibold" : "text-[#4c5850] hover:text-[#181c1a]"
            }`}
          >
            Tax Policies & MRP
          </button>
          <button
            onClick={() => setActiveTab("tenants")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "tenants" ? "bg-[#1b4332] text-white font-semibold" : "text-[#4c5850] hover:text-[#181c1a]"
            }`}
          >
            Tenant Registry
          </button>
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded gov-card space-y-1">
              <span className="text-xs text-[#65736a]">National Trade Volume</span>
              <div className="text-xl font-bold text-[#181c1a] font-mono">$1,420,850,000</div>
              <span className="text-[11px] text-[#1b4332] font-medium">+14.2% YoY Compliance</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1">
              <span className="text-xs text-[#65736a]">13% Output VAT Reconciled</span>
              <div className="text-xl font-bold text-[#1b4332] font-mono">$184,710,500</div>
              <span className="text-[11px] text-[#65736a]">Automated ITC Matching</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1">
              <span className="text-xs text-[#65736a]">Registered Tenants</span>
              <div className="text-xl font-bold text-[#181c1a] font-mono">14,280</div>
              <span className="text-[11px] text-[#65736a]">Mfg, Importers, Retailers</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1">
              <span className="text-xs text-[#65736a]">Open Violation Cases</span>
              <div className="text-xl font-bold text-[#8c322c] font-mono">3 Active</div>
              <span className="text-[11px] text-[#8c322c] font-medium">Assigned to Tax Officers</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded gov-card space-y-3">
              <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#1b4332]" />
                Current Statutory Tax Rates & Margins
              </h3>
              <div className="divide-y divide-[#e5e2da] text-xs">
                {taxRules.map((rule) => (
                  <div key={rule.hsCode} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#181c1a]">{rule.category}</div>
                      <div className="text-[11px] text-[#65736a] font-mono">HS: {rule.hsCode}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-[#1b4332] font-bold">
                        VAT {(rule.standardVatRate * 100).toFixed(0)}% | Excise {(rule.exciseDutyRate * 100).toFixed(0)}%
                      </div>
                      <div className="text-[11px] text-[#65736a]">
                        Max Margin: {(rule.maxProfitMarginCap * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded gov-card space-y-3">
              <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1b4332]" />
                Server Policy & Compliance Guarantees
              </h3>
              <div className="space-y-2 text-xs text-[#333d37]">
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#181c1a]">Anti-IDOR Tenant Guard:</strong> Invoices, batches, and inventory records strictly enforce tenant boundaries on every server route.
                  </div>
                </div>
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#181c1a]">Statutory MRP Shield:</strong> Point-of-sale transactions exceeding statutory MRP caps trigger automatic server-side fraud flags.
                  </div>
                </div>
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#181c1a]">Cryptographic DPP Registry:</strong> Tamper-evident hash chains verified on each consumer check.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tax Policy Configuration */}
      {activeTab === "tax-policy" && (
        <div className="p-6 rounded gov-card max-w-2xl mx-auto space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#181c1a]">National Tax Rate & MRP Ceiling Editor</h3>
            <p className="text-xs text-[#65736a]">
              Policy adjustments take immediate effect across all retail POS registers and customs clearance terminals.
            </p>
          </div>

          <form onSubmit={handleUpdatePolicy} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#333d37] font-medium mb-1">Select Commodity (HS Code)</label>
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
                className="gov-input w-full font-mono"
              >
                {taxRules.map((r) => (
                  <option key={r.hsCode} value={r.hsCode}>
                    {r.hsCode} - {r.category} ({r.description})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Standard VAT Rate (0.13 = 13%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  className="gov-input w-full font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Excise Duty Rate (0.02 = 2%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={exciseRate}
                  onChange={(e) => setExciseRate(e.target.value)}
                  className="gov-input w-full font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Max Profit Margin Cap (0.25 = 25%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={marginCap}
                  onChange={(e) => setMarginCap(e.target.value)}
                  className="gov-input w-full font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Statutory MRP Cap ($ USD / Local)</label>
                <input
                  type="number"
                  value={priceCap}
                  onChange={(e) => setPriceCap(e.target.value)}
                  className="gov-input w-full font-mono"
                  placeholder="Optional price ceiling"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition cursor-pointer"
            >
              {isLoading ? "Broadcasting to Ledger..." : "Update National Policy"}
            </button>

            {policyMessage && (
              <div className={`p-2.5 rounded text-xs font-semibold ${
                policyMessage.includes("Error") ? "bg-[#fbeeed] text-[#8c322c]" : "bg-[#eaf0ec] text-[#1b4332]"
              }`}>
                {policyMessage}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Tab: Tenants */}
      {activeTab === "tenants" && (
        <div className="p-5 rounded gov-card space-y-4">
          <h3 className="text-sm font-bold text-[#181c1a]">Accredited Organization Directory</h3>
          <p className="text-xs text-[#65736a]">
            Commercial tenants verified and partitioned on the National Ledger.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#e5e2da]">
              <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
                <tr>
                  <th className="py-2 px-3">Organization</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Tax PIN / PAN</th>
                  <th className="py-2 px-3">License No</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e2da] text-[#333d37]">
                <tr className="hover:bg-[#f8f7f4]">
                  <td className="py-2.5 px-3 font-semibold text-[#181c1a]">Apex BioTech & Consumer Goods Mfg Ltd</td>
                  <td className="py-2.5 px-3"><span className="px-1.5 py-0.2 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">MANUFACTURER</span></td>
                  <td className="py-2.5 px-3 font-mono">MFG-PAN-9948201</td>
                  <td className="py-2.5 px-3 font-mono">MFG-IND-8849-01</td>
                  <td className="py-2.5 px-3 text-[#1b4332] font-semibold">Verified</td>
                </tr>
                <tr className="hover:bg-[#f8f7f4]">
                  <td className="py-2.5 px-3 font-semibold text-[#181c1a]">Pacific Horizon Logistics & Importers Corp</td>
                  <td className="py-2.5 px-3"><span className="px-1.5 py-0.2 rounded bg-[#eef2f6] text-[#2b4c6f] border border-[#d0dbe7]">IMPORTER</span></td>
                  <td className="py-2.5 px-3 font-mono">IMP-PAN-4410982</td>
                  <td className="py-2.5 px-3 font-mono">IMP-CUST-7721-04</td>
                  <td className="py-2.5 px-3 text-[#1b4332] font-semibold">Verified</td>
                </tr>
                <tr className="hover:bg-[#f8f7f4]">
                  <td className="py-2.5 px-3 font-semibold text-[#181c1a]">Metro Retail Distribution & SuperMart Pvt Ltd</td>
                  <td className="py-2.5 px-3"><span className="px-1.5 py-0.2 rounded bg-[#f2efe9] text-[#4a4036] border border-[#ded8cc]">RETAILER</span></td>
                  <td className="py-2.5 px-3 font-mono">BIZ-VAT-8823104</td>
                  <td className="py-2.5 px-3 font-mono">RET-REG-3391-22</td>
                  <td className="py-2.5 px-3 text-[#1b4332] font-semibold">Verified</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
