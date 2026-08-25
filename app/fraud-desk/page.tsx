"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { FraudAlert } from "@/lib/db/types";
import {
  AlertTriangle,
  ShieldAlert,
  Lock,
  Activity,
} from "lucide-react";

export default function FraudDeskPage() {
  const { user, role, loginAsRole } = useAuth();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  const isAuthorized =
    role === "TAX_OFFICER" ||
    role === "GOVERNMENT_ADMIN" ||
    role === "AUDITOR" ||
    role === "SUPER_ADMIN";

  useEffect(() => {
    if (isAuthorized) {
      fetchAlerts();
    }
  }, [role, isAuthorized]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/fraud");
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts || []);
        if (data.alerts?.length > 0 && !selectedAlert) {
          setSelectedAlert(data.alerts[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    setScanMessage("");
    try {
      const res = await fetch("/api/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RUN_ANOMALY_SCAN" }),
      });
      const data = await res.json();
      if (data.success) {
        setScanMessage(data.message);
        fetchAlerts();
      }
    } catch {
      setScanMessage("Network anomaly scan failed.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleUpdateStatus = async (newStatus: FraudAlert["status"]) => {
    if (!selectedAlert) return;
    try {
      const res = await fetch("/api/fraud", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: selectedAlert.id,
          status: newStatus,
          actionNotes: actionNotes || "Resolution updated by compliance officer.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAlert(data.alert);
        setActionNotes("");
        fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded gov-card text-center space-y-4 border border-[#e5e2da]">
        <div className="w-10 h-10 rounded bg-[#fbeeed] text-[#8c322c] mx-auto flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-[#181c1a]">403 Forbidden: Tax Officer & Enforcement Desk Only</h2>
        <p className="text-xs text-[#4c5850]">
          The <strong>Fraud & Risk Desk</strong> is restricted to <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#8a5b14]">TAX_OFFICER</code>, <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#8c322c]">AUDITOR</code>, and <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#1b4332]">ADMINS</code>.
        </p>
        <button
          onClick={() => loginAsRole("TAX_OFFICER")}
          className="px-4 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition"
        >
          Switch to Tax Officer (Marcus Sterling)
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
            <h1 className="text-xl font-bold text-[#181c1a]">National Fraud & Risk Enforcement Desk</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]">
              AI RISK SENTRY
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            Duplicate QR Scan Clusters &bull; Price Gouging Mitigation &bull; Carousel VAT Evasion &bull; Whistleblower Queue
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={isScanning}
          className="px-3.5 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Activity className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
          {isScanning ? "Scanning Ledger Nodes..." : "Execute AI Anomaly Scan"}
        </button>
      </div>

      {scanMessage && (
        <div className="p-2.5 rounded bg-[#eaf0ec] border border-[#cad2c5] text-xs font-semibold text-[#1b4332]">
          {scanMessage}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Alerts Queue (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded gov-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#8c322c]" />
              Flagged Risk Incidents
            </h3>
            <span className="text-xs text-[#65736a] font-mono">{alerts.length} Cases</span>
          </div>

          <div className="space-y-2.5 max-h-[550px] overflow-y-auto">
            {alerts.map((alert) => {
              const isSelected = selectedAlert?.id === alert.id;
              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`p-3 rounded border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#f4f7f5] border-[#1b4332] ring-1 ring-[#1b4332]"
                      : "bg-[#ffffff] hover:bg-[#f8f7f4] border-[#e5e2da]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#fbeeed] text-[#8c322c] font-bold border border-[#f2cfcd]">
                        {alert.type}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#8c322c]">
                        Risk: {alert.riskScore}/100
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#181c1a]">{alert.title}</h4>
                    <p className="text-[11px] text-[#65736a] line-clamp-2 mt-0.5">{alert.description}</p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#e5e2da] flex items-center justify-between text-[10px] font-mono text-[#65736a]">
                    <span>Status: <strong className="text-[#8a5b14]">{alert.status}</strong></span>
                    <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Incident Deep-Dive & Action Controls (7 Cols) */}
        {selectedAlert && (
          <div className="lg:col-span-7 p-6 rounded gov-card space-y-4">
            <div className="border-b border-[#e5e2da] pb-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#8c322c] font-bold">CASE ID: {selectedAlert.id}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]">
                  SEVERITY: {selectedAlert.severity}
                </span>
              </div>
              <h3 className="text-base font-bold text-[#181c1a]">{selectedAlert.title}</h3>
              <p className="text-xs text-[#4c5850]">{selectedAlert.description}</p>
            </div>

            {/* Target Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-0.5">
                <span className="text-[10px] text-[#65736a] block">Report Source</span>
                <span className="font-semibold text-[#181c1a]">{selectedAlert.reportedBy}</span>
              </div>
              <div className="p-2.5 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-0.5">
                <span className="text-[10px] text-[#65736a] block">Assigned Officer</span>
                <span className="font-semibold text-[#1b4332]">
                  {selectedAlert.assignedOfficerName || "Unassigned Queue"}
                </span>
              </div>
            </div>

            {selectedAlert.targetSerialNumber && (
              <div className="p-2.5 rounded bg-[#f8f7f4] border border-[#e5e2da] text-xs font-mono">
                <span className="text-[10px] text-[#65736a] block">Target Serial:</span>
                <strong className="text-[#1b4332]">{selectedAlert.targetSerialNumber}</strong>
              </div>
            )}

            {/* Officer Investigation Action Panel */}
            <div className="p-4 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-2.5">
              <h4 className="text-xs font-bold text-[#181c1a] uppercase tracking-wider">
                Officer Enforcement Actions
              </h4>

              <div>
                <label className="block text-[11px] text-[#65736a] mb-1">Forensic / Case Notes</label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Enter investigation notes or penalty determination..."
                  className="gov-input w-full text-xs h-20"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleUpdateStatus("UNDER_INVESTIGATION")}
                  className="px-3 py-1.5 rounded bg-[#fbf3e8] hover:bg-[#faeedd] text-[#8a5b14] font-semibold text-xs border border-[#eeddc2] transition cursor-pointer"
                >
                  Mark Under Investigation
                </button>
                <button
                  onClick={() => handleUpdateStatus("CONFIRMED_FRAUD")}
                  className="px-3 py-1.5 rounded bg-[#8c322c] hover:bg-[#782823] text-white font-semibold text-xs transition cursor-pointer"
                >
                  Confirm Fraud & Issue Penalty
                </button>
                <button
                  onClick={() => handleUpdateStatus("RESOLVED_FALSE_POSITIVE")}
                  className="px-3 py-1.5 rounded bg-[#ffffff] hover:bg-[#eae7df] text-[#4c5850] font-semibold text-xs border border-[#d2cebf] transition cursor-pointer"
                >
                  Resolve False Positive
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
