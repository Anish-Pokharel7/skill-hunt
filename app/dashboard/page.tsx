"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { Organization, TaxRule, SystemAuditLog, FraudAlert, TaxReturnSummary } from "@/lib/db/types";
import {
  Building2,
  ShieldCheck,
  Scale,
  Users,
  Lock,
  Plus,
  CheckCircle2,
  Search,
  AlertTriangle,
  BarChart3,
  FileText,
  TrendingUp,
  Eye,
  MoreHorizontal,
  Activity,
  Target,
  Shield,
  Database,
  ChevronRight,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user, role, loginAsRole } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [taxReturns, setTaxReturns] = useState<TaxReturnSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "fraud" | "tax-reconciliation" | "audit-logs">("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);

  const isAuthorized = ["SUPER_ADMIN", "TAX_OFFICER", "AUDITOR"].includes(role);

  useEffect(() => {
    fetchData();
  }, [role]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resTax, resFraud, resReturns, resAudit] = await Promise.all([
        fetch("/api/tax"),
        fetch("/api/fraud"),
        fetch("/api/tax-returns"),
        fetch("/api/audit-logs"),
      ]);
      const [dataTax, dataFraud, dataReturns, dataAudit] = await Promise.all([
        resTax.json(),
        resFraud.json(),
        resReturns.json(),
        resAudit.json(),
      ]);
      if (dataTax.success) setTaxRules(dataTax.taxRules || []);
      if (dataFraud.success) setFraudAlerts(dataFraud.alerts || []);
      if (dataReturns.success) setTaxReturns(dataReturns.returns || []);
      if (dataAudit.success) setAuditLogs(dataAudit.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertAction = async (alertId: string, action: "investigate" | "resolve" | "dismiss") => {
    try {
      const res = await fetch("/api/fraud", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        setSelectedAlert(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded gov-card text-center space-y-4 border border-[#e5e2da]">
        <div className="w-10 h-10 rounded bg-[#fbeeed] text-[#8c322c] mx-auto flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-[#181c1a]">403 Forbidden: Admin Access Required</h2>
        <p className="text-xs text-[#4c5850]">
          The <strong>Admin Enforcement Dashboard</strong> is restricted to <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#181c1a]">SUPER_ADMIN</code>, <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#181c1a]">TAX_OFFICER</code>, and <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#181c1a]">AUDITOR</code> roles. Your current persona is <strong>{role}</strong>.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => loginAsRole("TAX_OFFICER")}
            className="px-4 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition"
          >
            Switch to Tax Officer
          </button>
          <button
            onClick={() => loginAsRole("AUDITOR")}
            className="px-4 py-2 rounded bg-[#fbeeed] hover:bg-[#f7dedc] text-[#8c322c] font-semibold text-xs border border-[#f2cfcd] transition"
          >
            Switch to Auditor
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    totalAlerts: fraudAlerts.length,
    criticalAlerts: fraudAlerts.filter(a => a.severity === "CRITICAL").length,
    openAlerts: fraudAlerts.filter(a => a.status === "OPEN").length,
    totalTaxRevenue: taxReturns.reduce((sum, r) => sum + r.netVatPayable + r.totalExcisePayable, 0),
    matchedReturns: taxReturns.filter(r => r.reconciliationStatus === "MATCHED").length,
    totalAuditLogs: auditLogs.length,
    blockedIdor: auditLogs.filter(l => l.status === "BLOCKED_IDOR").length,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e5e2da]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#181c1a]">Admin Enforcement Dashboard</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
              {role}
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            Fraud Detection &bull; Tax Reconciliation &bull; Audit Trail &bull; Compliance Monitoring
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
            onClick={() => setActiveTab("fraud")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "fraud" ? "bg-[#8c322c] text-white font-semibold" : "text-[#4c5850] hover:text-[#181c1a]"
            }`}
          >
            Fraud Desk
          </button>
          <button
            onClick={() => setActiveTab("tax-reconciliation")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "tax-reconciliation" ? "bg-[#2b4c6f] text-white font-semibold" : "text-[#4c5850] hover:text-[#181c1a]"
            }`}
          >
            Tax Reconciliation
          </button>
          <button
            onClick={() => setActiveTab("audit-logs")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "audit-logs" ? "bg-[#4a4036] text-white font-semibold" : "text-[#4c5850] hover:text-[#181c1a]"
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded gov-card space-y-1 border-l-4 border-[#8c322c]">
              <span className="text-xs text-[#65736a]">Active Fraud Alerts</span>
              <div className="text-xl font-bold text-[#8c322c] font-mono">{stats.openAlerts}</div>
              <span className="text-[11px] text-[#8c322c] font-medium">{stats.criticalAlerts} Critical</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1 border-l-4 border-[#1b4332]">
              <span className="text-xs text-[#65736a]">Tax Revenue (Period)</span>
              <div className="text-xl font-bold text-[#1b4332] font-mono">${stats.totalTaxRevenue.toLocaleString()}</div>
              <span className="text-[11px] text-[#65736a]">{stats.matchedReturns} Returns Matched</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1 border-l-4 border-[#2b4c6f]">
              <span className="text-xs text-[#65736a]">Audit Events (24h)</span>
              <div className="text-xl font-bold text-[#2b4c6f] font-mono">{stats.totalAuditLogs}</div>
              <span className="text-[11px] text-[#65736a]">{stats.blockedIdor} IDOR Blocked</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1 border-l-4 border-[#4a4036]">
              <span className="text-xs text-[#65736a]">Tax Rules Active</span>
              <div className="text-xl font-bold text-[#4a4036] font-mono">{taxRules.length}</div>
              <span className="text-[11px] text-[#65736a]">HS Code Categories</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 rounded gov-card space-y-3">
              <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#8c322c]" />
                Recent Fraud Alerts
              </h3>
              <div className="divide-y divide-[#e5e2da] text-xs max-h-72 overflow-y-auto">
                {fraudAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-[#f8f7f4]"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-[#181c1a] ${alert.severity === "CRITICAL" ? "text-[#8c322c]" : alert.severity === "HIGH" ? "text-[#a0400e]" : ""}`}>
                          {alert.title}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                          alert.severity === "CRITICAL" ? "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]" :
                          alert.severity === "HIGH" ? "bg-[#fbf3e8] text-[#8a5b14] border border-[#eeddc2]" :
                          alert.severity === "MEDIUM" ? "bg-[#eef2f6] text-[#2b4c6f] border border-[#d0dbe7]" :
                          "bg-[#f0f4f1] text-[#2d5a45] border border-[#d2ded5]"
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#65736a] mt-0.5">{alert.description.substring(0, 80)}...</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-[#4c5850] font-mono">{new Date(alert.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-[#65736a]">{alert.status}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#8c9890] shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded gov-card space-y-3">
              <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#1b4332]" />
                System Security & Compliance
              </h3>
              <div className="space-y-2 text-xs text-[#333d37]">
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#181c1a]">Anti-IDOR Tenant Isolation:</strong> {stats.blockedIdor} cross-tenant access attempts blocked in last 24h.
                  </div>
                </div>
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#181c1a]">Statutory MRP Enforcement:</strong> Automated POS price gouging detection active across all retail terminals.
                  </div>
                </div>
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#181c1a]">Cryptographic DPP Registry:</strong> Tamper-evident hash chains verified on each consumer check.
                  </div>
                </div>
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#181c1a]">ITC Reconciliation:</strong> {stats.matchedReturns} tax returns matched; Input Tax Credit chain verified.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 rounded gov-card space-y-3">
              <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#2b4c6f]" />
                Tax Collection Summary
              </h3>
              <div className="divide-y divide-[#e5e2da] text-xs">
                {taxReturns.map((ret) => (
                  <div key={ret.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#181c1a]">{ret.orgName}</div>
                      <div className="text-[11px] text-[#65736a] font-mono">{ret.taxPin} • {ret.taxPeriod}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-[#1b4332] font-bold">Net VAT: ${ret.netVatPayable.toLocaleString()}</div>
                      <div className="text-[11px] text-[#65736a]">Excise: ${ret.totalExcisePayable.toLocaleString()}</div>
                      <div className={`text-[11px] font-semibold ${
                        ret.reconciliationStatus === "MATCHED" ? "text-[#1b4332]" : "text-[#8c322c]"
                      }`}>
                        {ret.reconciliationStatus}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded gov-card space-y-3">
              <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#4a4036]" />
                Current Statutory Tax Rates
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
          </div>
        </div>
      )}

      {/* Tab: Fraud Desk */}
      {activeTab === "fraud" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#181c1a]">Fraud & Risk Enforcement Desk</h3>
              <p className="text-xs text-[#65736a]">
                Anomaly detection for duplicate QR scans, price gouging spikes, and carousel VAT evasion.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-[#fbeeed] text-[#8c322c] text-xs font-mono border border-[#f2cfcd]">
                {stats.totalAlerts} Total Alerts
              </span>
            </div>
          </div>

          <div className="p-5 rounded gov-card space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5e2da]">
                <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
                  <tr>
                    <th className="py-2 px-3">Alert ID</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Severity</th>
                    <th className="py-2 px-3">Title</th>
                    <th className="py-2 px-3">Target</th>
                    <th className="py-2 px-3">Risk</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Assigned</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2da] text-[#333d37]">
                  {fraudAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-[#f8f7f4] cursor-pointer"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <td className="py-2.5 px-3 font-mono text-[#65736a]">{alert.id.replace("alert_fraud_", "#")}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.2 rounded bg-[#f3f1ec] text-[#333d37] border border-[#e5e2da] text-[10px] font-mono">
                          {alert.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                          alert.severity === "CRITICAL" ? "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]" :
                          alert.severity === "HIGH" ? "bg-[#fbf3e8] text-[#8a5b14] border border-[#eeddc2]" :
                          alert.severity === "MEDIUM" ? "bg-[#eef2f6] text-[#2b4c6f] border border-[#d0dbe7]" :
                          "bg-[#f0f4f1] text-[#2d5a45] border border-[#d2ded5]"
                        }`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#181c1a] max-w-xs truncate">{alert.title}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{alert.targetOrgName || alert.targetSerialNumber || "N/A"}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#8c322c]">{alert.riskScore}/100</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                          alert.status === "OPEN" ? "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]" :
                          alert.status === "UNDER_INVESTIGATION" ? "bg-[#fbf3e8] text-[#8a5b14] border border-[#eeddc2]" :
                          alert.status === "CONFIRMED_FRAUD" ? "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]" :
                          "bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]"
                        }`}>
                          {alert.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#65736a]">{alert.assignedOfficerName || "Unassigned"}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAlertAction(alert.id, "investigate"); }}
                            className="p-1.5 rounded hover:bg-[#eef2f6] text-[#2b4c6f] transition"
                            title="Investigate"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {alert.status === "OPEN" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAlertAction(alert.id, "resolve"); }}
                              className="p-1.5 rounded hover:bg-[#eaf0ec] text-[#1b4332] transition"
                              title="Mark Under Investigation"
                            >
                              <Target className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {alert.status === "UNDER_INVESTIGATION" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAlertAction(alert.id, "dismiss"); }}
                              className="p-1.5 rounded hover:bg-[#fbeeed] text-[#8c322c] transition"
                              title="Resolve/Dismiss"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tax Reconciliation */}
      {activeTab === "tax-reconciliation" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#181c1a]">Tax Reconciliation & ITC Ledger</h3>
              <p className="text-xs text-[#65736a]">
                Output VAT, Input Tax Credit, Net Payable, and reconciliation status across all tenants.
              </p>
            </div>
          </div>

          <div className="p-5 rounded gov-card space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5e2da]">
                <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
                  <tr>
                    <th className="py-2 px-3">Organization</th>
                    <th className="py-2 px-3">Tax PIN</th>
                    <th className="py-2 px-3">Period</th>
                    <th className="py-2 px-3">Output VAT</th>
                    <th className="py-2 px-3">Input VAT (ITC)</th>
                    <th className="py-2 px-3">Excise</th>
                    <th className="py-2 px-3">Customs Duty</th>
                    <th className="py-2 px-3">Net Payable</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2da] text-[#333d37]">
                  {taxReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-[#f8f7f4]">
                      <td className="py-2.5 px-3 font-semibold text-[#181c1a]">{ret.orgName}</td>
                      <td className="py-2.5 px-3 font-mono">{ret.taxPin}</td>
                      <td className="py-2.5 px-3 font-mono">{ret.taxPeriod}</td>
                      <td className="py-2.5 px-3 font-mono text-[#1b4332]">${ret.totalOutputVat.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono text-[#2b4c6f]">${ret.totalInputVat.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono text-[#8a5b14]">${ret.totalExcisePayable.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono text-[#4a4036]">${ret.customsDutyClaimed.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#181c1a]">${ret.netVatPayable.toLocaleString()}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                          ret.reconciliationStatus === "MATCHED" ? "bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]" :
                          ret.reconciliationStatus === "AUDIT_REQUIRED" ? "bg-[#fbf3e8] text-[#8a5b14] border border-[#eeddc2]" :
                          "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]"
                        }`}>
                          {ret.reconciliationStatus.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === "audit-logs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#181c1a]">System Audit Trail</h3>
              <p className="text-xs text-[#65736a]">
                Immutable log of all system actions, access attempts, and authorization decisions.
              </p>
            </div>
          </div>

          <div className="p-5 rounded gov-card space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5e2da]">
                <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">User</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3">Organization</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Resource</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2da] text-[#333d37]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#f8f7f4]">
                      <td className="py-2.5 px-3 font-mono text-[10px] text-[#65736a]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#181c1a]">{log.userName}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                          log.userRole === "SUPER_ADMIN" ? "bg-[#1b4332] text-white" :
                          log.userRole === "TAX_OFFICER" ? "bg-[#fbf3e8] text-[#8a5b14] border border-[#eeddc2]" :
                          log.userRole === "MANUFACTURER" ? "bg-[#eaf0ec] text-[#2d5a45] border border-[#c1d3c8]" :
                          log.userRole === "IMPORTER" ? "bg-[#eef2f6] text-[#2b4c6f] border border-[#d0dbe7]" :
                          log.userRole === "BUSINESS_EMPLOYEE" ? "bg-[#f6f5f2] text-[#55524c] border border-[#e2ded6]" :
                          log.userRole === "AUDITOR" ? "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]" :
                          "bg-[#f0f4f1] text-[#2d5a45] border border-[#d2ded5]"
                        }`}>
                          {log.userRole}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#65736a]">{log.orgName}</td>
                      <td className="py-2.5 px-3 font-mono text-[10px]">{log.action}</td>
                      <td className="py-2.5 px-3 font-mono text-[10px]">{log.resourceType}: {log.resourceId}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                          log.status === "SUCCESS" ? "bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]" :
                          log.status === "BLOCKED_UNAUTHORIZED" ? "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]" :
                          log.status === "BLOCKED_IDOR" ? "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]" :
                          "bg-[#fbf3e8] text-[#8a5b14] border border-[#eeddc2]"
                        }`}>
                          {log.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#4c5850] max-w-xs truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Fraud Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#d2cebf] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[#e5e2da] pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#163828]">Fraud Alert Details</h3>
                <p className="text-xs text-[#65736a]">{selectedAlert.id}</p>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 text-[#65736a] hover:text-[#181c1a] rounded hover:bg-[#f3f1ec]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[#65736a] block">Type</span>
                  <span className="font-semibold text-[#181c1a]">{selectedAlert.type.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-[#65736a] block">Severity</span>
                  <span className={`font-semibold px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    selectedAlert.severity === "CRITICAL" ? "bg-[#fbeeed] text-[#8c322c]" :
                    selectedAlert.severity === "HIGH" ? "bg-[#fbf3e8] text-[#8a5b14]" :
                    selectedAlert.severity === "MEDIUM" ? "bg-[#eef2f6] text-[#2b4c6f]" :
                    "bg-[#f0f4f1] text-[#2d5a45]"
                  }`}>
                    {selectedAlert.severity}
                  </span>
                </div>
                <div>
                  <span className="text-[#65736a] block">Risk Score</span>
                  <span className="font-bold text-[#8c322c] font-mono">{selectedAlert.riskScore}/100</span>
                </div>
                <div>
                  <span className="text-[#65736a] block">Status</span>
                  <span className={`font-semibold px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    selectedAlert.status === "OPEN" ? "bg-[#fbeeed] text-[#8c322c]" :
                    selectedAlert.status === "UNDER_INVESTIGATION" ? "bg-[#fbf3e8] text-[#8a5b14]" :
                    selectedAlert.status === "CONFIRMED_FRAUD" ? "bg-[#fbeeed] text-[#8c322c]" :
                    "bg-[#eaf0ec] text-[#1b4332]"
                  }`}>
                    {selectedAlert.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                <span className="text-[#65736a] block mb-1">Description</span>
                <p className="text-[#333d37]">{selectedAlert.description}</p>
              </div>

              {selectedAlert.targetSerialNumber && (
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[#65736a] block mb-1">Target Serial</span>
                  <p className="font-mono text-[#181c1a]">{selectedAlert.targetSerialNumber}</p>
                </div>
              )}

              {selectedAlert.targetBatchId && (
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[#65736a] block mb-1">Target Batch</span>
                  <p className="font-mono text-[#181c1a]">{selectedAlert.targetBatchId}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[#65736a] block">Reported By</span>
                  <p className="font-semibold text-[#181c1a]">{selectedAlert.reportedBy}</p>
                </div>
                <div>
                  <span className="text-[#65736a] block">Assigned Officer</span>
                  <p className="font-semibold text-[#181c1a]">{selectedAlert.assignedOfficerName || "Unassigned"}</p>
                </div>
              </div>

              {selectedAlert.actionNotes && (
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[#65736a] block mb-1">Action Notes</span>
                  <p className="text-[#333d37]">{selectedAlert.actionNotes}</p>
                </div>
              )}

              <div className="pt-2 border-t border-[#e5e2da] flex items-center justify-end gap-2">
                {selectedAlert.status === "OPEN" && (
                  <button
                    onClick={() => handleAlertAction(selectedAlert.id, "investigate")}
                    className="px-4 py-2 rounded bg-[#2b4c6f] hover:bg-[#1e3a5c] text-white font-semibold text-xs transition"
                  >
                    Mark Under Investigation
                  </button>
                )}
                {selectedAlert.status === "UNDER_INVESTIGATION" && (
                  <button
                    onClick={() => handleAlertAction(selectedAlert.id, "resolve")}
                    className="px-4 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition"
                  >
                    Resolve / Close
                  </button>
                )}
                {selectedAlert.status === "OPEN" && (
                  <button
                    onClick={() => handleAlertAction(selectedAlert.id, "dismiss")}
                    className="px-4 py-2 rounded bg-[#f3f1ec] hover:bg-[#eae7df] text-[#333d37] font-semibold text-xs border border-[#e5e2da] transition"
                  >
                    Dismiss as False Positive
                  </button>
                )}
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 rounded bg-[#ffffff] hover:bg-[#f3f1ec] text-[#333d37] font-semibold text-xs border border-[#e5e2da] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}