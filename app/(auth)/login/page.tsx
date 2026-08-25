"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { SEED_USERS, ROLE_DETAILS } from "@/lib/auth/mock-users";
import { UserRole } from "@/lib/db/types";
import {
  Lock,
  ShieldCheck,
  Building2,
} from "lucide-react";

export default function LoginPage() {
  const { user, loginAsRole, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleQuickLogin = async (role: UserRole) => {
    await loginAsRole(role);
    const roleConfig = ROLE_DETAILS[role];
    router.push(roleConfig?.homeRoute || "/");
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loginAsRole(data.user.role);
        const roleConfig = ROLE_DETAILS[data.user.role as UserRole];
        router.push(roleConfig?.homeRoute || "/");
      } else {
        setErrorMessage(data.error || "Login failed");
      }
    } catch {
      setErrorMessage("Network error during authentication.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5] text-xs font-semibold">
          <Lock className="w-3.5 h-3.5" />
          Server-Enforced Cryptographic Authentication
        </div>
        <h1 className="text-2xl font-bold text-[#163828]">VERIPRICE Authorized Access Gateway</h1>
        <p className="text-xs sm:text-sm text-[#65736a] max-w-lg mx-auto">
          Select an accredited actor profile below to authenticate into the National Supply Chain & Tax Ledger.
        </p>
      </div>

      {/* 9 Roles Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-[#181c1a] uppercase tracking-wider">
          Accredited Actor Profiles (1-Click Switch & Login)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SEED_USERS.map((u) => {
            const roleConfig = ROLE_DETAILS[u.role] || ROLE_DETAILS.CONSUMER;
            const isCurrent = user?.id === u.id;

            return (
              <div
                key={u.id}
                onClick={() => handleQuickLogin(u.role)}
                className={`p-3.5 rounded border transition cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? "bg-[#f4f7f5] border-[#1b4332] ring-1 ring-[#1b4332]"
                    : "bg-[#ffffff] hover:bg-[#f8f7f4] border-[#e5e2da]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${roleConfig.badgeColor}`}>
                      {u.role}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-[#1b4332]">ACTIVE</span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-[#181c1a]">{u.name}</h4>
                  <p className="text-[11px] text-[#4c5850]">{u.organizationName}</p>
                  <p className="text-[11px] text-[#65736a] mt-1 line-clamp-2">{roleConfig.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#e5e2da] flex items-center justify-between text-xs font-semibold text-[#1b4332]">
                  <span className="font-mono text-[10px] text-[#8c9890]">{u.email}</span>
                  <span className="inline-flex items-center gap-0.5">
                    Login &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
