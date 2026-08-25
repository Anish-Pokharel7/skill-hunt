"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { ProductPassport } from "@/lib/db/types";
import {
  QrCode,
  ShieldCheck,
  Package,
  Layers,
  MapPin,
  Clock,
  Download,
  Printer,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Search,
} from "lucide-react";
import QRCode from "qrcode";
import Link from "next/link";

export default function PassportPortalPage() {
  const { user, role } = useAuth();
  const [passports, setPassports] = useState<ProductPassport[]>([]);
  const [selectedPassport, setSelectedPassport] = useState<ProductPassport | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPassports();
  }, []);

  const fetchPassports = async () => {
    try {
      // Passports can be queried from batches or verify endpoint
      const res = await fetch("/api/batches");
      const data = await res.json();
      if (data.success && data.batches) {
        // Fetch verify samples
        const sample1 = await (await fetch("/api/verify/APX-OIL-901-000184")).json();
        const sample2 = await (await fetch("/api/verify/PAC-PHN-801-000492")).json();
        const sample3 = await (await fetch("/api/verify/APX-MED-442-999999")).json();

        const list = [sample1.passport, sample2.passport, sample3.passport].filter(Boolean);
        setPassports(list);
        if (list.length > 0) {
          selectPassport(list[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectPassport = async (passport: ProductPassport) => {
    setSelectedPassport(passport);
    try {
      const url = await QRCode.toDataURL(passport.qrPayload || passport.serialNumber, {
        width: 300,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl("");
    }
  };

  const filtered = passports.filter(
    (p) =>
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Digital Product Passport (DPP) Registry</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
              CRYPTOGRAPHIC PROVENANCE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographic Product Identities &bull; Dynamic QR Minting &bull; Immutable Custody Chain
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-teal-400" />
              Registered Passports
            </h3>
            <span className="text-xs text-slate-400 font-mono">{passports.length} Serials</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search serial number, product, batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input w-full pl-9 text-xs"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map((p) => {
              const isSelected = selectedPassport?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => selectPassport(p)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-900/90 border-teal-500/80 ring-1 ring-teal-500/40 shadow-lg shadow-teal-500/10"
                      : "bg-slate-900/50 hover:bg-slate-900/80 border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-white">{p.serialNumber}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        p.isAuthentic
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {p.isAuthentic ? "AUTHENTIC" : "COUNTERFEIT"}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-200">{p.productName}</h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2">
                    <span>Batch: {p.batchNumber}</span>
                    <span className="text-teal-400">Scans: {p.scanCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Passport Visualizer & Chain of Custody (7 Cols) */}
        {selectedPassport && (
          <div className="lg:col-span-7 space-y-6">
            {/* Passport ID Card */}
            <div className="p-6 rounded-2xl glass-panel-glow border border-teal-500/30 bg-slate-900/90 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold block">
                    National Cryptographic Digital Passport
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">{selectedPassport.productName}</h3>
                  <div className="text-xs text-slate-300 font-mono mt-1">
                    Serial No: <strong className="text-cyan-300">{selectedPassport.serialNumber}</strong>
                  </div>
                </div>

                {/* Live Generated QR Code Box */}
                {qrDataUrl && (
                  <div className="bg-white p-2 rounded-xl shadow-lg flex flex-col items-center shrink-0">
                    <img src={qrDataUrl} alt="Product QR" className="w-28 h-28" />
                    <span className="text-[9px] font-mono font-bold text-slate-900 mt-1">SCAN TO VERIFY</span>
                  </div>
                )}
              </div>

              {/* Passport Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Manufacturer</span>
                  <span className="font-semibold text-white truncate block">{selectedPassport.manufacturerName}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Current Holder</span>
                  <span className="font-semibold text-cyan-300 truncate block">{selectedPassport.currentHolderName}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Statutory MRP</span>
                  <span className="font-mono font-bold text-emerald-400">${selectedPassport.statutoryMrp}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <span className="font-mono font-bold text-teal-300">{selectedPassport.status}</span>
                </div>
              </div>

              {/* Digital Signature */}
              <div className="p-3 rounded-xl bg-slate-950 border border-white/5 text-[11px] font-mono space-y-1">
                <span className="text-slate-400 block">Cryptographic ECDSA Signature Hash:</span>
                <span className="text-cyan-400 break-all">{selectedPassport.digitalSignature}</span>
              </div>
            </div>

            {/* Blockchain-Style Immutable Provenance Journey */}
            <div className="p-6 rounded-2xl glass-panel border border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Immutable Supply Chain Chain of Custody
              </h4>

              <div className="relative pl-6 border-l-2 border-cyan-500/30 space-y-6 text-xs">
                {selectedPassport.journey?.map((event, idx) => (
                  <div key={event.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <span className="font-bold text-cyan-300 font-mono">
                          STEP {idx + 1}: {event.stage}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-slate-200">{event.details}</p>

                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {event.location}
                        </span>
                        <span>
                          Actor: <strong className="text-slate-300">{event.actorName}</strong> ({event.actorOrgName})
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        Block Hash: {event.hash}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
