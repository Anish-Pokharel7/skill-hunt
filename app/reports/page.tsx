"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { SystemAuditLog } from "@/lib/db/types";
import {
  BarChart3,
  ShieldCheck,
  Download,
  Filter,
  FileSpreadsheet,
  Lock,
  Search,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function ReportsPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const isAuthorized =
    role === "AUDITOR" ||
    role === "TAX_OFFICER" ||
    role === "GOVERNMENT_ADMIN" ||
    role === "SUPER_ADMIN";

  const sampleAuditLogs: SystemAuditLog[] = [
    {
      id: "audit_log_001",
      timestamp: "2026-02-25T08:00:00.000Z",
      userId: "usr_mfg_01",
      userName: "Elena Rostova",
      userRole: "MANUFACTURER",
      orgId: "org_mfg_01",
      orgName: "Apex BioTech & Consumer Goods Mfg Ltd",
      action: "MINT_BATCH_AND_PASSPORTS",
      resourceType: "BATCH",
      resourceId: "batch_mfg_901",
      ipAddress: "192.168.10.45",
      status: "SUCCESS",
      details: "Minted 5,000 units with cryptographic DPP QR passports under HS Code 1509.10.",
    },
    {
      id: "audit_log_002",
      timestamp: "2026-02-25T08:10:00.000Z",
      userId: "usr_biz_owner_01",
      userName: "Kavita Patel",
      userRole: "BUSINESS_OWNER",
      orgId: "org_biz_01",
      orgName: "Metro Retail Distribution & SuperMart Pvt Ltd",
      action: "ATTEMPT_CROSS_ORG_INVOICE_READ",
      resourceType: "INVOICE",
      resourceId: "inv_foreign_9921",
      ipAddress: "10.0.4.12",
      status: "BLOCKED_IDOR",
      details: "Server RBAC successfully blocked user from viewing invoice belonging to third-party tenant.",
    },
    {
      id: "audit_log_003",
      timestamp: "2026-02-25T08:20:00.000Z",
      userId: "usr_gov_01",
      userName: "Dr. Rajesh Sharma",
      userRole: "GOVERNMENT_ADMIN",
      orgId: "org_gov_01",
      orgName: "National Revenue & Customs Authority (Gov)",
      action: "UPDATE_TAX_POLICY_RULE",
      resourceType: "TAX_RULE",
      resourceId: "tax_rule_01",
      ipAddress: "172.16.0.5",
      status: "SUCCESS",
      details: "Updated statutory MRP ceiling for essential medicines (HS Code 3004.90).",
    },
    {
      id: "audit_log_004",
      timestamp: "2026-02-25T08:35:00.000Z",
      userId: "usr_biz_emp_01",
      userName: "Rohan Joshi",
      userRole: "BUSINESS_EMPLOYEE",
      orgId: "org_biz_01",
      orgName: "Metro Retail Distribution & SuperMart Pvt Ltd",
      action: "ISSUE_FISCAL_INVOICE",
      resourceType: "INVOICE",
      resourceId: "inv_fiscal_8802",
      ipAddress: "192.168.1.102",
      status: "SUCCESS",
      details: "Issued B2C Retail Invoice #INV-2026-8802. 13% VAT stamped with IRN hash.",
    },
  ];

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl glass-panel border border-rose-500/30 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">403 Forbidden: Auditor Access Required</h2>
        <p className="text-xs sm:text-sm text-slate-300">
          The <strong>Reports & Forensic Audit Portal</strong> requires <code className="bg-slate-900 px-1.5 py-0.5 rounded text-rose-300">AUDITOR</code>, <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">TAX_OFFICER</code>, or <code className="bg-slate-900 px-1.5 py-0.5 rounded text-purple-300">ADMIN</code> roles.
        </p>
        <button
          onClick={() => loginAsRole("AUDITOR")}
          className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
        >
          Switch to Auditor Role (Arthur Pendelton)
        </button>
      </div>
    );
  }

  const filteredLogs = sampleAuditLogs.filter((log) => {
    const matchesFilter = filterStatus === "ALL" || log.status === filterStatus;
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Reports & Forensic Audit Ledger</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
              AUDIT TRAIL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-Tier Revenue Reconciliation &bull; Tax Gap Analysis &bull; Zero-Trust Access Logs
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Reconciled Tax Ledgers</span>
          <div className="text-2xl font-black text-white font-mono">$184.7M</div>
          <span className="text-[11px] text-emerald-400 font-semibold">100% Tax Trail Verifiable</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Security & IDOR Blocks</span>
          <div className="text-2xl font-black text-rose-400 font-mono">100% Guarded</div>
          <span className="text-[11px] text-slate-400">Zero Cross-Tenant Leakage</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Compliance Rate</span>
          <div className="text-2xl font-black text-cyan-400 font-mono">98.4%</div>
          <span className="text-[11px] text-slate-400">Statutory MRP Adherence</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            Immutable System Security & Access Audit Log
          </h3>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="glass-input text-xs bg-slate-900"
            >
              <option value="ALL">All Event Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="BLOCKED_IDOR">Blocked IDOR Attacks</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400 font-mono">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor (Role)</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Target Resource</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/60 transition">
                  <td className="py-3 px-3 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-white font-sans">{log.userName}</div>
                    <div className="text-[10px] text-slate-400">{log.userRole}</div>
                  </td>
                  <td className="py-3 px-3 font-bold text-cyan-300">{log.action}</td>
                  <td className="py-3 px-3 text-slate-300">{log.resourceType}: {log.resourceId}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-sans max-w-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
