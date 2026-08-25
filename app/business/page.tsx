"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { BusinessInventoryItem, BatchItem } from "@/lib/db/types";
import {
  Store,
  ShoppingCart,
  Receipt,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Trash2,
} from "lucide-react";
import Link from "next/link";

export default function BusinessPortalPage() {
  const { user, role, loginAsRole } = useAuth();
  const [inventory, setInventory] = useState<BusinessInventoryItem[]>([]);
  const [availableBatches, setAvailableBatches] = useState<BatchItem[]>([]);
  const [activeTab, setActiveTab] = useState<"inventory" | "pos" | "receive">("inventory");

  // Inbound Stock State
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
        setReceiveStatus("Inbound batch verified and stocked successfully.");
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
    setPosStatus("Issuing official fiscal e-invoice...");
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
          setPosStatus(`FLAGGED: Invoice ${data.invoice.invoiceNumber} recorded with Price Gouging Violation.`);
        } else {
          setPosStatus(`Success: Fiscal Invoice ${data.invoice.invoiceNumber} registered with IRN.`);
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
      <div className="max-w-2xl mx-auto my-12 p-8 rounded gov-card text-center space-y-4 border border-[#e5e2da]">
        <div className="w-10 h-10 rounded bg-[#fbeeed] text-[#8c322c] mx-auto flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-[#181c1a]">403 Forbidden: Business License Required</h2>
        <p className="text-xs text-[#4c5850]">
          The <strong>Business & POS Portal</strong> requires <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#1b4332]">BUSINESS_OWNER</code> or <code className="bg-[#f3f1ec] px-1.5 py-0.5 rounded text-[#1b4332]">BUSINESS_EMPLOYEE</code>.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => loginAsRole("BUSINESS_OWNER")}
            className="px-4 py-2 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition"
          >
            Switch to Business Owner (Kavita)
          </button>
          <button
            onClick={() => loginAsRole("BUSINESS_EMPLOYEE")}
            className="px-4 py-2 rounded bg-[#f3f1ec] hover:bg-[#eaf0ec] text-[#1b4332] font-semibold text-xs border border-[#cad2c5] transition"
          >
            Switch to Cashier (Rohan)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#e5e2da]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#181c1a]">Metro Retail Distribution & POS Terminal</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
              {role === "BUSINESS_EMPLOYEE" ? "Scoped POS Cashier" : "Business Owner"}
            </span>
          </div>
          <p className="text-xs text-[#65736a] mt-0.5">
            {user?.organizationName} &bull; Tax PIN: <code className="text-[#1b4332] font-mono">BIZ-VAT-8823104</code>
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-[#ffffff] p-1 rounded border border-[#e5e2da] text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "inventory" ? "bg-[#1b4332] text-white font-semibold" : "text-[#4c5850] hover:text-[#181c1a]"
            }`}
          >
            Store Inventory
          </button>
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-3 py-1.5 rounded transition ${
              activeTab === "pos" ? "bg-[#1b4332] text-white font-semibold" : "text-[#4c5850] hover:text-[#181c1a]"
            }`}
          >
            Point of Sale (POS)
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveTab("receive")}
              className={`px-3 py-1.5 rounded transition ${
                activeTab === "receive" ? "bg-[#1b4332] text-white font-semibold" : "text-[#4c5850] hover:text-[#181c1a]"
              }`}
            >
              Inbound Stock In
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Inventory */}
      {activeTab === "inventory" && (
        <div className="p-5 rounded gov-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
              <Store className="w-4 h-4 text-[#1b4332]" />
              Store Inventory & Statutory Price Compliance
            </h3>
            <span className="text-xs text-[#65736a] font-mono">{inventory.length} Stock Units</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#e5e2da]">
              <thead className="bg-[#f8f7f4] border-b border-[#e5e2da] text-[#4c5850] font-mono">
                <tr>
                  <th className="py-2 px-3">SKU / Item</th>
                  <th className="py-2 px-3">Batch Reference</th>
                  <th className="py-2 px-3">In Stock</th>
                  {isOwner && <th className="py-2 px-3">Wholesale Cost</th>}
                  <th className="py-2 px-3">Retail Price</th>
                  <th className="py-2 px-3">Statutory MRP</th>
                  <th className="py-2 px-3">Compliance</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e2da] text-[#333d37]">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8f7f4] transition">
                    <td className="py-2.5 px-3 font-semibold text-[#181c1a]">
                      <div>{item.productName}</div>
                      <div className="text-[10px] text-[#65736a] font-mono">{item.sku} ({item.hsCode})</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#1b4332]">{item.batchNumber}</td>
                    <td className="py-2.5 px-3 font-mono font-bold">{item.stockQuantity}</td>
                    {isOwner && <td className="py-2.5 px-3 font-mono text-[#65736a]">${item.unitCost}</td>}
                    <td className="py-2.5 px-3 font-mono font-bold text-[#181c1a]">${item.retailPrice}</td>
                    <td className="py-2.5 px-3 font-mono text-[#1b4332]">${item.statutoryMrp}</td>
                    <td className="py-2.5 px-3">
                      {item.isPriceCompliant ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]">
                          MRP COMPLIANT
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]">
                          OVERCHARGED
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => {
                          addToCart(item);
                          setActiveTab("pos");
                        }}
                        className="px-2.5 py-1 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-[11px] inline-flex items-center gap-1 transition"
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

      {/* Tab 2: POS Checkout */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catalog (2 Cols) */}
          <div className="lg:col-span-2 p-5 rounded gov-card space-y-3">
            <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-[#1b4332]" />
              Select Products for Checkout
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-3 rounded bg-[#f8f7f4] hover:bg-[#ffffff] border border-[#e5e2da] hover:border-[#1b4332] transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[#181c1a]">{item.productName}</h4>
                    <div className="text-[10px] text-[#65736a] font-mono mt-0.5">
                      Batch: {item.batchNumber} | Stock: {item.stockQuantity}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#e5e2da] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#181c1a] font-bold">${item.retailPrice}</span>
                    <span className="text-[#1b4332] text-[11px]">MRP: ${item.statutoryMrp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart & IRN Receipt (1 Col) */}
          <div className="p-5 rounded gov-card space-y-3">
            <h3 className="text-sm font-bold text-[#181c1a] flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#1b4332]" />
              Point of Sale Register
            </h3>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] text-[#65736a] mb-1">Customer / Entity Name</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="gov-input w-full text-xs"
                />
              </div>

              {/* Cart Items */}
              <div className="border-t border-b border-[#e5e2da] py-2 space-y-2 max-h-48 overflow-y-auto text-xs">
                {cart.length === 0 ? (
                  <p className="text-[#65736a] text-center py-4">Register is empty. Click an item to add.</p>
                ) : (
                  cart.map((c) => {
                    const isOverMrp = c.salePrice > c.item.statutoryMrp;
                    return (
                      <div key={c.item.id} className="p-2 rounded bg-[#f8f7f4] border border-[#e5e2da] space-y-1">
                        <div className="flex items-center justify-between font-medium text-[#181c1a]">
                          <span>{c.item.productName}</span>
                          <button
                            onClick={() => removeFromCart(c.item.id)}
                            className="text-[#65736a] hover:text-[#8c322c]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#65736a]">Qty: {c.quantity}</span>
                          <div className="flex items-center gap-1 font-mono">
                            <span>Price $:</span>
                            <input
                              type="number"
                              value={c.salePrice}
                              onChange={(e) => updateCartPrice(c.item.id, Number(e.target.value))}
                              className={`w-16 px-1 py-0.5 rounded bg-white text-right font-mono border ${
                                isOverMrp ? "border-[#8c322c] text-[#8c322c] font-bold" : "border-[#d2cebf] text-[#181c1a]"
                              }`}
                            />
                          </div>
                        </div>
                        {isOverMrp && (
                          <div className="text-[10px] text-[#8c322c] font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Gouging Alert: Exceeds MRP ${c.item.statutoryMrp}!
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div>
                <label className="block text-[11px] text-[#65736a] mb-1">Settlement Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="gov-input w-full text-xs"
                >
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash Currency</option>
                  <option value="DIGITAL_WALLET">Digital Wallet (Gov Pay)</option>
                </select>
              </div>

              <button
                onClick={handlePosCheckout}
                disabled={cart.length === 0}
                className="w-full py-2 rounded bg-[#1b4332] hover:bg-[#143621] disabled:bg-[#f3f1ec] disabled:text-[#8c9890] text-white font-semibold text-xs transition cursor-pointer"
              >
                Issue 13% Fiscal Tax Invoice
              </button>

              {posStatus && (
                <div
                  className={`p-2 rounded text-xs font-semibold ${
                    posStatus.includes("FLAGGED")
                      ? "bg-[#fbeeed] text-[#8c322c] border border-[#f2cfcd]"
                      : "bg-[#eaf0ec] text-[#1b4332] border border-[#cad2c5]"
                  }`}
                >
                  {posStatus}
                </div>
              )}

              {lastIssuedInvoice && (
                <div className="p-3 rounded bg-[#f8f7f4] border border-[#cad2c5] text-xs space-y-1">
                  <span className="text-[10px] font-mono text-[#1b4332] uppercase font-bold block">IRN Tax Stamp</span>
                  <div className="font-mono text-[#181c1a] font-bold">{lastIssuedInvoice.invoiceNumber}</div>
                  <div className="text-[10px] font-mono text-[#65736a] break-all">{lastIssuedInvoice.irn}</div>
                  <Link
                    href={`/invoices`}
                    className="text-[#1b4332] hover:underline text-[11px] font-semibold block pt-1"
                  >
                    View Official Printable Tax Receipt &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Receive Inbound */}
      {activeTab === "receive" && isOwner && (
        <div className="p-6 rounded gov-card max-w-xl mx-auto space-y-4">
          <h3 className="text-sm font-bold text-[#181c1a]">Accept Manufacturer Stock into Store Inventory</h3>
          <p className="text-xs text-[#65736a]">
            Validates cryptographic provenance before stocking items into local register.
          </p>

          <form onSubmit={handleReceiveStock} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#333d37] font-medium mb-1">Select Batch Consignment</label>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  const b = availableBatches.find((item) => item.id === e.target.value);
                  if (b) setRetailPrice(b.statutoryMrp.toString());
                }}
                className="gov-input w-full font-mono"
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
                <label className="block text-[#333d37] font-medium mb-1">Quantity Received</label>
                <input
                  type="number"
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(e.target.value)}
                  className="gov-input w-full font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[#333d37] font-medium mb-1">Retail Selling Price ($)</label>
                <input
                  type="number"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value)}
                  className="gov-input w-full font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded bg-[#1b4332] hover:bg-[#143621] text-white font-semibold text-xs transition mt-2 cursor-pointer"
            >
              Verify Provenance & Stock Inventory
            </button>

            {receiveStatus && (
              <div className="p-2 rounded text-xs font-semibold bg-[#eaf0ec] text-[#1b4332]">
                {receiveStatus}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
