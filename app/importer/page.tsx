"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { CustomsDeclaration } from "@/lib/db/types";
import {
  Ship,
  FileText,
  Plus,
  Scale,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  ArrowRight,
  Calculator,
} from "lucide-react";

export default function ImporterPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>([]);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);

  // Manifest Form States
  const [productSummary, setProductSummary] = useState("Consignment of High-Speed Optical Transceivers (500 Units)");
  const [hsCode, setHsCode] = useState("8517.13");
  const [portOfOrigin, setPortOfOrigin] = useState("Port of Busan (South Korea)");
  const [portOfEntry, setPortOfEntry] = useState("National Inland Container Customs Depot");
  const [declaredValueUsd, setDeclaredValueUsd] = useState("45000");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manifestStatus, setManifestStatus] = useState("");

  const isAuthorized = role === "IMPORTER" || role === "SUPER_ADMIN" || role === "TAX_OFFICER";

  useEffect(() => {
    if (isAuthorized) {
      fetchDeclarations();
    }
  }, [role, isAuthorized]);

  const fetchDeclarations = async () => {
    try {
      const res = await fetch("/api/customs");
      const data = await res.json();
      if (data.success) {
        setDeclarations(data.declarations || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setManifestStatus("");
    try {
      const res = await fetch("/api/customs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSummary,
          hsCode,
          portOfOrigin,
          portOfEntry,
          declaredValueUsd: Number(declaredValueUsd),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setManifestStatus("Bill of Entry registered! Tax and Import Duty calculated.");
        fetchDeclarations();
        setTimeout(() => {
          setIsManifestModalOpen(false);
          setManifestStatus("");
        }, 1200);
      } else {
        setManifestStatus(`Error: ${data.message || data.error}`);
      }
    } catch {
      setManifestStatus("Failed to submit manifest.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl glass-panel border border-rose-500/30 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">403 Forbidden: Importer Portal Restricted</h2>
        <p className="text-xs sm:text-sm text-slate-300">
          The <strong>Importer Customs Portal</strong> requires the <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300">IMPORTER</code> role. Your current role is <strong className="text-white">{role}</strong>.
        </p>
        <button
          onClick={() => loginAsRole("IMPORTER")}
          className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition"
        >
          Switch to Importer Role
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Importer Customs & Manifests</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {user?.organizationName}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-Border Consignments &bull; Bill of Entry Registry &bull; Import Duty & 13% Customs VAT
          </p>
        </div>

        <button
          onClick={() => setIsManifestModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          File Bill of Entry (BOE)
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Customs Manifests</span>
          <div className="text-2xl font-black text-white font-mono">{declarations.length}</div>
          <span className="text-[11px] text-cyan-400 font-semibold">Active Bill of Entries</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Declared Value</span>
          <div className="text-2xl font-black text-white font-mono">
            ${declarations.reduce((sum, d) => sum + d.declaredValueUsd, 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">USD CIF Value</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Customs Tariffs Paid</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ${(declarations.reduce((sum, d) => sum + d.customsDutyAmount, 0) / 133.5).toFixed(0)}
          </div>
          <span className="text-[11px] text-slate-400">Duty & Tariff Revenue</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Import 13% VAT</span>
          <div className="text-2xl font-black text-indigo-400 font-mono">
            ${(declarations.reduce((sum, d) => sum + d.importVatAmount, 0) / 133.5).toFixed(0)}
          </div>
          <span className="text-[11px] text-slate-400">Input Tax Credit Eligible</span>
        </div>
      </div>

      {/* Customs Declarations Table */}
      <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Ship className="w-4 h-4 text-cyan-400" />
            Consignment Clearances & Tariff Ledgers
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400 font-mono">
              <tr>
                <th className="py-2.5 px-3">Bill of Entry</th>
                <th className="py-2.5 px-3">Summary / Cargo</th>
                <th className="py-2.5 px-3">HS Code</th>
                <th className="py-2.5 px-3">Port of Origin</th>
                <th className="py-2.5 px-3">Declared (USD)</th>
                <th className="py-2.5 px-3">Duty Rate</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {declarations.map((dec) => (
                <tr key={dec.id} className="hover:bg-slate-900/60 transition">
                  <td className="py-3 px-3 font-mono font-bold text-white">
                    <div>{dec.billOfEntryNo}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{dec.consignmentId}</div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-200">{dec.productSummary}</td>
                  <td className="py-3 px-3 font-mono text-cyan-300">{dec.hsCode}</td>
                  <td className="py-3 px-3 text-slate-400">{dec.portOfOrigin}</td>
                  <td className="py-3 px-3 font-mono font-bold">${dec.declaredValueUsd.toLocaleString()}</td>
                  <td className="py-3 px-3 font-mono">{(dec.customsDutyRate * 100).toFixed(0)}%</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        dec.clearanceStatus === "CLEARED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {dec.clearanceStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manifest Modal */}
      {isManifestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Ship className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">File Customs Bill of Entry (BOE)</h3>
              </div>
              <button
                onClick={() => setIsManifestModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitManifest} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Cargo / Consignment Summary</label>
                <input
                  type="text"
                  value={productSummary}
                  onChange={(e) => setProductSummary(e.target.value)}
                  className="glass-input w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Commodity HS Code</label>
                  <input
                    type="text"
                    value={hsCode}
                    onChange={(e) => setHsCode(e.target.value)}
                    className="glass-input w-full font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Declared Value ($ USD CIF)</label>
                  <input
                    type="number"
                    value={declaredValueUsd}
                    onChange={(e) => setDeclaredValueUsd(e.target.value)}
                    className="glass-input w-full font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Port of Origin (Foreign)</label>
                  <input
                    type="text"
                    value={portOfOrigin}
                    onChange={(e) => setPortOfOrigin(e.target.value)}
                    className="glass-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Port of Entry (National Customs)</label>
                  <input
                    type="text"
                    value={portOfEntry}
                    onChange={(e) => setPortOfEntry(e.target.value)}
                    className="glass-input w-full"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1 text-slate-400">
                <div className="text-[11px] font-semibold text-slate-200">Automatic Duty Engine Assessment:</div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>Customs Tariffs (12%):</span>
                  <span className="text-cyan-300">${(Number(declaredValueUsd || 0) * 0.12).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>Import VAT (13%):</span>
                  <span className="text-indigo-300">${(Number(declaredValueUsd || 0) * 1.12 * 0.13).toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {isSubmitting ? "Calculating Tariffs..." : "Submit Manifest & File Entry"}
              </button>

              {manifestStatus && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                  manifestStatus.includes("Error") ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                }`}>
                  {manifestStatus}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
