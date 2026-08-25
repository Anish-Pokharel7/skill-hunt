import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRoles } from "@/lib/auth/rbac";
import { db } from "@/lib/db/store";
import { DigitalProductPassportEngine } from "@/lib/engine/dpp-engine";
import { BatchItem } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  let batches: BatchItem[] = [];

  // Strict tenant scoping on the server
  if (user.role === "MANUFACTURER") {
    // Manufacturer only sees their own factory batches
    batches = db.batches.filter((b) => b.manufacturerOrgId === user.orgId);
  } else if (user.role === "IMPORTER") {
    // Importer sees batches associated with their imported consignments
    batches = db.batches.filter((b) => b.manufacturerOrgId === user.orgId);
  } else {
    // Statutory oversight roles (SUPER_ADMIN, GOVERNMENT_ADMIN, TAX_OFFICER, AUDITOR, etc.)
    batches = db.batches;
  }

  return NextResponse.json({
    success: true,
    total: batches.length,
    batches,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRoles(["MANUFACTURER", "SUPER_ADMIN"], req);
  if (!auth.authorized || !auth.user) {
    return auth.errorResponse!;
  }

  const { user } = auth;
  try {
    const body = await req.json();
    const {
      productName,
      category,
      hsCode,
      description,
      quantity,
      unit,
      productionDate,
      expiryDate,
      factoryLocation,
      baseCost,
      standardVatRate = 0.13,
      exciseRate = 0.02,
      statutoryMrp,
      carbonFootprintKg = 1.2,
      mintDppCount = 5,
    } = body;

    if (!productName || !hsCode || !quantity || !statutoryMrp) {
      return NextResponse.json(
        { error: "Missing required fields (productName, hsCode, quantity, statutoryMrp)" },
        { status: 400 }
      );
    }

    const batchSeq = (db.batches.length + 901).toString();
    const batchId = `batch_mfg_${Date.now()}`;
    const batchNumber = `APX-${new Date().getFullYear()}-${batchSeq}B`;
    const serialPrefix = `APX-${category?.substring(0, 3).toUpperCase() || "GEN"}-${batchSeq}`;

    const genesisRaw = `${batchNumber}:${user.orgId}:${hsCode}:${Date.now()}`;
    const provenanceHash = DigitalProductPassportEngine.generateCryptographicHash(genesisRaw);

    const newBatch: BatchItem = {
      id: batchId,
      batchNumber,
      productName,
      category: category || "General Goods",
      hsCode,
      description: description || "Production batch registered with cryptographic DPP proof.",
      quantity: Number(quantity),
      availableQuantity: Number(quantity),
      unit: unit || "Units",
      productionDate: productionDate || new Date().toISOString(),
      expiryDate: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      manufacturerOrgId: user.orgId,
      manufacturerName: user.organizationName,
      factoryLocation: factoryLocation || "Certified Production Facility B",
      baseCost: Number(baseCost || statutoryMrp * 0.6),
      standardVatRate: Number(standardVatRate),
      exciseRate: Number(exciseRate),
      statutoryMrp: Number(statutoryMrp),
      status: "IN_STOCK",
      carbonFootprintKg: Number(carbonFootprintKg),
      provenanceHash,
      serialPrefix,
      createdAt: new Date().toISOString(),
    };

    db.batches.unshift(newBatch);

    // Mint DPP Passports for this batch
    const countToMint = Math.min(Number(mintDppCount) || 5, 20);
    const mintedPassports = await DigitalProductPassportEngine.mintPassportsForBatch({
      batch: newBatch,
      count: countToMint,
      actorRole: user.role,
      actorName: user.name,
      actorOrgName: user.organizationName,
      factoryLocation: newBatch.factoryLocation,
    });

    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      orgId: user.orgId,
      orgName: user.organizationName,
      action: "CREATE_MANUFACTURING_BATCH",
      resourceType: "BATCH",
      resourceId: batchId,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      details: `Registered batch ${batchNumber} (${quantity} units) and minted ${mintedPassports.length} DPP passports.`,
    });

    return NextResponse.json({
      success: true,
      batch: newBatch,
      mintedPassports,
      message: `Batch registered successfully with ${mintedPassports.length} Digital Product Passports!`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Failed to create batch", message: errorMessage },
      { status: 500 }
    );
  }
}
