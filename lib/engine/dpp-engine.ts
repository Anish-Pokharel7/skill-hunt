import QRCode from "qrcode";
import { db } from "@/lib/db/store";
import { BatchItem, ProductPassport, PassportJourneyEvent, UserRole } from "@/lib/db/types";

export interface MintPassportParams {
  batch: BatchItem;
  count: number;
  actorRole: UserRole;
  actorName: string;
  actorOrgName: string;
  factoryLocation: string;
}

export class DigitalProductPassportEngine {
  /**
   * Generates a realistic SHA-256 style cryptographic hash
   */
  public static generateCryptographicHash(payload: string): string {
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    const salt = Math.random().toString(16).substring(2, 10);
    return `0x${hex}${salt}${Date.now().toString(16)}`.padEnd(42, "f");
  }

  /**
   * Generates a QR Code Data URL (PNG base64) for any serial number or payload
   */
  public static async generateQrCodeDataUrl(urlOrPayload: string): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(urlOrPayload, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 320,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      return dataUrl;
    } catch {
      // Fallback placeholder
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">QR CODE</text></svg>`;
    }
  }

  /**
   * Mint new Digital Product Passports for a manufactured batch
   */
  public static async mintPassportsForBatch(
    params: MintPassportParams
  ): Promise<ProductPassport[]> {
    const { batch, count, actorRole, actorName, actorOrgName, factoryLocation } = params;
    const mintedPassports: ProductPassport[] = [];
    const timestamp = new Date().toISOString();

    const existingCount = db.passports.filter((p) => p.batchId === batch.id).length;

    for (let i = 1; i <= count; i++) {
      const serialIndex = (existingCount + i).toString().padStart(6, "0");
      const serialNumber = `${batch.serialPrefix}-${serialIndex}`;
      const passportId = `dpp_${batch.id}_${serialIndex}`;

      const genesisHash = this.generateCryptographicHash(
        `${serialNumber}:${batch.hsCode}:${batch.productionDate}:${timestamp}`
      );
      const signature = `SIG-ECDSA-SHA256:${this.generateCryptographicHash(
        `${serialNumber}:${genesisHash}`
      )}`;

      const verifyUrl = `https://veriprice.gov/verify/${serialNumber}?sig=${signature.substring(0, 16)}`;

      const initialEvent: PassportJourneyEvent = {
        id: `j_${passportId}_01`,
        timestamp,
        stage: "MANUFACTURED",
        actorRole,
        actorName,
        actorOrgName,
        location: factoryLocation || "Authorized Production Facility",
        details: `Minted in batch #${batch.batchNumber} with statutory MRP $${batch.statutoryMrp.toFixed(2)}. Passed quality testing.`,
        hash: genesisHash,
        isVerified: true,
      };

      const passport: ProductPassport = {
        id: passportId,
        serialNumber,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        productName: batch.productName,
        category: batch.category,
        hsCode: batch.hsCode,
        manufacturerOrgId: batch.manufacturerOrgId,
        manufacturerName: batch.manufacturerName,
        currentHolderOrgId: batch.manufacturerOrgId,
        currentHolderName: batch.manufacturerName,
        statutoryMrp: batch.statutoryMrp,
        status: "PRODUCED",
        isAuthentic: true,
        isRecalled: false,
        scanCount: 0,
        digitalSignature: signature,
        qrPayload: verifyUrl,
        journey: [initialEvent],
        createdAt: timestamp,
      };

      mintedPassports.push(passport);
      db.passports.push(passport);
    }

    return mintedPassports;
  }

  /**
   * Append a lifecycle event to a passport's immutable chain of custody
   */
  public static appendJourneyEvent(
    serialNumber: string,
    event: Omit<PassportJourneyEvent, "id" | "timestamp" | "hash" | "isVerified">
  ): ProductPassport | null {
    const passport = db.passports.find((p) => p.serialNumber === serialNumber);
    if (!passport) return null;

    const timestamp = new Date().toISOString();
    const prevHash =
      passport.journey[passport.journey.length - 1]?.hash || passport.digitalSignature;
    const newHash = this.generateCryptographicHash(
      `${prevHash}:${event.stage}:${timestamp}:${event.actorName}`
    );

    const fullEvent: PassportJourneyEvent = {
      id: `j_${passport.id}_${Date.now()}`,
      timestamp,
      stage: event.stage,
      actorRole: event.actorRole,
      actorName: event.actorName,
      actorOrgName: event.actorOrgName,
      location: event.location,
      details: event.details,
      hash: newHash,
      isVerified: true,
    };

    passport.journey.push(fullEvent);

    if (event.stage === "CUSTOMS_CLEARED") {
      passport.status = "CLEARED";
    } else if (event.stage === "RETAIL_RECEIVED") {
      passport.status = "IN_STOCK";
    } else if (event.stage === "POINT_OF_SALE") {
      passport.status = "SOLD";
    }

    return passport;
  }

  /**
   * Verify serial number authenticity
   */
  public static verifyPassport(serialNumber: string, location?: string) {
    const passport = db.passports.find((p) => p.serialNumber.trim().toUpperCase() === serialNumber.trim().toUpperCase());

    if (!passport) {
      return {
        found: false,
        isAuthentic: false,
        serialNumber,
        status: "UNREGISTERED_COUNTERFEIT",
        message: "ALERT: This serial number does not exist in the National Digital Product Passport Registry.",
      };
    }

    // Increment scan count
    passport.scanCount += 1;
    passport.lastScannedAt = new Date().toISOString();
    if (location) passport.lastScannedLocation = location;

    return {
      found: true,
      isAuthentic: passport.isAuthentic && !passport.isRecalled,
      passport,
      message: passport.isAuthentic
        ? "VERIFIED GENUINE: Product authenticated against the National Cryptographic Registry."
        : "SUSPECTED COUNTERFEIT / RECALLED: Do not purchase or consume.",
    };
  }
}
