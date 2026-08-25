"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { Organization, TaxRule, SystemAuditLog, User, UserRole, FraudAlert, TaxReturnSummary, BatchItem, ProductPassport, Invoice, CustomsDeclaration } from "@/lib/db/types";
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
  Settings,
  UserPlus,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Key,
  Bell,
  Zap,
  Globe,
  Layers,
  CreditCard,
  Warehouse,
  Factory,
  Ship,
  Store,
  BadgePercent,
  ClipboardList,
  History,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-[#1b4332] text-white",
  TAX_OFFICER: "bg-[#fbf3e8] text-[#8a5b14] border border-[#eeddc2]",
  MANUFACTURER: "bg-[#eaf0ec] text-[#2d5a45] border border-[#c1d3c8]",
  IMPORTER: "bg-[#eef2f6] text-[#2b4c6f] border border-[#d0dbe7]",
  BUSINESS_EMPLOYEE: "bg-[#f6f5f2] text-[#55524c] border border-[#e2ded6]",
  AUDITOR: "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]",
  CONSUMER: "bg-[#f0f4f1] text-[#2d5a45] border border-[#d2ded5]",
};

const ORG_TYPE_BADGE_COLORS: Record<string, string> = {
  GOVERNMENT: "bg-[#1b4332] text-white",
  TAX_AUTHORITY: "bg-[#fbf3e8] text-[#8a5b14] border border-[#eeddc2]",
  MANUFACTURER: "bg-[#eaf0ec] text-[#2d5a45] border border-[#c1d3c8]",
  IMPORTER: "bg-[#eef2f6] text-[#2b4c6f] border border-[#d0dbe7]",
  RETAILER_DISTRIBUTOR: "bg-[#f2efe9] text-[#4a4036] border border-[#ded8cc]",
  AUDIT_FIRM: "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]",
  CONSUMER: "bg-[#f0f4f1] text-[#2d5a45] border border-[#d2ded5]",
};

