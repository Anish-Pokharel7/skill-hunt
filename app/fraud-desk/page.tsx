"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { FraudAlert } from "@/lib/db/types";
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Lock,
  ArrowRight,
  Flame,
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
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl glass-panel border border-rose-500/30 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">403 Forbidden: Enforcement Access Only</h2>
        <p className="text-xs sm:text-sm text-slate-300">
          The <strong>Fraud & Risk Desk</strong> is restricted to <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">TAX_OFFICER</code>, <code className="bg-slate-900 px-1.5 py-0.5 rounded text-rose-300">AUDITOR</code>, and <code className="bg-slate-900 px-1.5 py-0.5 rounded text-purple-300">ADMINS</code>.
        </p>
        <button
          onClick={() => loginAsRole("TAX_OFFICER")}
          className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition"
        >
          Switch to Tax Officer (Marcus Sterling)
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
            <h1 className="text-2xl font-black text-white">National Fraud & Risk Enforcement Desk</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
              AI SENTRY ONLINE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Duplicate QR Detection &bull; Price Gouging Mitigation &bull; Carousel VAT Evasion &bull; Whistleblower Queue
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={isScanning}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-rose-500/20 self-start sm:self-auto"
        >
          <Activity className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
          {isScanning ? "Scanning Ledger Nodes..." : "Execute AI Anomaly Scan"}
        </button>
      </div>

      {scanMessage && (
        <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/30 text-xs font-semibold text-rose-300">
          {scanMessage}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Alerts Queue (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Flagged Risk Incidents
            </h3>
            <span className="text-xs text-slate-400 font-mono">{alerts.length} Alerts</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
            {alerts.map((alert) => {
              const isSelected = selectedAlert?.id === alert.id;
              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-900/90 border-rose-500/80 ring-1 ring-rose-500/40 shadow-lg shadow-rose-500/10"
                      : "bg-slate-900/50 hover:bg-slate-900/80 border-white/5"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                        {alert.type}
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        Risk: {alert.riskScore}/100
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white">{alert.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{alert.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Status: <strong className="text-amber-400">{alert.status}</strong></span>
                    <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Incident Deep-Dive & Action Controls (7 Cols) */}
        {selectedAlert && (
          <div className="lg:col-span-7 p-6 rounded-2xl glass-panel border border-white/10 space-y-6">
            <div className="border-b border-white/10 pb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-rose-400 font-bold">INCIDENT ID: {selectedAlert.id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  SEVERITY: {selectedAlert.severity}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{selectedAlert.title}</h3>
              <p className="text-xs text-slate-300">{selectedAlert.description}</p>
            </div>

            {/* Target Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 block">Reported By</span>
                <span className="font-semibold text-white">{selectedAlert.reportedBy}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 block">Assigned Enforcement Officer</span>
                <span className="font-semibold text-cyan-300">
                  {selectedAlert.assignedOfficerName || "Unassigned (Open Queue)"}
                </span>
              </div>
            </div>

            {selectedAlert.targetSerialNumber && (
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-xs font-mono">
                <span className="text-[10px] text-slate-400 block">Target DPP Serial Number:</span>
                <strong className="text-cyan-400">{selectedAlert.targetSerialNumber}</strong>
              </div>
            )}

            {/* Officer Investigation Action Panel */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Officer Enforcement Actions
              </h4>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Investigation / Seizure Notes</label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Enter forensic findings, penalty assessment, or false positive rationale..."
                  className="glass-input w-full text-xs h-20"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleUpdateStatus("UNDER_INVESTIGATION")}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition cursor-pointer"
                >
                  Mark Under Investigation
                </button>
                <button
                  onClick={() => handleUpdateStatus("CONFIRMED_FRAUD")}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  Confirm Fraud & Issue Penalty
                </button>
                <button
                  onClick={() => handleUpdateStatus("RESOLVED_FALSE_POSITIVE")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
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
