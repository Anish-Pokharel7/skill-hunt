"use client";

import React, { useState } from "react";
import {
  Search,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Clock,
  Layers,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function ConsumerVerificationPage() {
  const [serialInput, setSerialInput] = useState("APX-OIL-901-000184");
  const [verifyData, setVerifyData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Whistleblower Form State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [city, setCity] = useState("");
  const [issueType, setIssueType] = useState("Price Gouging (Charged Over MRP)");
  const [pricePaid, setPricePaid] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportStatus, setReportStatus] = useState("");

  const sampleSerials = [
    { label: "Virgin Olive Oil (Genuine)", serial: "APX-OIL-901-000184" },
    { label: "5G Smartphone (Sold at POS)", serial: "PAC-PHN-801-000492" },
    { label: "Cloned Pharma Batch (Counterfeit)", serial: "APX-MED-442-999999" },
  ];

  const handleVerify = async (serialToUse?: string) => {
    const s = serialToUse || serialInput;
    if (!s) return;
    setIsVerifying(true);
    setVerifyData(null);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(s.trim())}`);
      const data = await res.json();
      setVerifyData(data);
    } catch {
      setVerifyData({
        isAuthentic: false,
        message: "Failed to connect to the National Verification Gateway.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportStatus("");
    try {
      const res = await fetch("/api/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: serialInput,
          storeName,
          city,
          issueType,
          description: reportDesc,
          pricePaid: pricePaid ? Number(pricePaid) : undefined,
          statutoryMrp: verifyData?.passport?.statutoryMrp,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReportStatus("Thank you! Your whistleblower report has been logged with the National Tax & Anti-Fraud Desk.");
        setTimeout(() => {
          setIsReportModalOpen(false);
          setReportStatus("");
          setReportDesc("");
        }, 2000);
      } else {
        setReportStatus(`Error: ${data.message || data.error}`);
      }
    } catch {
      setReportStatus("Failed to submit whistleblower report.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Public Consumer Verification Gateway
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white">
          Verify Product Authenticity & Statutory MRP
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Scan or enter the unique serial number on any product packaging to verify manufacturer origin, supply chain custody, and legal price ceilings.
        </p>
      </div>

      {/* Verification Search Box */}
      <div className="p-6 rounded-2xl glass-panel-glow border border-cyan-500/30 bg-slate-900/90 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              placeholder="Enter Serial Number (e.g. APX-OIL-901-000184)"
              className="glass-input w-full pl-11 text-sm font-mono"
            />
          </div>
          <button
            onClick={() => handleVerify()}
            disabled={isVerifying}
            className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            {isVerifying ? "Verifying..." : "Verify Serial Code"}
          </button>
        </div>

        {/* Quick Sample Clickers */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">Sample Serial Numbers:</span>
          {sampleSerials.map((s) => (
            <button
              key={s.serial}
              onClick={() => {
                setSerialInput(s.serial);
                handleVerify(s.serial);
              }}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Verification Diagnostic Card */}
      {verifyData && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div
            className={`p-6 rounded-2xl border ${
              verifyData.isAuthentic
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-100"
                : "bg-rose-950/40 border-rose-500/40 text-rose-100"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {verifyData.isAuthentic ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {verifyData.isAuthentic ? "GENUINE CERTIFIED PRODUCT" : "COUNTERFEIT / ANOMALY DETECTED"}
                  </h2>
                  <p className="text-xs text-slate-300">{verifyData.message}</p>
                </div>
              </div>

              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Report Overpricing or Fake
              </button>
            </div>

            {verifyData.passport && (
              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Product</span>
                  <strong className="text-white text-sm">{verifyData.passport.productName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Statutory Maximum Price</span>
                  <strong className="text-emerald-400 text-sm">${verifyData.passport.statutoryMrp}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Batch Ref</span>
                  <strong className="text-cyan-300 text-sm">{verifyData.passport.batchNumber}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Total Scans</span>
                  <strong className="text-teal-300 text-sm">{verifyData.passport.scanCount} times</strong>
                </div>
              </div>
            )}
          </div>

          {/* Provenance Journey */}
          {verifyData.passport?.journey && (
            <div className="p-6 rounded-2xl glass-panel border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Verified Supply Chain Traceability Journey
              </h3>

              <div className="relative pl-6 border-l-2 border-cyan-500/30 space-y-6 text-xs">
                {verifyData.passport.journey.map((step: any, i: number) => (
                  <div key={step.id} className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="font-bold text-cyan-300">{step.stage}</span>
                        <span className="text-slate-400">{new Date(step.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-200">{step.details}</p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {step.location} &bull; {step.actorOrgName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Whistleblower Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Report Counterfeit or Price Gouging</h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="glass-input w-full bg-slate-900"
                >
                  <option value="Price Gouging (Charged Over MRP)">Price Gouging (Charged Over Statutory MRP)</option>
                  <option value="Suspected Counterfeit Packaging">Suspected Counterfeit Packaging / Cloned QR</option>
                  <option value="Missing Fiscal Tax Invoice">Retailer Refused Official Tax Invoice</option>
                  <option value="Expired Goods Sold">Expired / Tampered Medicine or Food</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Store / Merchant Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Corner Mart 4"
                    className="glass-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">City / Neighborhood</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Downtown Central"
                    className="glass-input w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Actual Price Charged by Store ($)</label>
                <input
                  type="number"
                  value={pricePaid}
                  onChange={(e) => setPricePaid(e.target.value)}
                  placeholder="e.g. 1450"
                  className="glass-input w-full font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Incident Description & Evidence</label>
                <textarea
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Describe where you purchased the item and what violation occurred..."
                  className="glass-input w-full h-20"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Anonymous Report to Tax Officer Desk
              </button>

              {reportStatus && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold ${
                    reportStatus.includes("Error") ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {reportStatus}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
