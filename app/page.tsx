"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { ROLE_DETAILS } from "@/lib/auth/mock-users";
import {
  ShieldCheck,
  Building2,
  Factory,
  Ship,
  Store,
  Scale,
  QrCode,
  FileText,
  AlertTriangle,
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Lock,
  Zap,
  Globe,
  Layers,
  Cpu,
} from "lucide-react";

export default function HomePage() {
  const { user, role, loginAsRole } = useAuth();
  const [quickSerial, setQuickSerial] = useState("APX-OIL-901-000184");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const sampleSerials = [
    { label: "Olive Oil (Genuine)", serial: "APX-OIL-901-000184", status: "VALID" },
    { label: "5G Phone (Imported & Sold)", serial: "PAC-PHN-801-000492", status: "VALID" },
    { label: "Pharma Clone (Counterfeit)", serial: "APX-MED-442-999999", status: "INVALID" },
  ];

  const handleQuickVerify = async (serialToTest?: string) => {
    const s = serialToTest || quickSerial;
    if (!s) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(s.trim())}`);
      const data = await res.json();
      setVerifyResult(data);
    } catch {
      setVerifyResult({
        isAuthentic: false,
        message: "Failed to verify serial code.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const portals = [
    {
      title: "Admin & Government Portal",
      description: "National oversight, tax policies, tenant organization validation, and system audit logs.",
      href: "/admin",
      icon: Building2,
      roles: ["SUPER_ADMIN", "GOVERNMENT_ADMIN"],
      accent: "from-purple-500/20 to-blue-500/20 border-purple-500/30 text-purple-400",
    },
    {
      title: "Manufacturer Portal",
      description: "Batch creation, factory tax declaration, statutory MRP setting, and cryptographic DPP minting.",
      href: "/manufacturer",
      icon: Factory,
      roles: ["MANUFACTURER", "SUPER_ADMIN"],
      accent: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400",
    },
    {
      title: "Importer Portal",
      description: "Customs declaration, Bill of Entry filings, automated import duty & VAT calculation.",
      href: "/importer",
      icon: Ship,
      roles: ["IMPORTER", "SUPER_ADMIN"],
      accent: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400",
    },
    {
      title: "Business & Retail POS Portal",
      description: "Inventory stock management, Inbound QR receiver, POS checkout, and MRP price-gouging enforcement.",
      href: "/business",
      icon: Store,
      roles: ["BUSINESS_OWNER", "BUSINESS_EMPLOYEE", "SUPER_ADMIN"],
      accent: "from-indigo-500/20 to-sky-500/20 border-indigo-500/30 text-indigo-400",
    },
    {
      title: "Tax & Price Engine",
      description: "Multi-tier VAT (13%), Excise, Customs Duty, Input Tax Credit (ITC) reconciliation & MRP ceilings.",
      href: "/tax-engine",
      icon: Scale,
      roles: ["TAX_OFFICER", "GOVERNMENT_ADMIN", "SUPER_ADMIN"],
      accent: "from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-400",
    },
    {
      title: "QR Product Passport (DPP)",
      description: "Cryptographic product identities, dynamic QR codes, and immutable supply chain journey timelines.",
      href: "/passport",
      icon: QrCode,
      roles: ["ALL"],
      accent: "from-teal-500/20 to-emerald-500/20 border-teal-500/30 text-teal-400",
    },
    {
      title: "Fiscal E-Invoice System",
      description: "Cryptographically verified IRN invoices with anti-IDOR server security and tax itemization.",
      href: "/invoices",
      icon: FileText,
      roles: ["ALL"],
      accent: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400",
    },
    {
      title: "Fraud & Risk Detection Desk",
      description: "AI anomaly detection for duplicate QR scans, price gouging spikes, and carousel VAT evasion.",
      href: "/fraud-desk",
      icon: AlertTriangle,
      roles: ["TAX_OFFICER", "GOVERNMENT_ADMIN", "AUDITOR", "SUPER_ADMIN"],
      accent: "from-rose-500/20 to-amber-500/20 border-rose-500/30 text-rose-400",
    },
    {
      title: "Reports & Audit Ledger",
      description: "Tax collections gap analysis, revenue reconciliation ledgers, and forensic audit logs.",
      href: "/reports",
      icon: BarChart3,
      roles: ["AUDITOR", "TAX_OFFICER", "GOVERNMENT_ADMIN", "SUPER_ADMIN"],
      accent: "from-violet-500/20 to-pink-500/20 border-violet-500/30 text-violet-400",
    },
    {
      title: "Consumer Verification Portal",
      description: "Public instant product authenticity validation, provenance inspection, and whistleblower reporting.",
      href: "/verify",
      icon: Search,
      roles: ["ALL"],
      accent: "from-sky-500/20 to-cyan-500/20 border-sky-500/30 text-sky-400",
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl glass-panel-glow border border-blue-500/20 p-8 sm:p-12 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-900">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Next-Gen National Fiscal & Provenance Infrastructure
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Cryptographic Supply Chain &{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Fiscal Compliance Engine
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Eliminate counterfeit circulation, enforce statutory Maximum Retail Prices (MRP), automate 13% cascading VAT reconciliation, and secure multi-tier trade with <strong>strict server-side authorization</strong> across 9 specialized user roles.
          </p>

          {/* Quick Stat Pill Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
              <span className="text-xs text-slate-400 font-medium block">Tracked Revenue</span>
              <span className="text-xl font-extrabold text-white font-mono">$1.42 Billion</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
              <span className="text-xs text-slate-400 font-medium block">DPP Passports Minted</span>
              <span className="text-xl font-extrabold text-cyan-400 font-mono">1,280,450</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
              <span className="text-xs text-slate-400 font-medium block">Standard Tax Rate</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">13% VAT</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
              <span className="text-xs text-slate-400 font-medium block">Fraud Anomaly Defense</span>
              <span className="text-xl font-extrabold text-rose-400 font-mono">4,892 Blocked</span>
            </div>
          </div>
        </div>

        {/* Live Interactive DPP Quick-Scanner Card */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <div className="bg-slate-900/90 rounded-2xl p-5 border border-white/10 max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-bold text-white">Live DPP Serial Authenticity Quick-Verifier</span>
              </div>
              <span className="text-[11px] text-slate-400">Zero Login Required (Consumer Mode)</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={quickSerial}
                onChange={(e) => setQuickSerial(e.target.value)}
                placeholder="Enter Product Serial (e.g. APX-OIL-901-000184)"
                className="glass-input flex-1 font-mono text-xs sm:text-sm"
              />
              <button
                onClick={() => handleQuickVerify()}
                disabled={isVerifying}
                className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                {isVerifying ? "Verifying..." : "Verify Serial"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Sample Serial Quick Clickers */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400">Quick Test Samples:</span>
              {sampleSerials.map((s) => (
                <button
                  key={s.serial}
                  onClick={() => {
                    setQuickSerial(s.serial);
                    handleQuickVerify(s.serial);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition ${
                    s.status === "VALID"
                      ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Quick Verification Output */}
            {verifyResult && (
              <div
                className={`mt-4 p-4 rounded-xl border animate-in fade-in duration-300 ${
                  verifyResult.isAuthentic
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {verifyResult.isAuthentic ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-sm">
                      {verifyResult.isAuthentic ? "VERIFIED GENUINE PRODUCT" : "COUNTERFEIT / ANOMALY DETECTED"}
                    </div>
                    <p>{verifyResult.message}</p>
                    {verifyResult.passport && (
                      <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                        <div>Product: <strong className="text-white">{verifyResult.passport.productName}</strong></div>
                        <div>Batch: <strong className="text-white">{verifyResult.passport.batchNumber}</strong></div>
                        <div>Statutory MRP: <strong className="text-emerald-300">${verifyResult.passport.statutoryMrp}</strong></div>
                        <div>Holder: <strong className="text-white">{verifyResult.passport.currentHolderName}</strong></div>
                      </div>
                    )}
                    <div className="pt-2">
                      <Link
                        href={`/verify/${encodeURIComponent(quickSerial)}`}
                        className="text-cyan-400 hover:underline font-medium inline-flex items-center gap-1 text-xs"
                      >
                        Inspect Full Cryptographic Journey &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 10 Module Portals Launchpad */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">System Portals & Workspaces</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Each portal implements server-side role and tenant authorization safeguards.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Active Role: <span className="text-white font-bold">{role}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portals.map((portal) => {
            const hasRole =
              portal.roles.includes("ALL") ||
              (user && (portal.roles.includes(user.role) || user.role === "SUPER_ADMIN"));

            return (
              <div
                key={portal.title}
                className="group relative p-5 rounded-2xl glass-panel border border-white/10 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${portal.accent}`}>
                      <portal.icon className="w-5 h-5" />
                    </div>
                    {hasRole ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Authorized
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Role Restricted
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mb-1.5">
                    {portal.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {portal.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="text-[10px] font-mono text-slate-500">
                    Roles: {portal.roles.join(", ").replace("SUPER_ADMIN", "ADMIN")}
                  </div>
                  <Link
                    href={portal.href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform"
                  >
                    Open Portal &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security & Authorization Architecture Highlights */}
      <section className="p-6 sm:p-8 rounded-2xl glass-panel border border-white/10 space-y-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">
            Zero-Trust Server Security
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Server-Enforced Authorization & Anti-IDOR Protections
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            The platform never relies on hiding frontend buttons as security. All operations are strictly guarded at the server level.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Anti-IDOR Isolation</h3>
            <p className="text-xs text-slate-400">
              Users cannot access invoices, batches, or inventory belonging to another tenant simply by changing an ID in the URL.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Real-Time MRP & VAT</h3>
            <p className="text-xs text-slate-400">
              POS sales exceeding statutory Maximum Retail Prices (MRP) or 13% VAT rules trigger automated price gouging alerts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Cryptographic DPP Passports</h3>
            <p className="text-xs text-slate-400">
              Every serial item possesses an immutable hash-chained provenance history from factory cleanroom to retail register.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
