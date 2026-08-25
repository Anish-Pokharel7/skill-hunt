"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { Invoice } from "@/lib/db/types";
import {
  FileText,
  Lock,
  Zap,
} from "lucide-react";

export default function InvoicesPortalPage() {
  const { user, role } = useAuth();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e5e2da]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#181c1a]">Fiscal E-Invoice & IRN Registry</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
              ANTI-IDOR PROTECTED
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            Cryptographic Invoice Reference Numbers (IRN) &bull; 13% Statutory VAT Itemization &bull; Tenant Isolation
          </p>
        </div>
      </div>

      {/* Anti-IDOR Test Console */}
      <div className="p-4 rounded gov-card border border-[#d2cebf] bg-[#ffffff] space-y-2.5">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#1b4332]" />
          <h3 className="text-xs font-bold text-[#181c1a]">Server-Side Authorization & Anti-IDOR Test Tool</h3>
        </div>
        <p className="text-xs text-[#65736a]">
          Demonstrates that an unauthorized tenant cannot access invoices belonging to another entity simply by altering the ID in the URL.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
          <input
            type="text"
            value={testIdorInvoiceId}
            onChange={(e) => setTestIdorInvoiceId(e.target.value)}
            placeholder="Target Invoice ID (e.g. inv_fiscal_8801)"
            className="gov-input flex-1 font-mono text-xs"
          />
          <button
            onClick={handleTestIdor}
            disabled={isTestingIdor}
            className="px-4 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            {isTestingIdor ? "Testing..." : "Test Direct Object Access"}
          </button>
        </div>

        {idorTestResult && (
          <div
            className={`mt-2 p-3 rounded border text-xs font-mono ${
              idorTestResult.statusCode === 200
                ? "bg-[#f4f7f5] border-[#cad2c5] text-[#163828]"
                : "bg-[#fdf3f2] border-[#f2cfcd] text-[#8c322c]"
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded gov-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#1b4332]" />
              Invoices Accessible to {role}
            </h3>
            <span className="text-xs text-[#65736a] font-mono">{invoices.length} Invoices</span>
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto">
            {invoices.map((inv) => {
              const isSelected = selectedInvoice?.id === inv.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-3 rounded border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#f4f7f5] border-[#1b4332] ring-1 ring-[#1b4332]"
                      : "bg-[#ffffff] hover:bg-[#f8f7f4] border-[#e5e2da]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-[#181c1a]">{inv.invoiceNumber}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        inv.fiscalStatus === "VALIDATED"
                          ? "bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]"
                          : "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]"
                      }`}
                    >
                      {inv.fiscalStatus}
                    </span>
                  </div>

                  <div className="text-xs text-[#4c5850]">Buyer: {inv.buyerName}</div>
                  <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-[#e5e2da]">
                    <span className="text-[#65736a]">Total: <strong className="text-[#181c1a]">${inv.grandTotal.toFixed(2)}</strong></span>
                    <span className="text-[#1b4332]">VAT: ${inv.totalVat.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Official Printable Document Template (7 Cols) */}
        {selectedInvoice && (
          <div className="lg:col-span-7 p-6 sm:p-8 rounded gov-card border border-[#d2cebf] bg-[#ffffff] space-y-5">
            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-[#e5e2da] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#1b4332] font-bold block">
                  OFFICIAL FISCAL TAX INVOICE
                </span>
                <h3 className="text-lg font-bold text-[#181c1a] mt-0.5">{selectedInvoice.sellerName}</h3>
                <p className="text-xs text-[#65736a]">{selectedInvoice.sellerAddress}</p>
                <div className="text-xs text-[#333d37] font-mono mt-1">
                  Tax PIN (PAN/VAT): <strong className="text-[#1b4332]">{selectedInvoice.sellerTaxPin}</strong>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-0.5 font-mono text-xs">
                <div className="text-[#181c1a] font-bold">{selectedInvoice.invoiceNumber}</div>
                <div className="text-[#65736a]">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</div>
                <div className="text-[#1b4332] font-semibold">{selectedInvoice.paymentMethod}</div>
              </div>
            </div>

            {/* Buyer Info */}
            <div className="grid grid-cols-2 gap-4 text-xs p-3 rounded bg-[#f8f7f4] border border-[#e5e2da]">
              <div>
                <span className="text-[#65736a] text-[10px] uppercase block">Billed To:</span>
                <div className="font-bold text-[#181c1a] mt-0.5">{selectedInvoice.buyerName}</div>
                <div className="text-[#65736a]">{selectedInvoice.buyerType}</div>
              </div>
              <div>
                <span className="text-[#65736a] text-[10px] uppercase block">Authorized Issuer:</span>
                <div className="font-bold text-[#181c1a] mt-0.5">{selectedInvoice.issuedByName}</div>
                <div className="text-[10px] text-[#1b4332] font-mono">Status: {selectedInvoice.fiscalStatus}</div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5e2da]">
                <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
                  <tr>
                    <th className="py-2 px-2.5">Item Description</th>
                    <th className="py-2 px-2.5">HS Code</th>
                    <th className="py-2 px-2.5">Qty</th>
                    <th className="py-2 px-2.5">Unit Price</th>
                    <th className="py-2 px-2.5">VAT 13%</th>
                    <th className="py-2 px-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2da] text-[#333d37]">
                  {selectedInvoice.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 px-2.5 font-medium text-[#181c1a]">
                        <div>{item.productName}</div>
                        {item.serialNumber && (
                          <div className="text-[10px] font-mono text-[#1b4332]">Serial: {item.serialNumber}</div>
                        )}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[#65736a]">{item.hsCode}</td>
                      <td className="py-2 px-2.5 font-mono">{item.quantity}</td>
                      <td className="py-2 px-2.5 font-mono">${item.unitPrice.toFixed(2)}</td>
                      <td className="py-2 px-2.5 font-mono text-[#1b4332]">${item.vatAmount.toFixed(2)}</td>
                      <td className="py-2 px-2.5 font-mono font-bold text-right text-[#181c1a]">
                        ${item.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Tax Calculation Breakdown */}
            <div className="border-t border-[#e5e2da] pt-4 flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-1 text-xs font-mono max-w-sm">
                <div className="text-[10px] text-[#65736a] uppercase font-bold">Cryptographic IRN Hash:</div>
                <div className="p-2 rounded bg-[#f8f7f4] text-[#1b4332] text-[10px] break-all border border-[#e5e2da]">
                  {selectedInvoice.irn}
                </div>
                <div className="text-[10px] text-[#2d5a45]">Fiscal Stamp: {selectedInvoice.fiscalStampHash}</div>
              </div>

              <div className="w-full sm:w-60 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-[#65736a]">
                  <span>Subtotal Taxable:</span>
                  <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#65736a]">
                  <span>Excise Duty:</span>
                  <span>${selectedInvoice.totalExcise.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#1b4332]">
                  <span>Standard VAT (13%):</span>
                  <span>${selectedInvoice.totalVat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#181c1a] border-t border-[#e5e2da] pt-1.5">
                  <span>Grand Total:</span>
                  <span className="text-[#1b4332]">${selectedInvoice.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
