import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export async function GET() {
  const startTime = Date.now();

  let dbStatus = "HEALTHY";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.organization.count();
    dbLatencyMs = Date.now() - dbStart;
  } catch (err) {
    dbStatus = `UNHEALTHY: ${err instanceof Error ? err.message : "Connection failed"}`;
  }

  // Cryptographic Engine Verification
  let cryptoEngineStatus = "HEALTHY";
  try {
    const testHash = crypto.createHash("sha256").update("VERIPRICE_PROVENANCE_HEALTH_TEST").digest("hex");
    if (!testHash || testHash.length !== 64) {
      cryptoEngineStatus = "DEGRADED: Hash output anomaly";
    }
  } catch {
    cryptoEngineStatus = "FAILED";
  }

  const memoryUsage = process.memoryUsage();
  const totalDurationMs = Date.now() - startTime;

  const healthData = {
    status: dbStatus === "HEALTHY" && cryptoEngineStatus === "HEALTHY" ? "HEALTHY" : "DEGRADED",
    service: "VERIPRICE National Ledger Core API",
    version: "2.6.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: "SQLite / PostgreSQL (Prisma Client)",
      },
      cryptographyEngine: {
        status: cryptoEngineStatus,
        algorithms: ["SHA-256", "ECDSA-secp256k1", "HMAC-SHA256"],
      },
      memory: {
        rssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
      },
    },
    latencyMs: totalDurationMs,
  };

  const statusCode = healthData.status === "HEALTHY" ? 200 : 503;

  return NextResponse.json(healthData, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