export default function AdminPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [systemUsers, setSystemUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [taxReturns, setTaxReturns] = useState<TaxReturnSummary[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [passports, setPassports] = useState<ProductPassport[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customs, setCustoms] = useState<CustomsDeclaration[]>([]);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "tax-policy"
    | "tenants"
    | "users"
    | "audit-logs"
    | "fraud-oversight"
    | "tax-reconciliation"
    | "system-data"
    | "settings"
  >("overview");

  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [orgForm, setOrgForm] = useState<Partial<Organization>>({});
  const [userForm, setUserForm] = useState<Partial<User>>({});
  const [policyMessage, setPolicyMessage] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);

  const isAuthorized = role === "SUPER_ADMIN";

  // Tax policy edit state
  const [selectedHsCode, setSelectedHsCode] = useState("1509.10");
  const [vatRate, setVatRate] = useState("0.13");
  const [exciseRate, setExciseRate] = useState("0.02");
  const [marginCap, setMarginCap] = useState("0.25");
  const [priceCap, setPriceCap] = useState("1500");

  useEffect(() => {
    fetchAllData();
  }, [role]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [
        resTax,
        resOrgs,
        resUsers,
        resAudit,
        resFraud,
        resReturns,
        resBatches,
        resPassports,
        resInvoices,
        resCustoms,
      ] = await Promise.all([
        fetch("/api/tax"),
        fetch("/api/organizations"),
        fetch("/api/users"),
        fetch("/api/audit-logs"),
        fetch("/api/fraud"),
        fetch("/api/tax-returns"),
        fetch("/api/batches"),
        fetch("/api/passports"),
        fetch("/api/invoices"),
        fetch("/api/customs"),
      ]);

      const [
        dataTax,
        dataOrgs,
        dataUsers,
        dataAudit,
        dataFraud,
        dataReturns,
        dataBatches,
        dataPassports,
        dataInvoices,
        dataCustoms,
      ] = await Promise.all([
        resTax.json(),
        resOrgs.json(),
        resUsers.json(),
        resAudit.json(),
        resFraud.json(),
        resReturns.json(),
        resBatches.json(),
        resPassports.json(),
        resInvoices.json(),
        resCustoms.json(),
      ]);

      if (dataTax.success) setTaxRules(dataTax.taxRules || []);
      if (dataOrgs.success) setOrganizations(dataOrgs.organizations || []);
      if (dataUsers.success) setSystemUsers(dataUsers.users || []);
      if (dataAudit.success) setAuditLogs(dataAudit.logs || []);
      if (dataFraud.success) setFraudAlerts(dataFraud.alerts || []);
      if (dataReturns.success) setTaxReturns(dataReturns.returns || []);
      if (dataBatches.success) setBatches(dataBatches.batches || []);
      if (dataPassports.success) setPassports(dataPassports.passports || []);
      if (dataInvoices.success) setInvoices(dataInvoices.invoices || []);
      if (dataCustoms.success) setCustoms(dataCustoms.customs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
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
        fetchAllData();
      } else {
        setPolicyMessage(`Error: ${data.message || data.error}`);
      }
    } catch {
      setPolicyMessage("Failed to update tax policy.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: selectedOrg ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...orgForm, id: selectedOrg?.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAllData();
        setShowOrgModal(false);
        setSelectedOrg(null);
        setOrgForm({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: selectedUser ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...userForm, id: selectedUser?.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAllData();
        setShowUserModal(false);
        setSelectedUser(null);
        setUserForm({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm("Delete this organization? This action cannot be undone.")) return;
    try {
      await fetch("/api/organizations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orgId }),
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    try {
      await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
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
        fetchAllData();
        setSelectedAlert(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openOrgModal = (org?: Organization) => {
    if (org) {
      setSelectedOrg(org);
      setOrgForm({
        name: org.name,
        type: org.type,
        taxPin: org.taxPin,
        licenseNumber: org.licenseNumber,
        jurisdiction: org.jurisdiction,
        address: org.address,
        contactEmail: org.contactEmail,
        verified: org.verified,
      });
    } else {
      setSelectedOrg(null);
      setOrgForm({
        type: "MANUFACTURER",
        verified: false,
      });
    }
    setShowOrgModal(true);
  };

  const openUserModal = (usr?: User) => {
    if (usr) {
      setSelectedUser(usr);
      setUserForm({
        email: usr.email,
        name: usr.name,
        role: usr.role,
        orgId: usr.orgId,
        phone: usr.phone,
        designation: usr.designation,
        employeeCode: usr.employeeCode,
        status: usr.status,
      });
    } else {
      setSelectedUser(null);
      setUserForm({
        role: "MANUFACTURER",
        status: "ACTIVE",
      });
    }
    setShowUserModal(true);
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded gov-card text-center space-y-4 border border-[#e5e2da]">
        <div className="w-10 h-10 rounded bg-[#fbeeed] text-[#8c322c] mx-auto flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-[#181c1a]">403 Forbidden: Authorized Directorate Access Only</h2>
        <p className="text-xs text-[#4c5850]">
          The <strong>Super Admin Directorate</strong> is restricted to <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#181c1a]">SUPER_ADMIN</code> (the Government Authority). Your current persona is <strong>{role}</strong>.
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

  const stats = {
    totalOrgs: organizations.length,
    verifiedOrgs: organizations.filter(o => o.verified).length,
    totalUsers: systemUsers.length,
    activeUsers: systemUsers.filter(u => u.status === "ACTIVE").length,
    totalBatches: batches.length,
    totalPassports: passports.length,
    totalInvoices: invoices.length,
    totalCustoms: customs.length,
    totalFraudAlerts: fraudAlerts.length,
    openFraudAlerts: fraudAlerts.filter(a => a.status === "OPEN").length,
    criticalFraudAlerts: fraudAlerts.filter(a => a.severity === "CRITICAL").length,
    totalTaxRevenue: taxReturns.reduce((sum, r) => sum + r.netVatPayable + r.totalExcisePayable, 0),
    matchedReturns: taxReturns.filter(r => r.reconciliationStatus === "MATCHED").length,
    totalAuditLogs: auditLogs.length,
    blockedIdor: auditLogs.filter(l => l.status === "BLOCKED_IDOR").length,
    blockedUnauthorized: auditLogs.filter(l => l.status === "BLOCKED_UNAUTHORIZED").length,
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3, color: "bg-[#1b4332]" },
    { id: "tax-policy", label: "Tax Policies & MRP", icon: Scale, color: "bg-[#2d5a45]" },
    { id: "tenants", label: "Tenant Registry", icon: Building2, color: "bg-[#2b4c6f]" },
    { id: "users", label: "User Management", icon: Users, color: "bg-[#4a4036]" },
    { id: "fraud-oversight", label: "Fraud Oversight", icon: AlertTriangle, color: "bg-[#8c322c]" },
    { id: "tax-reconciliation", label: "Tax Reconciliation", icon: ClipboardList, color: "bg-[#8a5b14]" },
    { id: "audit-logs", label: "Audit Trail", icon: History, color: "bg-[#4c5850]" },
    { id: "system-data", label: "System Data", icon: Database, color: "bg-[#65736a]" },
    { id: "settings", label: "System Settings", icon: Settings, color: "bg-[#333d37]" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e5e2da]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#181c1a]">Super Admin Directorate</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1b4332] text-white">
              SUPER_ADMIN
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            National Fiscal Authority &bull; Platform Administration &bull; System Governance
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-[#ffffff] p-1 rounded border border-[#e5e2da] text-xs font-medium">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? `${tab.color} text-white font-semibold`
                  : "text-[#4c5850] hover:text-[#181c1a]"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="p-4 rounded gov-card space-y-1 border-l-4 border-[#1b4332]">
              <span className="text-xs text-[#65736a]">Total Organizations</span>
              <div className="text-xl font-bold text-[#1b4332] font-mono">{stats.totalOrgs}</div>
              <span className="text-[11px] text-[#1b4332] font-medium">{stats.verifiedOrgs} Verified</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1 border-l-4 border-[#2b4c6f]">
              <span className="text-xs text-[#65736a]">Total Users</span>
              <div className="text-xl font-bold text-[#2b4c6f] font-mono">{stats.totalUsers}</div>
              <span className="text-[11px] text-[#65736a]">{stats.activeUsers} Active</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1 border-l-4 border-[#8c322c]">
              <span className="text-xs text-[#65736a]">Active Fraud Alerts</span>
              <div className="text-xl font-bold text-[#8c322c] font-mono">{stats.openFraudAlerts}</div>
              <span className="text-[11px] text-[#8c322c] font-medium">{stats.criticalFraudAlerts} Critical</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1 border-l-4 border-[#1b4332]">
              <span className="text-xs text-[#65736a]">Tax Revenue (Period)</span>
              <div className="text-xl font-bold text-[#1b4332] font-mono">${stats.totalTaxRevenue.toLocaleString()}</div>
              <span className="text-[11px] text-[#65736a]">{stats.matchedReturns} Returns Matched</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1 border-l-4 border-[#4a4036]">
              <span className="text-xs text-[#65736a]">Audit Events (24h)</span>
              <div className="text-xl font-bold text-[#4a4036] font-mono">{stats.totalAuditLogs}</div>
              <span className="text-[11px] text-[#65736a]">{stats.blockedIdor} IDOR Blocked</span>
            </div>
            <div className="p-4 rounded gov-card space-y-1 border-l-4 border-[#4c5850]">
              <span className="text-xs text-[#65736a]">System Records</span>
              <div className="text-xl font-bold text-[#4c5850] font-mono">{stats.totalBatches + stats.totalPassports + stats.totalInvoices + stats.totalCustoms}</div>
              <span className="text-[11px] text-[#65736a]">Batches, DPPs, Invoices, Customs</span>
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
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#181c1a]">Unauthorized Access Blocked:</strong> {stats.blockedUnauthorized} attempts rejected by RBAC engine.
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

            <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da]">
              <h4 className="text-xs font-bold text-[#333d37] mb-2">Customs & Luxury Tax Rates (Auto-derived from HS Code)</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {taxRules.find(r => r.hsCode === selectedHsCode) && (
                  <>
                    <div>
                      <span className="text-[#65736a] block">Customs Duty</span>
                      <span className="font-mono font-bold text-[#2b4c6f]">
                        {(taxRules.find(r => r.hsCode === selectedHsCode)?.customsDutyRate || 0) * 100}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[#65736a] block">Luxury Tax</span>
                      <span className="font-mono font-bold text-[#8a5b14]">
                        {(taxRules.find(r => r.hsCode === selectedHsCode)?.luxuryTaxRate || 0) * 100}%
                      </span>
                    </div>
                  </>
                )}
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#181c1a]">Accredited Organization Directory</h3>
              <p className="text-xs text-[#65736a]">
                Commercial tenants verified and partitioned on the National Ledger.
              </p>
            </div>
            <button
              onClick={() => openOrgModal()}
              className="px-3 py-1.5 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Organization
            </button>
          </div>

          <div className="p-5 rounded gov-card space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5e2da]">
                <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
                  <tr>
                    <th className="py-2 px-3">Organization</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Tax PIN / PAN</th>
                    <th className="py-2 px-3">License No</th>
                    <th className="py-2 px-3">Jurisdiction</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2da] text-[#333d37]">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-[#f8f7f4]">
                      <td className="py-2.5 px-3 font-semibold text-[#181c1a]">{org.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${ORG_TYPE_BADGE_COLORS[org.type] || "bg-[#f3f1ec] text-[#333d37] border border-[#e5e2da]"}`}>
                          {org.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{org.taxPin}</td>
                      <td className="py-2.5 px-3 font-mono">{org.licenseNumber}</td>
                      <td className="py-2.5 px-3 text-[11px] text-[#65736a]">{org.jurisdiction}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${org.verified ? "bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]" : "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]"}`}>
                          {org.verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openOrgModal(org)}
                            className="p-1.5 rounded hover:bg-[#eef2f6] text-[#2b4c6f] transition"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrg(org.id)}
                            className="p-1.5 rounded hover:bg-[#fbeeed] text-[#8c322c] transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Tab: Users */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#181c1a]">System User Management</h3>
              <p className="text-xs text-[#65736a]">
                All registered users across the National Ledger. Manage roles, organizations, and access.
              </p>
            </div>
            <button
              onClick={() => openUserModal()}
              className="px-3 py-1.5 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create User
            </button>
          </div>

          <div className="p-5 rounded gov-card space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5e2da]">
                <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
                  <tr>
                    <th className="py-2 px-3">User</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3">Organization</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Designation</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2da] text-[#333d37]">
                  {systemUsers.map((usr) => (
                    <tr key={usr.id} className="hover:bg-[#f8f7f4]">
                      <td className="py-2.5 px-3 font-semibold text-[#181c1a]">{usr.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${ROLE_BADGE_COLORS[usr.role]}`}>
                          {usr.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#65736a]">{usr.organizationName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{usr.email}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${usr.status === "ACTIVE" ? "bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]" : usr.status === "SUSPENDED" ? "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]" : "bg-[#fbf3e8] text-[#8a5b14] border border-[#eeddc2]"}`}>
                          {usr.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#65736a]">{usr.designation || "-"}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openUserModal(usr)}
                            className="p-1.5 rounded hover:bg-[#eef2f6] text-[#2b4c6f] transition"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(usr.id)}
                            className="p-1.5 rounded hover:bg-[#fbeeed] text-[#8c322c] transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Tab: Fraud Oversight */}
      {activeTab === "fraud-oversight" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#181c1a]">Fraud & Risk Oversight</h3>
              <p className="text-xs text-[#65736a]">
                Super Admin view of all fraud alerts across the National Ledger with full resolution authority.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-[#fbeeed] text-[#8c322c] text-xs font-mono border border-[#f2cfcd]">
                {stats.totalFraudAlerts} Total Alerts
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
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${ROLE_BADGE_COLORS[log.userRole] || "bg-[#f3f1ec] text-[#333d37] border border-[#e5e2da]"}`}>
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

      {/* Tab: System Data */}
      {activeTab === "system-data" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#181c1a]">System Data Explorer</h3>
              <p className="text-xs text-[#65736a]">
                Browse all system records: batches, passports, invoices, customs declarations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 rounded gov-card space-y-3">
              <h4 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
                <Factory className="w-4 h-4 text-[#2d5a45]" />
                Production Batches ({batches.length})
              </h4>
              <div className="divide-y divide-[#e5e2da] text-xs max-h-96 overflow-y-auto">
                {batches.map((batch) => (
                  <div key={batch.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#181c1a]">{batch.productName}</div>
                      <div className="text-[11px] text-[#65736a] font-mono">Batch: {batch.batchNumber} • HS: {batch.hsCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[#1b4332]">{batch.quantity} {batch.unit}</div>
                      <div className="text-[11px] text-[#65736a]">MRP: ${batch.statutoryMrp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded gov-card space-y-3">
              <h4 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
                <BadgePercent className="w-4 h-4 text-[#2b4c6f]" />
                Digital Product Passports ({passports.length})
              </h4>
              <div className="divide-y divide-[#e5e2da] text-xs max-h-96 overflow-y-auto">
                {passports.map((pp) => (
                  <div key={pp.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#181c1a]">{pp.productName}</div>
                      <div className="text-[11px] text-[#65736a] font-mono">{pp.serialNumber}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-[11px] ${pp.isAuthentic ? "text-[#1b4332]" : "text-[#8c322c]"}`}>
                        {pp.isAuthentic ? "✓ Authentic" : "✗ Counterfeit"}
                      </div>
                      <div className="text-[10px] text-[#65736a]">Scans: {pp.scanCount}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded gov-card space-y-3">
              <h4 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#8a5b14]" />
                Fiscal Invoices ({invoices.length})
              </h4>
              <div className="divide-y divide-[#e5e2da] text-xs max-h-96 overflow-y-auto">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#181c1a]">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-[#65736a] font-mono">{inv.sellerName} → {inv.buyerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[#1b4332]">${inv.grandTotal.toLocaleString()}</div>
                      <div className="text-[11px] text-[#65736a]">{inv.fiscalStatus}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded gov-card space-y-3">
              <h4 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
                <Ship className="w-4 h-4 text-[#4a4036]" />
                Customs Declarations ({customs.length})
              </h4>
              <div className="divide-y divide-[#e5e2da] text-xs max-h-96 overflow-y-auto">
                {customs.map((cust) => (
                  <div key={cust.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#181c1a]">{cust.productSummary}</div>
                      <div className="text-[11px] text-[#65736a] font-mono">BOE: {cust.billOfEntryNo}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[#2b4c6f]">${cust.totalCustomsDutyPaid.toLocaleString()}</div>
                      <div className="text-[11px] text-[#65736a]">{cust.clearanceStatus.replace("_", " ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="p-5 rounded gov-card space-y-4">
            <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#333d37]" />
              System Configuration
            </h3>
            <p className="text-xs text-[#65736a]">Global system parameters and feature flags.</p>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#181c1a]">Standard VAT Rate</div>
                  <div className="text-[11px] text-[#65736a]">13% applied to all taxable supplies</div>
                </div>
                <span className="font-mono text-[#1b4332] font-bold">0.13</span>
              </div>

              <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#181c1a]">Maximum Profit Margin Cap (Default)</div>
                  <div className="text-[11px] text-[#65736a]">Default ceiling for retailer markup</div>
                </div>
                <span className="font-mono text-[#1b4332] font-bold">25%</span>
              </div>

              <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#181c1a]">Anti-IDOR Enforcement</div>
                  <div className="text-[11px] text-[#65736a]">Strict tenant boundary checks on all API routes</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] text-[10px] font-bold">ENABLED</span>
              </div>

              <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#181c1a]">Statutory MRP Validation</div>
                  <div className="text-[11px] text-[#65736a]">Server-side price ceiling enforcement at POS</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] text-[10px] font-bold">ENABLED</span>
              </div>

              <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#181c1a]">Cryptographic DPP Registry</div>
                  <div className="text-[11px] text-[#65736a]">ECDSA-SHA256 signed product passports</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] text-[10px] font-bold">ENABLED</span>
              </div>

              <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#181c1a]">Automated Fraud Detection</div>
                  <div className="text-[11px] text-[#65736a]">AI-powered anomaly scanning for duplicate scans & price gouging</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] text-[10px] font-bold">ENABLED</span>
              </div>

              <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#181c1a]">ITC Auto-Reconciliation</div>
                  <div className="text-[11px] text-[#65736a]">Input Tax Credit matching across supply chain</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] text-[10px] font-bold">ENABLED</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded gov-card space-y-4">
            <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#333d37]" />
              System Actions
            </h3>
            <p className="text-xs text-[#65736a]">Administrative operations for system maintenance.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button className="p-4 rounded bg-[#f8f7f4] border border-[#e5e2da] hover:border-[#1b4332] hover:bg-[#eaf0ec] transition text-left">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4 text-[#1b4332]" />
                  <span className="font-semibold text-[#181c1a]">Refresh All Data</span>
                </div>
                <p className="text-[11px] text-[#65736a]">Reload all system data from source</p>
              </button>
              <button className="p-4 rounded bg-[#f8f7f4] border border-[#e5e2da] hover:border-[#2b4c6f] hover:bg-[#eef2f6] transition text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Download className="w-4 h-4 text-[#2b4c6f]" />
                  <span className="font-semibold text-[#181c1a]">Export Audit Logs</span>
                </div>
                <p className="text-[11px] text-[#65736a]">Download complete audit trail</p>
              </button>
              <button className="p-4 rounded bg-[#f8f7f4] border border-[#e5e2da] hover:border-[#8a5b14] hover:bg-[#fbf3e8] transition text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4 text-[#8a5b14]" />
                  <span className="font-semibold text-[#181c1a]">Import Tax Rules</span>
                </div>
                <p className="text-[11px] text-[#65736a]">Bulk update HS code tax policies</p>
              </button>
              <button className="p-4 rounded bg-[#f8f7f4] border border-[#e5e2da] hover:border-[#8c322c] hover:bg-[#fbeeed] transition text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="w-4 h-4 text-[#8c322c]" />
                  <span className="font-semibold text-[#181c1a]">Broadcast Alert</span>
                </div>
                <p className="text-[11px] text-[#65736a]">Send system-wide notification</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#d2cebf] rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[#e5e2da] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#163828]">{selectedOrg ? "Edit Organization" : "Register New Organization"}</h3>
              <button
                onClick={() => { setShowOrgModal(false); setSelectedOrg(null); setOrgForm({}); }}
                className="p-1 text-[#65736a] hover:text-[#181c1a] rounded hover:bg-[#f3f1ec]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOrgSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Organization Name *</label>
                <input
                  type="text"
                  value={orgForm.name || ""}
                  onChange={(e) => setOrgForm({...orgForm, name: e.target.value})}
                  className="gov-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Type *</label>
                <select
                  value={orgForm.type || "MANUFACTURER"}
                  onChange={(e) => setOrgForm({...orgForm, type: e.target.value as any})}
                  className="gov-input w-full"
                  required
                >
                  <option value="MANUFACTURER">Manufacturer</option>
                  <option value="IMPORTER">Importer</option>
                  <option value="RETAILER_DISTRIBUTOR">Retailer/Distributor</option>
                  <option value="AUDIT_FIRM">Audit Firm</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="TAX_AUTHORITY">Tax Authority</option>
                </select>
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Tax PIN / PAN *</label>
                <input
                  type="text"
                  value={orgForm.taxPin || ""}
                  onChange={(e) => setOrgForm({...orgForm, taxPin: e.target.value})}
                  className="gov-input w-full font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">License Number *</label>
                <input
                  type="text"
                  value={orgForm.licenseNumber || ""}
                  onChange={(e) => setOrgForm({...orgForm, licenseNumber: e.target.value})}
                  className="gov-input w-full font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Jurisdiction</label>
                <input
                  type="text"
                  value={orgForm.jurisdiction || ""}
                  onChange={(e) => setOrgForm({...orgForm, jurisdiction: e.target.value})}
                  className="gov-input w-full"
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={orgForm.address || ""}
                  onChange={(e) => setOrgForm({...orgForm, address: e.target.value})}
                  className="gov-input w-full"
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Contact Email</label>
                <input
                  type="email"
                  value={orgForm.contactEmail || ""}
                  onChange={(e) => setOrgForm({...orgForm, contactEmail: e.target.value})}
                  className="gov-input w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={orgForm.verified || false}
                  onChange={(e) => setOrgForm({...orgForm, verified: e.target.checked})}
                  className="w-4 h-4 rounded border-[#e5e2da] text-[#1b4332] focus:ring-[#1b4332]"
                />
                <label htmlFor="verified" className="text-xs text-[#333d37]">Verified / Accredited</label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition"
                >
                  {selectedOrg ? "Update Organization" : "Register Organization"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowOrgModal(false); setSelectedOrg(null); setOrgForm({}); }}
                  className="flex-1 py-2 rounded bg-[#f3f1ec] hover:bg-[#eae7df] text-[#333d37] font-semibold text-xs border border-[#e5e2da] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#d2cebf] rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[#e5e2da] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#163828]">{selectedUser ? "Edit User" : "Create New User"}</h3>
              <button
                onClick={() => { setShowUserModal(false); setSelectedUser(null); setUserForm({}); }}
                className="p-1 text-[#65736a] hover:text-[#181c1a] rounded hover:bg-[#f3f1ec]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={userForm.email || ""}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  className="gov-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  value={userForm.name || ""}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  className="gov-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Role *</label>
                <select
                  value={userForm.role || "MANUFACTURER"}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value as UserRole})}
                  className="gov-input w-full"
                  required
                >
                  <option value="SUPER_ADMIN">Super Admin (Government)</option>
                  <option value="TAX_OFFICER">Tax Officer</option>
                  <option value="MANUFACTURER">Manufacturer</option>
                  <option value="IMPORTER">Importer</option>
                  <option value="BUSINESS_EMPLOYEE">Business Employee</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="CONSUMER">Consumer</option>
                </select>
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Organization *</label>
                <select
                  value={userForm.orgId || ""}
                  onChange={(e) => setUserForm({...userForm, orgId: e.target.value})}
                  className="gov-input w-full"
                  required
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name} ({org.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={userForm.phone || ""}
                  onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                  className="gov-input w-full"
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Designation</label>
                <input
                  type="text"
                  value={userForm.designation || ""}
                  onChange={(e) => setUserForm({...userForm, designation: e.target.value})}
                  className="gov-input w-full"
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Employee Code</label>
                <input
                  type="text"
                  value={userForm.employeeCode || ""}
                  onChange={(e) => setUserForm({...userForm, employeeCode: e.target.value})}
                  className="gov-input w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Status</label>
                <select
                  value={userForm.status || "ACTIVE"}
                  onChange={(e) => setUserForm({...userForm, status: e.target.value as any})}
                  className="gov-input w-full"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition"
                >
                  {selectedUser ? "Update User" : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowUserModal(false); setSelectedUser(null); setUserForm({}); }}
                  className="flex-1 py-2 rounded bg-[#f3f1ec] hover:bg-[#eae7df] text-[#333d37] font-semibold text-xs border border-[#e5e2da] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
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