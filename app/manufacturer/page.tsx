"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { BatchItem, ProductPassport } from "@/lib/db/types";
import {
  Factory,
  QrCode,
  Plus,
  ShieldCheck,
  Package,
  Layers,
  Leaf,
  Sparkles,
  Lock,
  ArrowRight,
  ExternalLink,
  Printer,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function ManufacturerPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [selectedBatchPassports, setSelectedBatchPassports] = useState<ProductPassport[]>([]);
  const [activeBatchView, setActiveBatchView] = useState<BatchItem | null>(null);

  // Form states
  const [productName, setProductName] = useState("Organic Himalayan Honey (500g)");
  const [category, setCategory] = useState("Food & Organic Edibles");
  const [hsCode, setHsCode] = useState("0409.00");
  const [quantity, setQuantity] = useState("1000");
  const [baseCost, setBaseCost] = useState("450");
  const [statutoryMrp, setStatutoryMrp] = useState("750");
  const [factoryLocation, setFactoryLocation] = useState("Bio-Plant Unit 2, Foothills Eco-Zone");
  const [mintDppCount, setMintDppCount] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState("");

  const isAuthorized = role === "MANUFACTURER" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (isAuthorized) {
      fetchBatches();
    }
  }, [role, isAuthorized]);

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      if (data.success) {
        setBatches(data.batches || []);
        if (data.batches?.length > 0 && !activeBatchView) {
          setActiveBatchView(data.batches[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus("");
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          category,
          hsCode,
          quantity: Number(quantity),
          baseCost: Number(baseCost),
          statutoryMrp: Number(statutoryMrp),
          factoryLocation,
          mintDppCount: Number(mintDppCount),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormStatus("Batch registered and DPP Passports cryptographically minted!");
        fetchBatches();
        setTimeout(() => {
          setIsMintModalOpen(false);
          setFormStatus("");
        }, 1200);
      } else {
        setFormStatus(`Error: ${data.message || data.error}`);
      }
    } catch {
      setFormStatus("Failed to submit batch.");
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
        <h2 className="text-xl font-bold text-white">403 Forbidden: Manufacturer Access Only</h2>
        <p className="text-xs sm:text-sm text-slate-300">
          The <strong>Manufacturer Portal</strong> requires the <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300">MANUFACTURER</code> role. Your current role is <strong className="text-white">{role}</strong>.
        </p>
        <button
          onClick={() => loginAsRole("MANUFACTURER")}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
        >
          Switch to Manufacturer Role
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
            <h1 className="text-2xl font-black text-white">Manufacturer Production Hub</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {user?.organizationName}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Production Batch Registration &bull; Cryptographic DPP Minting &bull; Factory Tax Output
          </p>
        </div>

        <button
          onClick={() => setIsMintModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Mint New Production Batch
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Registered Batches</span>
          <div className="text-2xl font-black text-white font-mono">{batches.length}</div>
          <span className="text-[11px] text-emerald-400 font-semibold">100% DPP Cryptographic Sealed</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Units in Circulation</span>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {batches.reduce((sum, b) => sum + b.quantity, 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">Total Factory Output</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Output VAT Accrued</span>
          <div className="text-2xl font-black text-indigo-400 font-mono">$580,000</div>
          <span className="text-[11px] text-slate-400">13% Fiscal Standard</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Avg Carbon Footprint</span>
          <div className="text-2xl font-black text-emerald-300 font-mono">1.18 kg CO₂e</div>
          <span className="text-[11px] text-emerald-400">Sustainability Tier A</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches Table (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              Active Production Batches
            </h3>
            <span className="text-xs text-slate-400 font-mono">{batches.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400 font-mono">
                <tr>
                  <th className="py-2.5 px-3">Batch No</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">HS Code</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Factory Cost</th>
                  <th className="py-2.5 px-3">MRP Cap</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {batches.map((batch) => {
                  const isSelected = activeBatchView?.id === batch.id;
                  return (
                    <tr
                      key={batch.id}
                      onClick={() => setActiveBatchView(batch)}
                      className={`hover:bg-slate-900/60 cursor-pointer transition ${
                        isSelected ? "bg-slate-900/80 border-l-2 border-emerald-400" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-white">{batch.batchNumber}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200">{batch.productName}</div>
                        <div className="text-[10px] text-slate-400">{batch.category}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-300">{batch.hsCode}</td>
                      <td className="py-3 px-3 font-mono">{batch.availableQuantity} / {batch.quantity}</td>
                      <td className="py-3 px-3 font-mono">${batch.baseCost}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">${batch.statutoryMrp}</td>
                      <td className="py-3 px-3">
                        <Link
                          href={`/passport?batch=${batch.batchNumber}`}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-400 font-semibold inline-flex items-center gap-1"
                        >
                          <QrCode className="w-3 h-3" />
                          DPP
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Batch Details & Cryptographic Provenance (1 Col) */}
        {activeBatchView && (
          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 block uppercase">Cryptographic DPP Batch</span>
                <h4 className="text-sm font-bold text-white">{activeBatchView.batchNumber}</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PRODUCED
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Product Title:</span>
                <span className="text-white font-medium">{activeBatchView.productName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-slate-400 block text-[11px]">Standard VAT (13%):</span>
                  <span className="text-cyan-300 font-bold">${(activeBatchView.statutoryMrp * 0.13).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Statutory MRP Cap:</span>
                  <span className="text-emerald-300 font-bold">${activeBatchView.statutoryMrp}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Facility Location:</span>
                <span className="text-slate-200">{activeBatchView.factoryLocation}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 font-mono block">Genesis Provenance Hash:</span>
                <span className="text-[10px] font-mono text-cyan-400 break-all">
                  {activeBatchView.provenanceHash}
                </span>
              </div>

              <div className="pt-2">
                <Link
                  href={`/passport?batch=${activeBatchView.batchNumber}`}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  View Minted Passports & QR Codes
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mint Batch Modal */}
      {isMintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Register Production Batch & Mint DPPs</h3>
              </div>
              <button
                onClick={() => setIsMintModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="glass-input w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Commodity Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="glass-input w-full bg-slate-900"
                  >
                    <option value="Food & Organic Edibles">Food & Organic Edibles</option>
                    <option value="Pharmaceuticals & Healthcare">Pharmaceuticals & Healthcare</option>
                    <option value="Electronics & Tech">Electronics & Tech</option>
                    <option value="Beverages & Spirits">Beverages & Spirits</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">HS Code</label>
                  <input
                    type="text"
                    value={hsCode}
                    onChange={(e) => setHsCode(e.target.value)}
                    className="glass-input w-full font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Total Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="glass-input w-full font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Factory Cost ($)</label>
                  <input
                    type="number"
                    value={baseCost}
                    onChange={(e) => setBaseCost(e.target.value)}
                    className="glass-input w-full font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Statutory MRP ($)</label>
                  <input
                    type="number"
                    value={statutoryMrp}
                    onChange={(e) => setStatutoryMrp(e.target.value)}
                    className="glass-input w-full font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Factory / Assembly Location</label>
                <input
                  type="text"
                  value={factoryLocation}
                  onChange={(e) => setFactoryLocation(e.target.value)}
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Initial DPP QR Passports to Mint</label>
                <input
                  type="number"
                  max="20"
                  min="1"
                  value={mintDppCount}
                  onChange={(e) => setMintDppCount(e.target.value)}
                  className="glass-input w-full font-mono"
                />
                <span className="text-[10px] text-slate-500">Mints unique serial numbers and cryptographic proofs.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {isSubmitting ? "Generating DPP Signatures..." : "Mint Batch & Cryptographic Passports"}
              </button>

              {formStatus && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                  formStatus.includes("Error") ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                }`}>
                  {formStatus}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
