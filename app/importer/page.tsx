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
  Lock,
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
        setManifestStatus("Bill of Entry registered. Tariff assessment complete.");
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
      <div className="max-w-2xl mx-auto my-12 p-8 rounded gov-card text-center space-y-4 border border-[#e5e2da]">
        <div className="w-10 h-10 rounded bg-[#fbeeed] text-[#8c322c] mx-auto flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-[#181c1a]">403 Forbidden: Importer Clearance Access Required</h2>
        <p className="text-xs text-[#4c5850]">
          The <strong>Importer Customs Portal</strong> requires the <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#1b4332]">IMPORTER</code> role. Your current persona is <strong>{role}</strong>.
        </p>
        <button
          onClick={() => loginAsRole("IMPORTER")}
          className="px-4 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition"
        >
          Switch to Importer Role
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e5e2da]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#181c1a]">Importer Customs & Manifests Directorate</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
              {user?.organizationName}
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            Bill of Entry Filings &bull; Port of Origin Inspection &bull; Customs Tariffs & 13% Import VAT
          </p>
        </div>

        <button
          onClick={() => setIsManifestModalOpen(true)}
          className="px-3.5 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          File Bill of Entry (BOE)
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Customs Declarations</span>
          <div className="text-xl font-bold text-[#181c1a] font-mono">{declarations.length}</div>
          <span className="text-[11px] text-[#1b4332] font-medium">Active Bill of Entries</span>
        </div>
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Total Declared Value</span>
          <div className="text-xl font-bold text-[#181c1a] font-mono">
            ${declarations.reduce((sum, d) => sum + d.declaredValueUsd, 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-[#65736a]">USD CIF Value</span>
        </div>
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Customs Duty Paid</span>
          <div className="text-xl font-bold text-[#1b4332] font-mono">
            ${(declarations.reduce((sum, d) => sum + d.customsDutyAmount, 0) / 133.5).toFixed(0)}
          </div>
          <span className="text-[11px] text-[#65736a]">Tariff Revenue Settled</span>
        </div>
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Import 13% VAT</span>
          <div className="text-xl font-bold text-[#2d5a45] font-mono">
            ${(declarations.reduce((sum, d) => sum + d.importVatAmount, 0) / 133.5).toFixed(0)}
          </div>
          <span className="text-[11px] text-[#1b4332] font-medium">ITC Eligible</span>
        </div>
      </div>

      {/* Customs Declarations Table */}
      <div className="p-5 rounded gov-card space-y-3">
        <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
          <Ship className="w-4 h-4 text-[#1b4332]" />
          Consignment Manifests & Customs Assessments
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-[#e5e2da]">
            <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
              <tr>
                <th className="py-2 px-3">Bill of Entry</th>
                <th className="py-2 px-3">Summary / Cargo</th>
                <th className="py-2 px-3">HS Code</th>
                <th className="py-2 px-3">Port of Origin</th>
                <th className="py-2 px-3">Declared (USD)</th>
                <th className="py-2 px-3">Duty Rate</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e2da] text-[#333d37]">
              {declarations.map((dec) => (
                <tr key={dec.id} className="hover:bg-[#f8f7f4] transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#181c1a]">
                    <div>{dec.billOfEntryNo}</div>
                    <div className="text-[10px] text-[#65736a] font-normal">{dec.consignmentId}</div>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#181c1a]">{dec.productSummary}</td>
                  <td className="py-2.5 px-3 font-mono text-[#1b4332]">{dec.hsCode}</td>
                  <td className="py-2.5 px-3 text-[#4c5850]">{dec.portOfOrigin}</td>
                  <td className="py-2.5 px-3 font-mono font-bold">${dec.declaredValueUsd.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono">{(dec.customsDutyRate * 100).toFixed(0)}%</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        dec.clearanceStatus === "CLEARED"
                          ? "bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]"
                          : "bg-[#fbf3e8] text-[#8a5b14] border border-[#eeddc2]"
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

      {/* Manifest Filing Modal */}
      {isManifestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#d2cebf] rounded-lg max-w-xl w-full p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e2da] pb-3">
              <div className="flex items-center gap-2">
                <Ship className="w-4 h-4 text-[#1b4332]" />
                <h3 className="text-sm font-bold text-[#181c1a]">File Customs Bill of Entry (BOE)</h3>
              </div>
              <button
                onClick={() => setIsManifestModalOpen(false)}
                className="text-[#65736a] hover:text-[#181c1a] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitManifest} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Cargo / Consignment Summary</label>
                <input
                  type="text"
                  value={productSummary}
                  onChange={(e) => setProductSummary(e.target.value)}
                  className="gov-input w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">Commodity HS Code</label>
                  <input
                    type="text"
                    value={hsCode}
                    onChange={(e) => setHsCode(e.target.value)}
                    className="gov-input w-full font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">Declared Value ($ USD CIF)</label>
                  <input
                    type="number"
                    value={declaredValueUsd}
                    onChange={(e) => setDeclaredValueUsd(e.target.value)}
                    className="gov-input w-full font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">Port of Origin (Foreign)</label>
                  <input
                    type="text"
                    value={portOfOrigin}
                    onChange={(e) => setPortOfOrigin(e.target.value)}
                    className="gov-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">Port of Entry (National Customs)</label>
                  <input
                    type="text"
                    value={portOfEntry}
                    onChange={(e) => setPortOfEntry(e.target.value)}
                    className="gov-input w-full"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-1 text-[#4c5850]">
                <div className="text-[11px] font-semibold text-[#181c1a]">Automated Tariff Assessment:</div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>Customs Duty (12%):</span>
                  <span className="text-[#1b4332]">${(Number(declaredValueUsd || 0) * 0.12).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>Import VAT (13%):</span>
                  <span className="text-[#2d5a45]">${(Number(declaredValueUsd || 0) * 1.12 * 0.13).toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition cursor-pointer mt-2"
              >
                {isSubmitting ? "Calculating Tariffs..." : "Submit Manifest & File Entry"}
              </button>

              {manifestStatus && (
                <div className={`p-2 rounded text-xs font-semibold ${
                  manifestStatus.includes("Error") ? "bg-[#fbeeed] text-[#8c322c]" : "bg-[#eaf0ec] text-[#1b4332]"
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
