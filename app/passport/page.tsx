"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { ProductPassport } from "@/lib/db/types";
import {
  QrCode,
  Layers,
  MapPin,
  Search,
} from "lucide-react";
import QRCode from "qrcode";

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
      const sample1 = await (await fetch("/api/verify/APX-OIL-901-000184")).json();
      const sample2 = await (await fetch("/api/verify/PAC-PHN-801-000492")).json();
      const sample3 = await (await fetch("/api/verify/APX-MED-442-999999")).json();

      const list = [sample1.passport, sample2.passport, sample3.passport].filter(Boolean);
      setPassports(list);
      if (list.length > 0) {
        selectPassport(list[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectPassport = async (passport: ProductPassport) => {
    setSelectedPassport(passport);
    try {
      const url = await QRCode.toDataURL(passport.qrPayload || passport.serialNumber, {
        width: 250,
        margin: 1,
        color: { dark: "#181c1a", light: "#ffffff" },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e5e2da]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#181c1a]">Digital Product Passport (DPP) Registry</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
              CRYPTOGRAPHIC PROVENANCE
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            Unique Serial Identities &bull; Dynamic QR Minting &bull; Immutable Custody Chain
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded gov-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-[#1b4332]" />
              Registered Passports
            </h3>
            <span className="text-xs text-[#65736a] font-mono">{passports.length} Serials</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#65736a] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search serial number, product, batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="gov-input w-full pl-9 text-xs"
            />
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto">
            {filtered.map((p) => {
              const isSelected = selectedPassport?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => selectPassport(p)}
                  className={`p-3 rounded border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#f4f7f5] border-[#1b4332] ring-1 ring-[#1b4332]"
                      : "bg-[#ffffff] hover:bg-[#f8f7f4] border-[#e5e2da]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-[#181c1a]">{p.serialNumber}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        p.isAuthentic
                          ? "bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]"
                          : "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]"
                      }`}
                    >
                      {p.isAuthentic ? "AUTHENTIC" : "COUNTERFEIT"}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-[#333d37]">{p.productName}</h4>
                  <div className="flex items-center justify-between text-[10px] text-[#65736a] font-mono mt-2">
                    <span>Batch: {p.batchNumber}</span>
                    <span className="text-[#1b4332]">Scans: {p.scanCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Certificate & Timeline (7 Cols) */}
        {selectedPassport && (
          <div className="lg:col-span-7 space-y-4">
            {/* Certificate Header Box */}
            <div className="p-6 rounded gov-card border border-[#d2cebf] space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#e5e2da] pb-4">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#1b4332] font-bold block">
                    National Cryptographic Product Certificate
                  </span>
                  <h3 className="text-lg font-bold text-[#181c1a] mt-0.5">{selectedPassport.productName}</h3>
                  <div className="text-xs text-[#4c5850] font-mono mt-0.5">
                    Serial No: <strong className="text-[#1b4332]">{selectedPassport.serialNumber}</strong>
                  </div>
                </div>

                {qrDataUrl && (
                  <div className="bg-[#ffffff] p-2 rounded border border-[#d2cebf] flex flex-col items-center shrink-0">
                    <img src={qrDataUrl} alt="Product QR" className="w-24 h-24" />
                    <span className="text-[8px] font-mono font-bold text-[#181c1a] mt-1">OFFICIAL QR</span>
                  </div>
                )}
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[10px] text-[#65736a] block">Manufacturer</span>
                  <span className="font-semibold text-[#181c1a] truncate block">{selectedPassport.manufacturerName}</span>
                </div>
                <div className="p-2.5 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[10px] text-[#65736a] block">Current Holder</span>
                  <span className="font-semibold text-[#1b4332] truncate block">{selectedPassport.currentHolderName}</span>
                </div>
                <div className="p-2.5 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[10px] text-[#65736a] block">Statutory MRP</span>
                  <span className="font-mono font-bold text-[#1b4332]">${selectedPassport.statutoryMrp}</span>
                </div>
                <div className="p-2.5 rounded bg-[#f8f7f4] border border-[#e5e2da]">
                  <span className="text-[10px] text-[#65736a] block">Status</span>
                  <span className="font-mono font-bold text-[#2d5a45]">{selectedPassport.status}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#f8f7f4] border border-[#e5e2da] text-[10px] font-mono space-y-0.5">
                <span className="text-[#65736a] block">ECDSA Signature Hash:</span>
                <span className="text-[#1b4332] break-all">{selectedPassport.digitalSignature}</span>
              </div>
            </div>

            {/* Supply Chain Timeline */}
            <div className="p-5 rounded gov-card space-y-3">
              <h4 className="text-xs font-bold text-[#181c1a] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#1b4332]" />
                Traceability & Chain of Custody Events
              </h4>

              <div className="relative pl-5 border-l border-[#cad2c5] space-y-4 text-xs">
                {selectedPassport.journey?.map((event, idx) => (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-[#ffffff] border-2 border-[#1b4332]"></div>

                    <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="font-bold text-[#1b4332]">{event.stage}</span>
                        <span className="text-[#65736a]">{new Date(event.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[#333d37]">{event.details}</p>
                      <div className="text-[10px] text-[#65736a] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#8c9890]" />
                        {event.location} &bull; {event.actorOrgName}
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
