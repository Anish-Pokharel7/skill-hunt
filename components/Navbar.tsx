"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { SEED_USERS, ROLE_DETAILS } from "@/lib/auth/mock-users";
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
  ChevronDown,
  Lock,
  Sparkles,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, role, loginAsRole, logout, isLoading } = useAuth();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);

  const activeRoleConfig = ROLE_DETAILS[role] || ROLE_DETAILS.CONSUMER;

  const navLinks = [
    { href: "/admin", label: "Super Admin", icon: Building2, roles: ["SUPER_ADMIN"] },
    { href: "/dashboard", label: "Admin Dashboard", icon: LayoutDashboard, roles: ["TAX_OFFICER", "AUDITOR", "SUPER_ADMIN"] },
    { href: "/manufacturer", label: "Manufacturer", icon: Factory, roles: ["MANUFACTURER", "SUPER_ADMIN"] },
    { href: "/importer", label: "Importer", icon: Ship, roles: ["IMPORTER", "SUPER_ADMIN"] },
    { href: "/business", label: "Business POS", icon: Store, roles: ["BUSINESS_EMPLOYEE", "SUPER_ADMIN"] },
    { href: "/tax-engine", label: "Tax Engine", icon: Scale, roles: ["TAX_OFFICER", "SUPER_ADMIN"] },
    { href: "/passport", label: "DPP Registry", icon: QrCode, roles: ["ALL"] },
    { href: "/invoices", label: "Invoices", icon: FileText, roles: ["ALL"] },
    { href: "/fraud-desk", label: "Fraud Desk", icon: AlertTriangle, roles: ["TAX_OFFICER", "AUDITOR", "SUPER_ADMIN"] },
    { href: "/reports", label: "Audit Ledger", icon: BarChart3, roles: ["AUDITOR", "TAX_OFFICER", "SUPER_ADMIN"] },
    { href: "/verify", label: "Verify Citizen Portal", icon: Search, roles: ["ALL"] },
  ];

  return (
    <>

      {/* Main Clean Institutional Header */}
      <header className="sticky top-0 z-50 bg-[#ffffff] border-b border-[#e5e2da] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Official Logo / Insignia */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-md bg-[#1b4332] text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-[#eaf0ec]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-base tracking-tight text-[#163828]">
                      VERIPRICE
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
                      NATIONAL REGISTRY
                    </span>
                  </div>
                  <p className="text-[11px] text-[#65736a] leading-none">
                    Supply Chain Provenance & Tax Compliance
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      isActive
                        ? "bg-[#eaf0ec] text-[#1b4332] font-semibold border border-[#cad2c5]"
                        : hasRole
                        ? "text-[#333d37] hover:text-[#181c1a] hover:bg-[#f3f1ec]"
                        : "text-[#8c9890] hover:text-[#4c5850]"
                    }`}
                  >
                    <item.icon className={`w-3.5 h-3.5 ${isActive ? "text-[#1b4332]" : "text-[#65736a]"}`} />
                    {item.label}
                    {!hasRole && <Lock className="w-2.5 h-2.5 text-[#a4b0a7]" />}
                  </Link>
                );
              })}
            </nav>

            {/* User Profile / Role Trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-md bg-[#f8f7f4] hover:bg-[#f3f1ec] border border-[#e5e2da] transition cursor-pointer text-left"
              >
                <div className="w-6 h-6 rounded bg-[#1b4332] text-white flex items-center justify-center text-xs font-bold">
                  {user?.name ? user.name[0] : "U"}
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-[#181c1a]">
                      {user?.name || "Select Role"}
                    </span>
                    <ChevronDown className="w-3 h-3 text-[#65736a]" />
                  </div>
                  <span className={`text-[10px] font-mono px-1 rounded ${activeRoleConfig.badgeColor}`}>
                    {role}
                  </span>
                </div>
              </button>

              {/* Mobile Menu Trigger */}
              <button
                onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
                className="xl:hidden p-1.5 rounded bg-[#f3f1ec] text-[#333d37] border border-[#e5e2da]"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isNavMenuOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          {isNavMenuOpen && (
            <div className="xl:hidden py-3 border-t border-[#e5e2da] grid grid-cols-2 sm:grid-cols-3 gap-2">
              {navLinks.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsNavMenuOpen(false)}
                    className={`flex items-center gap-2 p-2 rounded text-xs font-medium ${
                      isActive ? "bg-[#eaf0ec] text-[#1b4332] font-bold" : "text-[#333d37] hover:bg-[#f3f1ec]"
                    }`}
                  >
                    <item.icon className="w-4 h-4 text-[#1b4332]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Role Selection Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#d2cebf] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[#e5e2da] pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#163828]">Authorized Persona Switcher</h3>
                <p className="text-xs text-[#65736a]">
                  Select an accredited identity to test role-scoped permissions and server safeguards.
                </p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1 text-[#65736a] hover:text-[#181c1a] rounded hover:bg-[#f3f1ec]"
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
                    className={`p-3.5 rounded border transition cursor-pointer text-left flex flex-col justify-between ${
                      isCurrent
                        ? "bg-[#f4f7f5] border-[#1b4332] ring-1 ring-[#1b4332]"
                        : "bg-[#ffffff] hover:bg-[#f8f7f4] border-[#e5e2da]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${roleConfig.badgeColor}`}>
                          {seedUser.role}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-[#1b4332]">ACTIVE</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-[#181c1a]">{seedUser.name}</h4>
                      <p className="text-xs text-[#4c5850]">{seedUser.organizationName}</p>
                      <p className="text-[11px] text-[#65736a] mt-1">{roleConfig.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#e5e2da] flex items-center justify-between text-[11px] text-[#65736a] font-mono">
                      <span>{seedUser.designation || seedUser.email}</span>
                      <span className="text-[#1b4332] font-semibold">Select &rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-3 border-t border-[#e5e2da] flex items-center justify-between">
              <span className="text-xs text-[#65736a]">
                Server-side authorization enforced on every request.
              </span>
              <button
                onClick={() => {
                  logout();
                  setIsRoleModalOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#fbeeed] hover:bg-[#f7dedc] text-[#8c322c] border border-[#f2cfcd] transition"
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
