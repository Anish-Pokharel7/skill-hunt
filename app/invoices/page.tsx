"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { Invoice } from "@/lib/db/types";
import {
  FileText,
  ShieldCheck,
  Lock,
  Printer,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Search,
  Zap,
} from "lucide-react";

export default function InvoicesPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [testIdorInvoiceId, setTestIdorInvoiceId] = useState("inv_fiscal_8801");
  const [idorTestResult, setIdorTestResult] = useState<any>(null);
  const [isTestingIdor, setIsTestingIdor] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [role]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
        if (data.invoices?.length > 0 && !selectedInvoice) {
          setSelectedInvoice(data.invoices[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestIdor = async () => {
    setIsTestingIdor(true);
    setIdorTestResult(null);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(testIdorInvoiceId)}`);
      const data = await res.json();
      setIdorTestResult({
        statusCode: res.status,
        data,
      });
    } catch (err) {
      setIdorTestResult({
        statusCode: 500,
        data: { error: "Network error" },
      });
    } finally {
      setIsTestingIdor(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Fiscal E-Invoice & IRN Registry</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
              ANTI-IDOR PROTECTED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically Signed Invoice Reference Numbers (IRN) &bull; 13% VAT Itemization &bull; Tenant Isolation
          </p>
        </div>
      </div>

      {/* Interactive Anti-IDOR Demonstration Panel */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/40 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Live Server Authorization & Anti-IDOR Test Tool</h3>
        </div>
        <p className="text-xs text-slate-300">
          Verify that an unauthorized tenant or attacker cannot view another organization's invoices simply by altering the invoice ID in the URL.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
          <input
            type="text"
            value={testIdorInvoiceId}
            onChange={(e) => setTestIdorInvoiceId(e.target.value)}
            placeholder="Target Invoice ID (e.g. inv_fiscal_8801)"
            className="glass-input flex-1 font-mono text-xs"
          />
          <button
            onClick={handleTestIdor}
            disabled={isTestingIdor}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            {isTestingIdor ? "Testing Server..." : "Test Direct Object Access"}
          </button>
        </div>

        {idorTestResult && (
          <div
            className={`mt-2 p-3.5 rounded-xl border text-xs font-mono ${
              idorTestResult.statusCode === 200
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/40 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              <span>HTTP {idorTestResult.statusCode}</span>
              {idorTestResult.statusCode === 403 && <span>&bull; IDOR VIOLATION BLOCKED BY SERVER RBAC</span>}
              {idorTestResult.statusCode === 200 && <span>&bull; AUTHORIZED TENANT ACCESS</span>}
            </div>
            <pre className="text-[11px] whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(idorTestResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Main Content: Invoice List + Official Fiscal Template */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Invoice List (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Invoices Accessible to {role}
            </h3>
            <span className="text-xs text-slate-400 font-mono">{invoices.length} Invoices</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {invoices.map((inv) => {
              const isSelected = selectedInvoice?.id === inv.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-900/90 border-blue-500/80 ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/10"
                      : "bg-slate-900/50 hover:bg-slate-900/80 border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-white">{inv.invoiceNumber}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        inv.fiscalStatus === "VALIDATED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {inv.fiscalStatus}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">Buyer: {inv.buyerName}</div>
                  <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-white/5">
                    <span className="text-slate-400">Total: <strong className="text-emerald-400">${inv.grandTotal.toFixed(2)}</strong></span>
                    <span className="text-indigo-300">VAT: ${inv.totalVat.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Official Printable Fiscal Invoice Template (7 Cols) */}
        {selectedInvoice && (
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl glass-panel border border-white/10 bg-slate-950 space-y-6">
            {/* Invoice Official Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                  OFFICIAL FISCAL TAX INVOICE
                </span>
                <h3 className="text-2xl font-black text-white mt-1">{selectedInvoice.sellerName}</h3>
                <p className="text-xs text-slate-400">{selectedInvoice.sellerAddress}</p>
                <div className="text-xs text-slate-300 font-mono mt-1">
                  Tax PIN (PAN/VAT): <strong className="text-cyan-300">{selectedInvoice.sellerTaxPin}</strong>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-1 font-mono text-xs">
                <div className="text-white font-bold text-base">{selectedInvoice.invoiceNumber}</div>
                <div className="text-slate-400">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</div>
                <div className="text-emerald-400 font-semibold">{selectedInvoice.paymentMethod}</div>
              </div>
            </div>

            {/* Buyer & Issuer Info */}
            <div className="grid grid-cols-2 gap-4 text-xs p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Billed To:</span>
                <div className="font-bold text-white mt-0.5">{selectedInvoice.buyerName}</div>
                <div className="text-slate-400">{selectedInvoice.buyerType}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Issued By Authorized Operator:</span>
                <div className="font-bold text-white mt-0.5">{selectedInvoice.issuedByName}</div>
                <div className="text-[10px] text-cyan-400 font-mono">Status: {selectedInvoice.fiscalStatus}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-slate-400 font-mono">
                  <tr>
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2">HS Code</th>
                    <th className="py-2 px-2">Qty</th>
                    <th className="py-2 px-2">Unit Price</th>
                    <th className="py-2 px-2">VAT 13%</th>
                    <th className="py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {selectedInvoice.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-2 font-medium">
                        <div>{item.productName}</div>
                        {item.serialNumber && (
                          <div className="text-[10px] font-mono text-cyan-400">Serial: {item.serialNumber}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-400">{item.hsCode}</td>
                      <td className="py-2.5 px-2 font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-2 font-mono">${item.unitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-2 font-mono text-indigo-300">${item.vatAmount.toFixed(2)}</td>
                      <td className="py-2.5 px-2 font-mono font-bold text-right text-white">
                        ${item.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Tax Calculation Breakdown */}
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-1.5 text-xs font-mono max-w-sm">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Cryptographic IRN Hash:</div>
                <div className="p-2 rounded bg-slate-900 text-cyan-300 text-[10px] break-all border border-white/5">
                  {selectedInvoice.irn}
                </div>
                <div className="text-[10px] text-emerald-400">Fiscal Stamp: {selectedInvoice.fiscalStampHash}</div>
              </div>

              <div className="w-full sm:w-64 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Taxable:</span>
                  <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Excise Duty:</span>
                  <span>${selectedInvoice.totalExcise.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-indigo-300">
                  <span>Standard VAT (13%):</span>
                  <span>${selectedInvoice.totalVat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white border-t border-white/10 pt-2">
                  <span>Grand Total:</span>
                  <span className="text-emerald-400">${selectedInvoice.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
