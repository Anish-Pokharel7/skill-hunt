"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Clock,
  Layers,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function DirectSerialVerifyPage() {
  const params = useParams();
  const serial = params?.serial ? decodeURIComponent(params.serial as string) : "";
  const [verifyData, setVerifyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (serial) {
      fetch(`/api/verify/${encodeURIComponent(serial)}`)
        .then((res) => res.json())
        .then((data) => setVerifyData(data))
        .catch(() =>
          setVerifyData({
            isAuthentic: false,
            message: "Failed to connect to the National Verification Gateway.",
          })
        )
        .finally(() => setIsLoading(false));
    }
  }, [serial]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/verify"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Verification Scanner
      </Link>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 glass-panel">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Validating cryptographic provenance signatures on national ledger...
        </div>
      ) : verifyData ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div
            className={`p-6 rounded-2xl border ${
              verifyData.isAuthentic
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-100"
                : "bg-rose-950/40 border-rose-500/40 text-rose-100"
            }`}
          >
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
                <div className="text-xs font-mono text-cyan-300 mt-1">Serial: {serial}</div>
              </div>
            </div>

            {verifyData.passport && (
              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Product</span>
                  <strong className="text-white text-sm">{verifyData.passport.productName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Statutory Max Price</span>
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
      ) : null}
    </div>
  );
}
