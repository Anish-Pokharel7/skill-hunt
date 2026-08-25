/**
 * lib/server/product-history.ts
 *
 * Automated Product Change Audit & History Logging System.
 * Records granular, immutable change entries whenever product attributes are modified.
 */

import { prisma } from "@/lib/db/prisma";
import { ProductHistoryChangeType } from "@/lib/db/types";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("product-history");

export interface ProductHistoryEntry {
  productId: string;
  changeType: ProductHistoryChangeType | string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedByUserId: string;
  changedByName: string;
  changedByRole: string;
  reason?: string | null;
  metadata?: string | null;
}

/**
 * Persists a single history record into the database.
 */
export async function createProductHistoryEntry(entry: ProductHistoryEntry) {
  try {
    return await prisma.productHistory.create({
      data: {
        productId: entry.productId,
        changeType: entry.changeType,
        fieldName: entry.fieldName,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        changedByUserId: entry.changedByUserId,
        changedByName: entry.changedByName,
        changedByRole: entry.changedByRole,
        reason: entry.reason ?? null,
        metadata: entry.metadata ?? null,
      },
    });
  } catch (err) {
    log.error("Failed to create product history entry", { err, entry });
    return null;
  }
}

/**
 * Compares an existing product snapshot against incoming changes and creates
 * individual history records for every modified field.
 */
export async function recordProductFieldDiffs({
  productId,
  oldProduct,
  updatedData,
  user,
  reason,
  metadata,
}: {
  productId: string;
  oldProduct: Record<string, any>;
  updatedData: Record<string, any>;
  user: { id: string; name: string; role: string };
  reason?: string | null;
  metadata?: Record<string, any> | null;
}) {
  const historyEntries: ProductHistoryEntry[] = [];
  const metaString = metadata ? JSON.stringify(metadata) : null;

  for (const [key, newVal] of Object.entries(updatedData)) {
    if (newVal === undefined) continue;

    const oldVal = oldProduct[key];

    // Skip if unchanged (handling null/undefined/dates/numbers)
    if (oldVal === newVal) continue;
    if (oldVal instanceof Date && newVal instanceof Date && oldVal.getTime() === newVal.getTime()) continue;
    if (String(oldVal ?? "") === String(newVal ?? "")) continue;

    // Determine changeType & formatting
    let changeType: ProductHistoryChangeType = "FIELD_UPDATE";
    let formattedOld: string | null = oldVal !== null && oldVal !== undefined ? String(oldVal) : null;
    let formattedNew: string | null = newVal !== null && newVal !== undefined ? String(newVal) : null;

    if (key === "consumerPrice" || key === "actualCost") {
      changeType = "PRICE_CHANGE";
      const currency = oldProduct.currency || "NPR";
      formattedOld = oldVal !== null && oldVal !== undefined ? `${currency} ${Number(oldVal).toLocaleString()}` : null;
      formattedNew = newVal !== null && newVal !== undefined ? `${currency} ${Number(newVal).toLocaleString()}` : null;
    } else if (key === "sellerId") {
      changeType = "SELLER_CHANGE";
    } else if (key === "verificationStatus") {
      changeType = "STATUS_CHANGE";
    } else if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
      changeType = "ADMIN_OVERRIDE";
    } else if (["brand", "model", "countryOfOrigin", "originType", "isNepalManufactured", "vatRate"].includes(key)) {
      changeType = "SPEC_UPDATE";
    }

    historyEntries.push({
      productId,
      changeType,
      fieldName: key,
      oldValue: formattedOld,
      newValue: formattedNew,
      changedByUserId: user.id,
      changedByName: user.name,
      changedByRole: user.role,
      reason: reason || (changeType === "PRICE_CHANGE" ? "Price revision" : "Product update"),
      metadata: metaString,
    });
  }

  if (historyEntries.length === 0) return [];

  // Batch insert history records
  await prisma.productHistory.createMany({
    data: historyEntries.map((e) => ({
      productId: e.productId,
      changeType: e.changeType,
      fieldName: e.fieldName,
      oldValue: e.oldValue ?? null,
      newValue: e.newValue ?? null,
      changedByUserId: e.changedByUserId,
      changedByName: e.changedByName,
      changedByRole: e.changedByRole,
      reason: e.reason ?? null,
      metadata: e.metadata ?? null,
    })),
  });

  log.info("Recorded product history diffs", {
    productId,
    changedFieldsCount: historyEntries.length,
    changedBy: user.id,
  });

  return historyEntries;
}
