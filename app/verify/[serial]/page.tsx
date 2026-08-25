"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Layers,
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
        className="inline-flex items-center gap-1.5 text-xs text-[#65736a] hover:text-[#1b4332] font-medium transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Verification Gateway
      </Link>

      {isLoading ? (
        <div className="p-12 text-center text-[#65736a] gov-card">
          <div className="w-6 h-6 border-2 border-[#1b4332] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Validating cryptographic provenance signatures on national ledger...
        </div>
      ) : verifyData ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div
            className={`p-5 rounded border ${
              verifyData.isAuthentic
                ? "bg-[#f4f7f5] border-[#cad2c5] text-[#163828]"
                : "bg-[#fdf3f2] border-[#f2cfcd] text-[#8c322c]"
            }`}
          >
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
                <div className="text-xs font-mono text-[#1b4332] mt-0.5">Serial: {serial}</div>
              </div>
            </div>

            {verifyData.passport && (
              <div className="mt-4 pt-4 border-t border-[#e5e2da] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-[#333d37]">
                <div>
                  <span className="text-[10px] text-[#65736a] block font-sans">Product</span>
                  <strong className="text-[#181c1a]">{verifyData.passport.productName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#65736a] block font-sans">Statutory MRP</span>
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

          {verifyData.passport?.journey && (
            <div className="p-5 rounded gov-card space-y-3">
              <h3 className="text-xs font-bold text-[#181c1a] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#1b4332]" />
                Traceability & Custody Events
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
      ) : null}
    </div>
  );
}
