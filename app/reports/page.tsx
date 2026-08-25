"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { SystemAuditLog } from "@/lib/db/types";
import {
  BarChart3,
  ShieldCheck,
  Lock,
} from "lucide-react";

export default function ReportsPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const isAuthorized =
    role === "AUDITOR" ||
    role === "TAX_OFFICER" ||
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
      userId: "usr_biz_emp_01",
      userName: "Rohan Joshi",
      userRole: "BUSINESS_EMPLOYEE",
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
      userRole: "SUPER_ADMIN",
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
      <div className="max-w-2xl mx-auto my-12 p-8 rounded gov-card text-center space-y-4 border border-[#e5e2da]">
        <div className="w-10 h-10 rounded bg-[#fbeeed] text-[#8c322c] mx-auto flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-[#181c1a]">403 Forbidden: Forensic Auditor Access Required</h2>
        <p className="text-xs text-[#4c5850]">
          The <strong>Reports & Forensic Audit Portal</strong> requires <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#8c322c]">AUDITOR</code>, <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#8a5b14]">TAX_OFFICER</code>, or <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#1b4332]">ADMIN</code>.
        </p>
        <button
          onClick={() => loginAsRole("AUDITOR")}
          className="px-4 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e5e2da]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#181c1a]">Reports & Forensic Audit Ledger</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]">
              AUDIT TRAIL
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            Cross-Tier Revenue Reconciliation &bull; Tax Gap Analysis &bull; Zero-Trust Access Logs
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Reconciled Tax Ledgers</span>
          <div className="text-xl font-bold text-[#181c1a] font-mono">$184.7M</div>
          <span className="text-[11px] text-[#1b4332] font-medium">100% Tax Trail Verifiable</span>
        </div>
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Security & IDOR Interceptions</span>
          <div className="text-xl font-bold text-[#1b4332] font-mono">100% Guarded</div>
          <span className="text-[11px] text-[#65736a]">Zero Cross-Tenant Leakage</span>
        </div>
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Statutory MRP Compliance</span>
          <div className="text-xl font-bold text-[#2d5a45] font-mono">98.4%</div>
          <span className="text-[11px] text-[#65736a]">Adherence Benchmark</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="p-5 rounded gov-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#1b4332]" />
            System Security & Access Audit Log
          </h3>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="gov-input text-xs"
          >
            <option value="ALL">All Event Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="BLOCKED_IDOR">Blocked IDOR Attacks</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-[#e5e2da]">
            <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Actor (Role)</th>
                <th className="py-2 px-3">Action Type</th>
                <th className="py-2 px-3">Target Resource</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e2da] text-[#333d37] font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#f8f7f4] transition">
                  <td className="py-2.5 px-3 text-[#65736a]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-bold text-[#181c1a]">{log.userName}</div>
                    <div className="text-[10px] text-[#65736a]">{log.userRole}</div>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#1b4332]">{log.action}</td>
                  <td className="py-2.5 px-3 text-[#4c5850]">{log.resourceType}: {log.resourceId}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        log.status === "SUCCESS"
                          ? "bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]"
                          : "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#65736a] font-sans max-w-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
