"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { SEED_USERS, ROLE_DETAILS } from "@/lib/auth/mock-users";
import { UserRole } from "@/lib/db/types";
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
  User,
  ChevronDown,
  RefreshCw,
  LogOut,
  Sparkles,
  Lock,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, role, loginAsRole, logout, isLoading } = useAuth();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);

  const activeRoleConfig = ROLE_DETAILS[role] || ROLE_DETAILS.CONSUMER;

  const navLinks = [
    { href: "/admin", label: "Admin & Gov", icon: Building2, roles: ["SUPER_ADMIN", "GOVERNMENT_ADMIN"] },
    { href: "/manufacturer", label: "Manufacturer", icon: Factory, roles: ["MANUFACTURER", "SUPER_ADMIN"] },
    { href: "/importer", label: "Importer", icon: Ship, roles: ["IMPORTER", "SUPER_ADMIN"] },
    { href: "/business", label: "Business POS", icon: Store, roles: ["BUSINESS_OWNER", "BUSINESS_EMPLOYEE", "SUPER_ADMIN"] },
    { href: "/tax-engine", label: "Tax Engine", icon: Scale, roles: ["TAX_OFFICER", "GOVERNMENT_ADMIN", "SUPER_ADMIN"] },
    { href: "/passport", label: "DPP Passports", icon: QrCode, roles: ["ALL"] },
    { href: "/invoices", label: "Invoices", icon: FileText, roles: ["ALL"] },
    { href: "/fraud-desk", label: "Fraud Desk", icon: AlertTriangle, roles: ["TAX_OFFICER", "GOVERNMENT_ADMIN", "AUDITOR", "SUPER_ADMIN"] },
    { href: "/reports", label: "Reports", icon: BarChart3, roles: ["AUDITOR", "TAX_OFFICER", "GOVERNMENT_ADMIN", "SUPER_ADMIN"] },
    { href: "/verify", label: "Verify QR", icon: Search, roles: ["ALL"] },
  ];

  return (
    <>
      {/* Top Demo Simulation Banner with 1-Click Role Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-900/40 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Lock className="w-2.5 h-2.5" />
            SERVER-ENFORCED RBAC ACTIVE
          </span>
          <span className="hidden md:inline text-slate-400">
            Logged in as: <strong className="text-white">{user?.name || "Guest"}</strong> ({user?.organizationName})
          </span>
        </div>

        {/* 9 Roles Quick Selector Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
          <span className="text-slate-400 font-medium whitespace-nowrap text-[11px] mr-1 hidden lg:inline">
            Quick Switch (9 Roles):
          </span>
          {SEED_USERS.map((u) => {
            const isCurrent = user?.id === u.id;
            return (
              <button
                key={u.id}
                onClick={() => loginAsRole(u.role)}
                disabled={isLoading}
                title={`${u.name} - ${u.role} (${u.organizationName})`}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition whitespace-nowrap ${
                  isCurrent
                    ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/50 ring-1 ring-white/30"
                    : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50"
                }`}
              >
                {u.role.replace("BUSINESS_", "BIZ_").replace("GOVERNMENT_", "GOV_")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Glass Navigation Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10 bg-slate-950/85">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Platform Name */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                      SkillHunt
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      ApexTrace
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono leading-none">
                    National Supply Chain & Tax Ledger
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center space-x-1">
              {navLinks.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const hasRole =
                  item.roles.includes("ALL") ||
                  (user && (item.roles.includes(user.role) || user.role === "SUPER_ADMIN"));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm"
                        : hasRole
                        ? "text-slate-300 hover:text-white hover:bg-slate-800/60"
                        : "text-slate-500 hover:text-slate-400 hover:bg-slate-900/40"
                    }`}
                  >
                    <item.icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                    {item.label}
                    {!hasRole && <Lock className="w-2.5 h-2.5 text-slate-600" />}
                  </Link>
                );
              })}
            </nav>

            {/* Active User Card & Switcher Trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 transition group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-inner">
                  {user?.name ? user.name[0] : "U"}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      {user?.name || "Select Role"}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-200 transition-transform" />
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${activeRoleConfig.badgeColor}`}>
                    {role}
                  </span>
                </div>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
                className="xl:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${isNavMenuOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          {isNavMenuOpen && (
            <div className="xl:hidden py-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {navLinks.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsNavMenuOpen(false)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium ${
                      isActive ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <item.icon className="w-4 h-4 text-cyan-400" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Role Switcher Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">System Role Selector & Simulation</h3>
                  <p className="text-xs text-slate-400">
                    Switch your authenticated persona to test server-side RBAC and portal views.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SEED_USERS.map((seedUser) => {
                const isCurrent = user?.id === seedUser.id;
                const roleConfig = ROLE_DETAILS[seedUser.role] || ROLE_DETAILS.CONSUMER;

                return (
                  <div
                    key={seedUser.id}
                    onClick={async () => {
                      await loginAsRole(seedUser.role);
                      setIsRoleModalOpen(false);
                    }}
                    className={`p-3.5 rounded-xl border transition cursor-pointer text-left flex flex-col justify-between ${
                      isCurrent
                        ? "bg-indigo-950/60 border-indigo-500/80 ring-1 ring-indigo-500 shadow-lg shadow-indigo-500/20"
                        : "bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${roleConfig.badgeColor}`}>
                          {seedUser.role}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{seedUser.name}</h4>
                      <p className="text-xs text-slate-300 mb-1">{seedUser.organizationName}</p>
                      <p className="text-[11px] text-slate-400 leading-snug">{roleConfig.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{seedUser.designation || seedUser.email}</span>
                      <span className="text-indigo-400 font-medium">Select &rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                All roles strictly verified server-side on each request.
              </span>
              <button
                onClick={() => {
                  logout();
                  setIsRoleModalOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out (Consumer Mode)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
