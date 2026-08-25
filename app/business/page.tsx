"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { BusinessInventoryItem, BatchItem } from "@/lib/db/types";
import {
  Store,
  QrCode,
  ShoppingCart,
  Receipt,
  Plus,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Trash2,
  UserCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function BusinessPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [inventory, setInventory] = useState<BusinessInventoryItem[]>([]);
  const [availableBatches, setAvailableBatches] = useState<BatchItem[]>([]);
  const [activeTab, setActiveTab] = useState<"inventory" | "pos" | "receive">("inventory");

  // Inbound Stock Receive State
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [receiveQty, setReceiveQty] = useState("100");
  const [retailPrice, setRetailPrice] = useState("");
  const [receiveStatus, setReceiveStatus] = useState("");

  // POS Cart State
  const [cart, setCart] = useState<
    { item: BusinessInventoryItem; quantity: number; salePrice: number; serialNumber?: string }[]
  >([]);
  const [buyerName, setBuyerName] = useState("Maya Lin (Citizen Consumer)");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "DIGITAL_WALLET">("CARD");
  const [posStatus, setPosStatus] = useState("");
  const [lastIssuedInvoice, setLastIssuedInvoice] = useState<any>(null);

  const isAuthorized =
    role === "BUSINESS_OWNER" || role === "BUSINESS_EMPLOYEE" || role === "SUPER_ADMIN";
  const isOwner = role === "BUSINESS_OWNER" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (isAuthorized) {
      fetchInventory();
      fetchBatches();
    }
  }, [role, isAuthorized]);

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (data.success) {
        setInventory(data.inventory || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      if (data.success && data.batches?.length > 0) {
        setAvailableBatches(data.batches);
        setSelectedBatchId(data.batches[0].id);
        setRetailPrice(data.batches[0].statutoryMrp.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setReceiveStatus("");
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatchId,
          quantity: Number(receiveQty),
          retailPrice: Number(retailPrice),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReceiveStatus("Inbound stock verified & stocked into inventory successfully!");
        fetchInventory();
      } else {
        setReceiveStatus(`Error: ${data.message || data.error}`);
      }
    } catch {
      setReceiveStatus("Failed to stock inventory.");
    }
  };

  const addToCart = (item: BusinessInventoryItem) => {
    const existing = cart.find((c) => c.item.id === item.id);
    if (existing) {
      setCart(cart.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([...cart, { item, quantity: 1, salePrice: item.retailPrice }]);
    }
  };

  const updateCartPrice = (itemId: string, newPrice: number) => {
    setCart(cart.map((c) => (c.item.id === itemId ? { ...c, salePrice: newPrice } : c)));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.item.id !== itemId));
  };

  const handlePosCheckout = async () => {
    if (cart.length === 0) return;
    setPosStatus("Processing fiscal e-invoice on server...");
    try {
      const itemsPayload = cart.map((c) => ({
        batchId: c.item.batchId,
        batchNumber: c.item.batchNumber,
        productName: c.item.productName,
        hsCode: c.item.hsCode,
        quantity: c.quantity,
        unitPrice: c.salePrice,
        serialNumber: c.serialNumber || `POS-SER-${Date.now().toString().slice(-6)}`,
      }));

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceType: "B2C_RETAIL",
          buyerName,
          buyerType: "INDIVIDUAL_CONSUMER",
          items: itemsPayload,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastIssuedInvoice(data.invoice);
        setCart([]);
        if (data.priceGougingWarnings?.length > 0) {
          setPosStatus(`FLAGGED: Fiscal Invoice ${data.invoice.invoiceNumber} recorded with Price Gouging Violation!`);
        } else {
          setPosStatus(`Success: Fiscal E-Invoice ${data.invoice.invoiceNumber} issued with IRN hash!`);
        }
        fetchInventory();
      } else {
        setPosStatus(`Error: ${data.message || data.error}`);
      }
    } catch {
      setPosStatus("POS checkout failed.");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl glass-panel border border-rose-500/30 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">403 Forbidden: Business Portal Restricted</h2>
        <p className="text-xs sm:text-sm text-slate-300">
          The <strong>Business & Retail POS Portal</strong> requires <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300">BUSINESS_OWNER</code> or <code className="bg-slate-900 px-1.5 py-0.5 rounded text-sky-300">BUSINESS_EMPLOYEE</code>.
        </p>
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => loginAsRole("BUSINESS_OWNER")}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
          >
            Switch to Business Owner (Kavita)
          </button>
          <button
            onClick={() => loginAsRole("BUSINESS_EMPLOYEE")}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition"
          >
            Switch to Business Cashier (Rohan)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Metro Retail & POS Operations</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              {role === "BUSINESS_EMPLOYEE" ? "Scoped POS Operator" : "Business Owner"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {user?.organizationName} &bull; Tax PIN: <code className="text-cyan-300 font-mono">BIZ-VAT-8823104</code>
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-white/10 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "inventory" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Stock Inventory
          </button>
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "pos" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Point of Sale (POS)
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveTab("receive")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === "receive" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Inbound Stock In
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Inventory Grid */}
      {activeTab === "inventory" && (
        <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-400" />
              Live Store Inventory & MRP Compliance
            </h3>
            <span className="text-xs text-slate-400 font-mono">{inventory.length} Stock Units</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400 font-mono">
                <tr>
                  <th className="py-2.5 px-3">SKU / Item</th>
                  <th className="py-2.5 px-3">Batch Reference</th>
                  <th className="py-2.5 px-3">In Stock</th>
                  {isOwner && <th className="py-2.5 px-3">Wholesale Cost</th>}
                  <th className="py-2.5 px-3">Retail Price</th>
                  <th className="py-2.5 px-3">Statutory MRP</th>
                  <th className="py-2.5 px-3">Compliance</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/60 transition">
                    <td className="py-3 px-3 font-semibold text-white">
                      <div>{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.sku} ({item.hsCode})</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-300">{item.batchNumber}</td>
                    <td className="py-3 px-3 font-mono font-bold">{item.stockQuantity}</td>
                    {isOwner && <td className="py-3 px-3 font-mono text-slate-400">${item.unitCost}</td>}
                    <td className="py-3 px-3 font-mono font-bold text-white">${item.retailPrice}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">${item.statutoryMrp}</td>
                    <td className="py-3 px-3">
                      {item.isPriceCompliant ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          MRP COMPLIANT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          PRICE GOUGING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => {
                          addToCart(item);
                          setActiveTab("pos");
                        }}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] inline-flex items-center gap-1 transition"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        Add to POS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Point of Sale (POS) Checkout */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Item Catalog (2 Cols) */}
          <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-cyan-400" />
              Select Products for Checkout
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-cyan-500/40 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.productName}</h4>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Batch: {item.batchNumber} | Stock: {item.stockQuantity}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Retail: </span>
                      <span className="text-sm font-mono font-bold text-cyan-400">${item.retailPrice}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">MRP: ${item.statutoryMrp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart & Fiscal Invoice Stamping (1 Col) */}
          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Fiscal POS Terminal
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="glass-input w-full text-xs"
                />
              </div>

              {/* Cart Item List */}
              <div className="border-t border-b border-white/10 py-2 space-y-2 max-h-48 overflow-y-auto text-xs">
                {cart.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Cart is empty. Click an item to add.</p>
                ) : (
                  cart.map((c) => {
                    const isOverMrp = c.salePrice > c.item.statutoryMrp;
                    return (
                      <div key={c.item.id} className="p-2 rounded-lg bg-slate-900/80 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between font-medium text-slate-200">
                          <span>{c.item.productName}</span>
                          <button
                            onClick={() => removeFromCart(c.item.id)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Qty: {c.quantity}</span>
                          <div className="flex items-center gap-1 font-mono">
                            <span>Price $:</span>
                            <input
                              type="number"
                              value={c.salePrice}
                              onChange={(e) => updateCartPrice(c.item.id, Number(e.target.value))}
                              className={`w-16 px-1 py-0.5 rounded bg-slate-950 text-right font-mono border ${
                                isOverMrp ? "border-rose-500 text-rose-300 font-bold" : "border-slate-700 text-white"
                              }`}
                            />
                          </div>
                        </div>
                        {isOverMrp && (
                          <div className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Gouging Alert: Exceeds MRP ${c.item.statutoryMrp}!
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Payment Method & Checkout */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="glass-input w-full text-xs bg-slate-900"
                >
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash Currency</option>
                  <option value="DIGITAL_WALLET">Digital Wallet (Gov Pay)</option>
                </select>
              </div>

              <button
                onClick={handlePosCheckout}
                disabled={cart.length === 0}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <ShieldCheck className="w-4 h-4" />
                Issue 13% Fiscal Tax Invoice
              </button>

              {posStatus && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold ${
                    posStatus.includes("FLAGGED")
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {posStatus}
                </div>
              )}

              {lastIssuedInvoice && (
                <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs space-y-1">
                  <span className="text-[10px] font-mono text-cyan-400 block uppercase">IRN Tax Stamp Generated</span>
                  <div className="font-mono text-white font-bold">{lastIssuedInvoice.invoiceNumber}</div>
                  <div className="text-[10px] font-mono text-slate-400 break-all">{lastIssuedInvoice.irn}</div>
                  <Link
                    href={`/invoices`}
                    className="text-cyan-400 hover:underline text-[11px] font-medium block pt-1"
                  >
                    View Official Printable Tax Receipt &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Inbound Stock Acceptance (Owner Only) */}
      {activeTab === "receive" && isOwner && (
        <div className="p-6 rounded-2xl glass-panel border border-white/10 max-w-xl mx-auto space-y-4">
          <h3 className="text-base font-bold text-white">Receive Inbound Manufacturer Consignment</h3>
          <p className="text-xs text-slate-400">
            Accepts verified batches from accredited manufacturers into your local retail ledger.
          </p>

          <form onSubmit={handleReceiveStock} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Select Inbound Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  const b = availableBatches.find((item) => item.id === e.target.value);
                  if (b) setRetailPrice(b.statutoryMrp.toString());
                }}
                className="glass-input w-full bg-slate-900"
              >
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} - {b.productName} (MRP: ${b.statutoryMrp})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Quantity Received</label>
                <input
                  type="number"
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(e.target.value)}
                  className="glass-input w-full font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Retail Selling Price ($)</label>
                <input
                  type="number"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value)}
                  className="glass-input w-full font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition mt-2 cursor-pointer"
            >
              Verify Provenance & Accept Stock
            </button>

            {receiveStatus && (
              <div className="p-2.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300">
                {receiveStatus}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
