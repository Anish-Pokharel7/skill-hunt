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
  Layers,
  Send,
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
        setReportStatus("Thank you. Your report has been dispatched to the National Tax Officer Enforcement Desk.");
        setTimeout(() => {
          setIsReportModalOpen(false);
          setReportStatus("");
          setReportDesc("");
        }, 2000);
      } else {
        setReportStatus(`Error: ${data.message || data.error}`);
      }
    } catch {
      setReportStatus("Failed to submit report.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          Public Citizen Product Verification Gateway
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#163828]">
          Verify Product Authenticity & Statutory MRP
        </h1>
        <p className="text-xs sm:text-sm text-[#65736a] max-w-xl mx-auto">
          Scan or enter the unique serial number on any product packaging to verify manufacturer provenance, custody events, and legal price ceilings.
        </p>
      </div>

      {/* Search Box */}
      <div className="p-5 rounded gov-card space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#65736a] absolute left-3.5 top-3" />
            <input
              type="text"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              placeholder="Enter Serial Number (e.g. APX-OIL-901-000184)"
              className="gov-input w-full pl-10 text-xs sm:text-sm font-mono"
            />
          </div>
          <button
            onClick={() => handleVerify()}
            disabled={isVerifying}
            className="px-5 py-2.5 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isVerifying ? "Verifying..." : "Verify Serial Code"}
          </button>
        </div>

        {/* Samples */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#65736a]">Sample Serial Codes:</span>
          {sampleSerials.map((s) => (
            <button
              key={s.serial}
              onClick={() => {
                setSerialInput(s.serial);
                handleVerify(s.serial);
              }}
              className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#ffffff] hover:bg-[#f3f1ec] text-[#333d37] border border-[#d2cebf] transition"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostic Card */}
      {verifyData && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div
            className={`p-5 rounded border ${
              verifyData.isAuthentic
                ? "bg-[#f4f7f5] border-[#cad2c5] text-[#163828]"
                : "bg-[#fdf3f2] border-[#f2cfcd] text-[#8c322c]"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {verifyData.isAuthentic ? (
                  <CheckCircle2 className="w-6 h-6 text-[#1b4332] shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-[#8c322c] shrink-0" />
                )}
                <div>
                  <h2 className="text-base font-bold">
                    {verifyData.isAuthentic ? "GENUINE CERTIFIED PRODUCT" : "COUNTERFEIT / ANOMALY DETECTED"}
                  </h2>
                  <p className="text-xs text-[#333d37]">{verifyData.message}</p>
                </div>
              </div>

              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-3 py-1.5 rounded bg-[#ffffff] hover:bg-[#fdf3f2] text-[#8c322c] border border-[#f2cfcd] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#8c322c]" />
                Report Overpricing or Fake
              </button>
            </div>

            {verifyData.passport && (
              <div className="mt-4 pt-4 border-t border-[#e5e2da] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-[#333d37]">
                <div>
                  <span className="text-[10px] text-[#65736a] block font-sans">Product</span>
                  <strong className="text-[#181c1a]">{verifyData.passport.productName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#65736a] block font-sans">Statutory Max MRP</span>
                  <strong className="text-[#1b4332]">${verifyData.passport.statutoryMrp}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#65736a] block font-sans">Batch Ref</span>
                  <strong className="text-[#1b4332]">{verifyData.passport.batchNumber}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#65736a] block font-sans">Total Scans</span>
                  <strong className="text-[#4c5850]">{verifyData.passport.scanCount} times</strong>
                </div>
              </div>
            )}
          </div>

          {/* Provenance Chain */}
          {verifyData.passport?.journey && (
            <div className="p-5 rounded gov-card space-y-3">
              <h3 className="text-xs font-bold text-[#181c1a] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#1b4332]" />
                Supply Chain Traceability & Custody Events
              </h3>

              <div className="relative pl-5 border-l border-[#cad2c5] space-y-4 text-xs">
                {verifyData.passport.journey.map((step: any) => (
                  <div key={step.id} className="relative">
                    <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-[#ffffff] border-2 border-[#1b4332]"></div>

                    <div className="p-3 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="font-bold text-[#1b4332]">{step.stage}</span>
                        <span className="text-[#65736a]">{new Date(step.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[#333d37]">{step.details}</p>
                      <div className="text-[10px] text-[#65736a] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#8c9890]" />
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#d2cebf] rounded-lg max-w-lg w-full p-6 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-[#e5e2da] pb-3">
              <div className="flex items-center gap-2 text-[#8c322c]">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#181c1a]">Report Counterfeit or Statutory Price Gouging</h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-[#65736a] hover:text-[#181c1a] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="gov-input w-full"
                >
                  <option value="Price Gouging (Charged Over MRP)">Price Gouging (Charged Over Statutory MRP)</option>
                  <option value="Suspected Counterfeit Packaging">Suspected Counterfeit Packaging / Cloned Serial</option>
                  <option value="Missing Fiscal Tax Invoice">Retailer Refused Official 13% Tax Receipt</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">Store / Outlet Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. City Mart Store 4"
                    className="gov-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#333d37] font-medium mb-1">City / District</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Central District"
                    className="gov-input w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#333d37] font-medium mb-1">Price Charged by Store ($)</label>
                <input
                  type="number"
                  value={pricePaid}
                  onChange={(e) => setPricePaid(e.target.value)}
                  placeholder="e.g. 1450"
                  className="gov-input w-full font-mono"
                />
              </div>

              <div>
                <label className="block text-[#333d37] font-medium mb-1">Incident Description & Evidence</label>
                <textarea
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Describe the purchase details..."
                  className="gov-input w-full h-20"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded bg-[#8c322c] hover:bg-[#782823] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Anonymous Report to Tax Officer Desk
              </button>

              {reportStatus && (
                <div className={`p-2 rounded text-xs font-semibold ${
                  reportStatus.includes("Error") ? "bg-[#fbeeed] text-[#8c322c]" : "bg-[#eaf0ec] text-[#1b4332]"
                }`}>
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
