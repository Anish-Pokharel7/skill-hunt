"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { SEED_USERS, ROLE_DETAILS } from "@/lib/auth/mock-users";
import { UserRole } from "@/lib/db/types";
import {
  Lock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  User,
  Building2,
} from "lucide-react";

export default function LoginPage() {
  const { user, loginAsRole, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-semibold">
          <Lock className="w-3.5 h-3.5" />
          Server-Enforced Cryptographic Authentication
        </div>
        <h1 className="text-3xl font-black text-white">SkillHunt Multi-Role Access Gateway</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Choose any of the 9 accredited actor personas below for immediate testing, or enter your credentials.
        </p>
      </div>

      {/* 9 Roles Quick Launch Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
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
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? "bg-indigo-950/60 border-indigo-500/80 ring-1 ring-indigo-500 shadow-lg shadow-indigo-500/20"
                    : "bg-slate-900/60 hover:bg-slate-900 border-white/10 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${roleConfig.badgeColor}`}>
                      {u.role}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-emerald-400">ACTIVE</span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white">{u.name}</h4>
                  <p className="text-xs text-slate-300 font-medium">{u.organizationName}</p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{roleConfig.description}</p>
                </div>

                <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-cyan-400">
                  <span className="font-mono text-[10px] text-slate-500">{u.email}</span>
                  <span className="inline-flex items-center gap-1">
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
