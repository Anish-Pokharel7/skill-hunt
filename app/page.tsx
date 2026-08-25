"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
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
  Lock,
  LayoutDashboard,
} from "lucide-react";

export default function HomePage() {
  const { user, role } = useAuth();
  const [quickSerial, setQuickSerial] = useState("APX-OIL-901-000184");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const sampleSerials = [
    { label: "Virgin Olive Oil (Genuine)", serial: "APX-OIL-901-000184", status: "VALID" },
    { label: "5G Smartphone (Imported & Sold)", serial: "PAC-PHN-801-000492", status: "VALID" },
    { label: "Cloned Pharma Batch (Counterfeit)", serial: "APX-MED-442-999999", status: "INVALID" },
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
        message: "Failed to connect to the National Verification Gateway.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const portals = [
    {
      title: "Super Admin Directorate",
      description: "National tax policy, statutory MRP ceilings, organization licensing, user management, system audit logs, and full platform governance.",
      href: "/admin",
      icon: Building2,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Admin Enforcement Dashboard",
      description: "Fraud detection, tax reconciliation, audit trail monitoring, and compliance oversight for Tax Officers and Auditors.",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["TAX_OFFICER", "AUDITOR", "SUPER_ADMIN"],
    },
    {
      title: "Manufacturer Production Portal",
      description: "Production batch registration, ex-factory tax calculation, MRP caps, and DPP serial minting.",
      href: "/manufacturer",
      icon: Factory,
      roles: ["MANUFACTURER", "SUPER_ADMIN"],
    },
    {
      title: "Importer Customs Portal",
      description: "Customs declaration, Bill of Entry filings, and automated import duty & VAT calculation.",
      href: "/importer",
      icon: Ship,
      roles: ["IMPORTER", "SUPER_ADMIN"],
    },
    {
      title: "Business & Retail POS Portal",
      description: "Store inventory, batch receipt, point-of-sale checkout, and statutory price compliance checks.",
      href: "/business",
      icon: Store,
      roles: ["BUSINESS_EMPLOYEE", "SUPER_ADMIN"],
    },
    {
      title: "Tax & Price Compliance Engine",
      description: "13% Standard VAT, Excise, Customs Duty, Input Tax Credit (ITC) reconciliation, and MRP ceilings.",
      href: "/tax-engine",
      icon: Scale,
      roles: ["TAX_OFFICER", "SUPER_ADMIN"],
    },
    {
      title: "Digital Product Passport (DPP) Registry",
      description: "Cryptographic product identities, dynamic QR codes, and immutable custody chain timelines.",
      href: "/passport",
      icon: QrCode,
      roles: ["ALL"],
    },
    {
      title: "Fiscal E-Invoice System",
      description: "Cryptographically verified IRN invoices with anti-IDOR server security and 13% VAT breakdown.",
      href: "/invoices",
      icon: FileText,
      roles: ["ALL"],
    },
    {
      title: "Fraud & Risk Enforcement Desk",
      description: "Anomaly detection for duplicate QR scans, price gouging spikes, and carousel VAT evasion.",
      href: "/fraud-desk",
      icon: AlertTriangle,
      roles: ["TAX_OFFICER", "AUDITOR", "SUPER_ADMIN"],
    },
    {
      title: "Reports & Forensic Audit Ledger",
      description: "Tax collections gap analysis, revenue reconciliation ledgers, and zero-trust access audit logs.",
      href: "/reports",
      icon: BarChart3,
      roles: ["AUDITOR", "TAX_OFFICER", "SUPER_ADMIN"],
    },
    {
      title: "Citizen Product Verification Gateway",
      description: "Public authenticity verification, Maximum Retail Price inspection, and whistleblower reporting.",
      href: "/verify",
      icon: Search,
      roles: ["ALL"],
    },
  ];

  return (
    <div className="space-y-10">
      {/* Official Government Banner / Hero */}
      <section className="gov-card p-6 sm:p-10 bg-[#ffffff] border border-[#e5e2da]">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
            <ShieldCheck className="w-4 h-4 text-[#1b4332]" />
            National Directorate for Fiscal Provenance & Price Compliance
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#163828] leading-tight">
            National Supply Chain Provenance, Tax & Price Engine
          </h1>

          <p className="text-sm sm:text-base text-[#4c5850] leading-relaxed">
            VERIPRICE provides complete supply chain transparency, enforces statutory Maximum Retail Prices (MRP), automates 13% cascading VAT reconciliation, and safeguards trade with <strong>strict server-side authorization</strong> across 9 specialized user roles.
          </p>

          {/* Institutional Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded bg-[#f8f7f4] border border-[#e5e2da]">
              <span className="text-[11px] text-[#65736a] block">National Trade Volume</span>
              <span className="text-lg font-bold text-[#181c1a] font-mono">$1.42 Billion</span>
            </div>
            <div className="p-3.5 rounded bg-[#f8f7f4] border border-[#e5e2da]">
              <span className="text-[11px] text-[#65736a] block">DPP Passports Minted</span>
              <span className="text-lg font-bold text-[#1b4332] font-mono">1,280,450</span>
            </div>
            <div className="p-3.5 rounded bg-[#f8f7f4] border border-[#e5e2da]">
              <span className="text-[11px] text-[#65736a] block">Statutory Tax Standard</span>
              <span className="text-lg font-bold text-[#2d5a45] font-mono">13% VAT</span>
            </div>
            <div className="p-3.5 rounded bg-[#f8f7f4] border border-[#e5e2da]">
              <span className="text-[11px] text-[#65736a] block">Violations Intercepted</span>
              <span className="text-lg font-bold text-[#8c322c] font-mono">4,892 Cases</span>
            </div>
          </div>
        </div>

        {/* Public Citizen Serial Authenticity Quick-Verifier */}
        <div className="mt-8 pt-6 border-t border-[#e5e2da]">
          <div className="bg-[#f7f6f2] rounded-md p-5 border border-[#e5e2da] max-w-3xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#1b4332]" />
                <span className="text-sm font-bold text-[#181c1a]">Citizen Product Authenticity Verifier</span>
              </div>
              <span className="text-xs text-[#65736a]">No Login Required</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={quickSerial}
                onChange={(e) => setQuickSerial(e.target.value)}
                placeholder="Enter Product Serial (e.g. APX-OIL-901-000184)"
                className="gov-input flex-1 font-mono text-xs sm:text-sm"
              />
              <button
                onClick={() => handleQuickVerify()}
                disabled={isVerifying}
                className="px-5 py-2.5 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isVerifying ? "Verifying..." : "Verify Serial Code"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Sample Clickers */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#65736a]">Test Serial Numbers:</span>
              {sampleSerials.map((s) => (
                <button
                  key={s.serial}
                  onClick={() => {
                    setQuickSerial(s.serial);
                    handleQuickVerify(s.serial);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                    s.status === "VALID"
                      ? "bg-[#ffffff] hover:bg-[#eaf0ec] text-[#1b4332] border-[#cad2c5]"
                      : "bg-[#ffffff] hover:bg-[#fbeeed] text-[#8c322c] border-[#f2cfcd]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Quick Result */}
            {verifyResult && (
              <div
                className={`mt-4 p-4 rounded border ${
                  verifyResult.isAuthentic
                    ? "bg-[#f4f7f5] border-[#cad2c5] text-[#163828]"
                    : "bg-[#fdf3f2] border-[#f2cfcd] text-[#8c322c]"
                }`}
              >
                <div className="flex items-start gap-3">
                  {verifyResult.isAuthentic ? (
                    <CheckCircle2 className="w-5 h-5 text-[#1b4332] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#8c322c] shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-sm">
                      {verifyResult.isAuthentic ? "VERIFIED GENUINE PRODUCT" : "COUNTERFEIT / ANOMALY DETECTED"}
                    </div>
                    <p className="text-[#333d37]">{verifyResult.message}</p>
                    {verifyResult.passport && (
                      <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-[#333d37]">
                        <div>Product: <strong>{verifyResult.passport.productName}</strong></div>
                        <div>Batch: <strong>{verifyResult.passport.batchNumber}</strong></div>
                        <div>Statutory MRP: <strong className="text-[#1b4332]">${verifyResult.passport.statutoryMrp}</strong></div>
                        <div>Holder: <strong>{verifyResult.passport.currentHolderName}</strong></div>
                      </div>
                    )}
                    <div className="pt-1.5">
                      <Link
                        href={`/verify/${encodeURIComponent(quickSerial)}`}
                        className="text-[#1b4332] hover:underline font-semibold inline-flex items-center gap-1 text-xs"
                      >
                        Inspect Complete Supply Chain Journey &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 10 Module Portals Directory */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e2da] pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#181c1a]">Official Directory & Workspaces</h2>
            <p className="text-xs text-[#65736a]">
              Each portal implements server-side role and tenant authorization controls.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#4c5850] bg-[#ffffff] px-2.5 py-1 rounded border border-[#e5e2da]">
            <Lock className="w-3.5 h-3.5 text-[#1b4332]" />
            Active Role: <span className="text-[#181c1a] font-bold">{role}</span>
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
                className="gov-card p-4 flex flex-col justify-between hover:border-[#1b4332] transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="p-2 rounded bg-[#f3f1ec] text-[#1b4332] border border-[#e5e2da]">
                      <portal.icon className="w-4 h-4" />
                    </div>
                    {hasRole ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
                        Authorized
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#f3f1ec] text-[#65736a] border border-[#e5e2da] flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Role Restricted
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#181c1a] mb-1">
                    {portal.title}
                  </h3>
                  <p className="text-xs text-[#65736a] leading-relaxed mb-3">
                    {portal.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#e5e2da] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#8c9890]">
                    {portal.roles.join(", ").replace("SUPER_ADMIN", "ADMIN")}
                  </span>
                  <Link
                    href={portal.href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b4332] hover:underline"
                  >
                    Open Portal &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security Architecture Guarantees */}
      <section className="gov-card p-6 border border-[#e5e2da] space-y-4">
        <div>
          <span className="text-[11px] font-bold font-mono text-[#1b4332] uppercase tracking-wider">
            Statutory Safeguards
          </span>
          <h2 className="text-lg font-bold text-[#181c1a] mt-0.5">
            Server-Enforced Authorization & Anti-IDOR Protections
          </h2>
          <p className="text-xs text-[#65736a]">
            VERIPRICE enforces strict multi-tenant boundary checks on every server endpoint. A user cannot access another tenant&apos;s records simply by changing an ID in the URL.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-1.5">
            <div className="font-bold text-[#181c1a] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#1b4332]" />
              Anti-IDOR Isolation
            </div>
            <p className="text-[#4c5850]">
              Invoices, batch certificates, and stock ledgers are cryptographically tied to organization IDs.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-1.5">
            <div className="font-bold text-[#181c1a] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-[#1b4332]" />
              Statutory MRP Enforcement
            </div>
            <p className="text-[#4c5850]">
              POS checkouts attempting to exceed legal Maximum Retail Prices are automatically flagged and recorded.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-1.5">
            <div className="font-bold text-[#181c1a] flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-[#1b4332]" />
              Cryptographic DPP Passports
            </div>
            <p className="text-[#4c5850]">
              Each serial unit possesses a tamper-evident hash chain from manufacturing facility to consumer verification.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
