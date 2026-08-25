"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { BatchItem, ProductPassport } from "@/lib/db/types";
import {
  Factory,
  QrCode,
  Plus,
  Package,
  Lock,
  ArrowRight,
  Printer,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function ManufacturerPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
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
        setFormStatus("Batch registered and DPP Passports cryptographically minted.");
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
      <div className="max-w-2xl mx-auto my-12 p-8 rounded gov-card text-center space-y-4 border border-[#e5e2da]">
        <div className="w-10 h-10 rounded bg-[#fbeeed] text-[#8c322c] mx-auto flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-[#181c1a]">403 Forbidden: Manufacturer Access Required</h2>
        <p className="text-xs text-[#4c5850]">
          The <strong>Manufacturer Portal</strong> requires the <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#1b4332]">MANUFACTURER</code> role. Your current persona is <strong>{role}</strong>.
        </p>
        <button
          onClick={() => loginAsRole("MANUFACTURER")}
          className="px-4 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition"
        >
          Switch to Manufacturer Role
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
            <h1 className="text-xl font-bold text-[#181c1a]">Manufacturer Production Portal</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
              {user?.organizationName}
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            Production Batch Registration &bull; Cryptographic DPP Minting &bull; Ex-Factory Tax Ledgers
          </p>
        </div>

        <button
          onClick={() => setIsMintModalOpen(true)}
          className="px-3.5 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Register Production Batch
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Registered Batches</span>
          <div className="text-xl font-bold text-[#181c1a] font-mono">{batches.length}</div>
          <span className="text-[11px] text-[#1b4332] font-medium">100% DPP Cryptographic Sealed</span>
        </div>
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Units in Circulation</span>
          <div className="text-xl font-bold text-[#181c1a] font-mono">
            {batches.reduce((sum, b) => sum + b.quantity, 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-[#65736a]">Total Certified Output</span>
        </div>
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Output VAT Accrued</span>
          <div className="text-xl font-bold text-[#1b4332] font-mono">$580,000</div>
          <span className="text-[11px] text-[#65736a]">13% Standard Standard</span>
        </div>
        <div className="p-4 rounded gov-card space-y-1">
          <span className="text-xs text-[#65736a]">Avg Carbon Footprint</span>
          <div className="text-xl font-bold text-[#2d5a45] font-mono">1.18 kg CO₂e</div>
          <span className="text-[11px] text-[#1b4332] font-medium">Tier A Verified</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches Table (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded gov-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#1b4332]" />
              Production Batches & Serials
            </h3>
            <span className="text-xs text-[#65736a] font-mono">{batches.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#e5e2da]">
              <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
                <tr>
                  <th className="py-2 px-3">Batch No</th>
                  <th className="py-2 px-3">Product</th>
                  <th className="py-2 px-3">HS Code</th>
                  <th className="py-2 px-3">Quantity</th>
                  <th className="py-2 px-3">Factory Cost</th>
                  <th className="py-2 px-3">MRP Cap</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e2da] text-[#333d37]">
                {batches.map((batch) => {
                  const isSelected = activeBatchView?.id === batch.id;
                  return (
                    <tr
                      key={batch.id}
                      onClick={() => setActiveBatchView(batch)}
                      className={`hover:bg-[#f8f7f4] cursor-pointer transition ${
                        isSelected ? "bg-[#f4f7f5] border-l-2 border-[#1b4332]" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-[#181c1a]">{batch.batchNumber}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#181c1a]">{batch.productName}</div>
                        <div className="text-[10px] text-[#65736a]">{batch.category}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#1b4332]">{batch.hsCode}</td>
                      <td className="py-2.5 px-3 font-mono">{batch.availableQuantity} / {batch.quantity}</td>
                      <td className="py-2.5 px-3 font-mono">${batch.baseCost}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1b4332]">${batch.statutoryMrp}</td>
                      <td className="py-2.5 px-3">
                        <Link
                          href={`/passport?batch=${batch.batchNumber}`}
                          className="px-2 py-0.5 rounded bg-[#f3f1ec] hover:bg-[#eaf0ec] text-[11px] text-[#1b4332] font-semibold inline-flex items-center gap-1 border border-[#cad2c5]"
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

        {/* Selected Batch Details */}
        {activeBatchView && (
          <div className="p-5 rounded gov-card space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e2da] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#1b4332] uppercase font-bold block">Batch Certificate</span>
                <h4 className="text-sm font-bold text-[#181c1a]">{activeBatchView.batchNumber}</h4>
              </div>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
                CERTIFIED
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[#65736a] block text-[11px]">Product Title:</span>
                <span className="text-[#181c1a] font-medium">{activeBatchView.productName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-[#65736a] block text-[11px]">Standard VAT (13%):</span>
                  <span className="text-[#1b4332] font-bold">${(activeBatchView.statutoryMrp * 0.13).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[#65736a] block text-[11px]">Statutory MRP Cap:</span>
                  <span className="text-[#1b4332] font-bold">${activeBatchView.statutoryMrp}</span>
                </div>
              </div>

              <div>
                <span className="text-[#65736a] block text-[11px]">Production Facility:</span>
                <span className="text-[#333d37]">{activeBatchView.factoryLocation}</span>
              </div>

              <div className="p-2.5 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-1">
                <span className="text-[10px] text-[#65736a] font-mono block">Genesis Hash:</span>
                <span className="text-[10px] font-mono text-[#1b4332] break-all">
                  {activeBatchView.provenanceHash}
                </span>
              </div>

              <div className="pt-2">
                <Link
                  href={`/passport?batch=${activeBatchView.batchNumber}`}
                  className="w-full py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#d2cebf] rounded-lg max-w-xl w-full p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e2da] pb-3">
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-[#1b4332]" />
                <h3 className="text-sm font-bold text-[#181c1a]">Register Batch & Mint DPP Passports</h3>
              </div>
              <button
                onClick={() => setIsMintModalOpen(false)}
                className="text-[#65736a] hover:text-[#181c1a] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="gov-input w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="gov-input w-full"
                  >
                    <option value="Food & Organic Edibles">Food & Organic Edibles</option>
                    <option value="Pharmaceuticals & Healthcare">Pharmaceuticals & Healthcare</option>
                    <option value="Electronics & Tech">Electronics & Tech</option>
                    <option value="Beverages & Spirits">Beverages & Spirits</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">HS Code</label>
                  <input
                    type="text"
                    value={hsCode}
                    onChange={(e) => setHsCode(e.target.value)}
                    className="gov-input w-full font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="gov-input w-full font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">Factory Cost ($)</label>
                  <input
                    type="number"
                    value={baseCost}
                    onChange={(e) => setBaseCost(e.target.value)}
                    className="gov-input w-full font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">Statutory MRP ($)</label>
                  <input
                    type="number"
                    value={statutoryMrp}
                    onChange={(e) => setStatutoryMrp(e.target.value)}
                    className="gov-input w-full font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#333d37] font-medium mb-1">Factory Location</label>
                <input
                  type="text"
                  value={factoryLocation}
                  onChange={(e) => setFactoryLocation(e.target.value)}
                  className="gov-input w-full"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition cursor-pointer mt-2"
              >
                {isSubmitting ? "Generating DPP Signatures..." : "Mint Batch & Cryptographic Passports"}
              </button>

              {formStatus && (
                <div className={`p-2 rounded text-xs font-semibold ${
                  formStatus.includes("Error") ? "bg-[#fbeeed] text-[#8c322c]" : "bg-[#eaf0ec] text-[#1b4332]"
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
