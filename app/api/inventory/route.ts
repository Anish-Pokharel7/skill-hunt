import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { db } from "@/lib/db/store";
import { TaxAndPriceEngine } from "@/lib/engine/tax-engine";
import { BusinessInventoryItem } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  let items: BusinessInventoryItem[] = [];

  if (user.role === "BUSINESS_OWNER" || user.role === "BUSINESS_EMPLOYEE") {
    items = db.inventory.filter((inv) => inv.businessOrgId === user.orgId);
  } else {
    // Oversight roles can view all inventory
    items = db.inventory;
  }

  return NextResponse.json({
    success: true,
    total: items.length,
    inventory: items,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRoles(["BUSINESS_OWNER", "BUSINESS_EMPLOYEE", "SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  try {
    const body = await req.json();
    const { batchId, quantity = 100, unitCost, retailPrice } = body;

    const batch = db.batches.find((b) => b.id === batchId);
    if (!batch) {
      return NextResponse.json({ error: "Invalid batch ID or batch not found" }, { status: 404 });
    }

    const price = Number(retailPrice || batch.statutoryMrp);
    const cost = Number(unitCost || batch.baseCost * 1.15);

    // Validate MRP and Price Gouging
    const priceCheck = TaxAndPriceEngine.validatePriceCompliance(
      batch.hsCode,
      price,
      cost,
      batch.statutoryMrp
    );

    const existingItem = db.inventory.find(
      (inv) => inv.businessOrgId === user.orgId && inv.batchId === batch.id
    );

    if (existingItem) {
      existingItem.stockQuantity += Number(quantity);
      existingItem.retailPrice = price;
      existingItem.isPriceCompliant = priceCheck.isCompliant;
      existingItem.lastRestockedAt = new Date().toISOString();

      return NextResponse.json({
        success: true,
        item: existingItem,
        priceCompliance: priceCheck,
        message: `Inventory updated for ${batch.productName}. Total stock: ${existingItem.stockQuantity}.`,
      });
    }

    const newItem: BusinessInventoryItem = {
      id: `inv_item_${Date.now()}`,
      businessOrgId: user.orgId,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productName: batch.productName,
      category: batch.category,
      hsCode: batch.hsCode,
      sku: `SKU-${batch.category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      stockQuantity: Number(quantity),
      unitCost: cost,
      retailPrice: price,
      statutoryMrp: batch.statutoryMrp,
      isPriceCompliant: priceCheck.isCompliant,
      lastRestockedAt: new Date().toISOString(),
      supplierOrgName: batch.manufacturerName,
    };

    db.inventory.unshift(newItem);

    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      orgId: user.orgId,
      orgName: user.organizationName,
      action: "RECEIVE_INBOUND_BATCH_STOCK",
      resourceType: "BATCH",
      resourceId: batch.id,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Stocked ${quantity} units of batch ${batch.batchNumber}. Retail price: $${price}.`,
    });

    return NextResponse.json({
      success: true,
      item: newItem,
      priceCompliance: priceCheck,
      message: `Inbound batch received and stocked successfully!`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to receive inventory", message: errorMessage },
      { status: 500 }
    );
  }
}
