/**
 * lib/server/storage.ts
 *
 * Local File Storage Engine for VeriPrice.
 * In production, swap the read/write helpers with S3/GCS/Azure Blob calls.
 * The public/private bucket concept is replicated here via directory isolation:
 *
 *   uploads/public/images/<productId>/   — Publicly viewable product images
 *   uploads/private/documents/<productId>/ — PRIVATE seller/govt compliance documents
 *
 * Private documents are NEVER served from a public path. They require a
 * time-limited signed access token verified server-side.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Logger } from "@/lib/server/logger";

const log = Logger.child("storage");

// Base upload directory (project root / uploads)
const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
const PUBLIC_IMAGES_DIR = path.join(UPLOADS_ROOT, "public", "images");
const PRIVATE_DOCS_DIR = path.join(UPLOADS_ROOT, "private", "documents");

// Ensure directories exist on startup
for (const dir of [PUBLIC_IMAGES_DIR, PRIVATE_DOCS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Image Validation Constants
// ---------------------------------------------------------------------------
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_PRODUCT = 10;

// ---------------------------------------------------------------------------
// Document Validation Constants
// ---------------------------------------------------------------------------
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
] as const;

export const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".doc", ".xlsx"] as const;
export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_DOCUMENTS_PER_PRODUCT = 20;

export const VALID_DOCUMENT_TYPES = [
  "LAB_CERTIFICATE",
  "BILL_OF_ENTRY",
  "TAX_CLEARANCE",
  "INVOICE_COPY",
  "MANUFACTURER_AUTHORIZATION",
  "QUALITY_CERTIFICATE",
  "IMPORT_LICENSE",
  "VAT_REGISTRATION",
  "FOOD_DRUG_APPROVAL",
  "OTHER",
] as const;

export type ValidDocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

// ---------------------------------------------------------------------------
// File Metadata
// ---------------------------------------------------------------------------
export interface StoredFileMetadata {
  originalName: string;
  sanitizedName: string;
  storagePath: string;      // Absolute path on disk
  storageReference: string; // Opaque reference stored in DB (relative path)
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  isPrivate: boolean;
  uploadedAt: string;
  dimensions?: { width: number; height: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generates a cryptographically random file name to prevent path traversal. */
function generateStoredFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const rand = crypto.randomBytes(16).toString("hex");
  return `${rand}${ext}`;
}

/** Sanitizes an original filename for safe display (strips path separators, etc.) */
export function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9_.\-]/g, "_").slice(0, 200);
}

/** Computes SHA-256 of a buffer for integrity verification. */
export function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/** Parses Base64-encoded file data URI, validating structure. */
export function parseBase64DataUri(dataUri: string): { buffer: Buffer; mimeType: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2], "base64");
    return { buffer, mimeType: match[1] };
  } catch {
    return null;
  }
}

/** Validates image file size and MIME type. */
export function validateImageFile(buffer: Buffer, mimeType: string, filename: string): string | null {
  if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
    return `Image exceeds maximum allowed size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`;
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as any)) {
    return `Image type '${mimeType}' is not allowed. Accepted types: ${ALLOWED_IMAGE_MIME_TYPES.join(", ")}.`;
  }
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext as any)) {
    return `Image extension '${ext}' is not allowed. Accepted extensions: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}.`;
  }
  return null;
}

/** Validates document file size and MIME type. */
export function validateDocumentFile(buffer: Buffer, mimeType: string, filename: string): string | null {
  if (buffer.byteLength > MAX_DOCUMENT_SIZE_BYTES) {
    return `Document exceeds maximum allowed size of ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB.`;
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType as any)) {
    return `Document type '${mimeType}' is not allowed. Accepted types: ${ALLOWED_DOCUMENT_MIME_TYPES.join(", ")}.`;
  }
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext as any)) {
    return `Document extension '${ext}' is not allowed. Accepted extensions: ${ALLOWED_DOCUMENT_EXTENSIONS.join(", ")}.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Image Storage
// ---------------------------------------------------------------------------

/**
 * Saves a product image to the public images directory.
 * Returns metadata for storage in the database.
 */
export async function storeProductImage(
  productId: string,
  buffer: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<StoredFileMetadata> {
  const productDir = path.join(PUBLIC_IMAGES_DIR, productId);
  if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });

  const sanitized = sanitizeFilename(originalFilename);
  const storedName = generateStoredFilename(sanitized);
  const storagePath = path.join(productDir, storedName);
  const storageReference = path.join("public", "images", productId, storedName);

  fs.writeFileSync(storagePath, buffer);
  log.info("Image stored", { storagePath, sizeBytes: buffer.byteLength });

  return {
    originalName: originalFilename,
    sanitizedName: sanitized,
    storagePath,
    storageReference,
    mimeType,
    sizeBytes: buffer.byteLength,
    sha256: computeSha256(buffer),
    isPrivate: false,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Deletes a product image from disk given its storage reference.
 */
export function deleteStoredFile(storageReference: string): boolean {
  try {
    const fullPath = path.join(UPLOADS_ROOT, storageReference);
    // Security: Ensure the resolved path is within UPLOADS_ROOT
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(UPLOADS_ROOT))) {
      log.error("Path traversal attempt blocked", { storageReference });
      return false;
    }
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
      log.info("File deleted from storage", { storageReference });
      return true;
    }
    return false;
  } catch (err) {
    log.error("Failed to delete file from storage", { err, storageReference });
    return false;
  }
}

/**
 * Reads a stored file from disk. Used for private document serving.
 */
export function readStoredFile(storageReference: string): Buffer | null {
  try {
    const fullPath = path.join(UPLOADS_ROOT, storageReference);
    const resolved = path.resolve(fullPath);
    // Security: Path traversal guard
    if (!resolved.startsWith(path.resolve(UPLOADS_ROOT))) {
      log.error("Path traversal attempt blocked on read", { storageReference });
      return null;
    }
    if (!fs.existsSync(resolved)) return null;
    return fs.readFileSync(resolved);
  } catch (err) {
    log.error("Failed to read file from storage", { err, storageReference });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Document Storage (PRIVATE)
// ---------------------------------------------------------------------------

/**
 * Saves a compliance/verification document to the PRIVATE documents directory.
 * Private documents are NEVER publicly accessible — they require a signed access token.
 */
export async function storeProductDocument(
  productId: string,
  buffer: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<StoredFileMetadata> {
  const productDir = path.join(PRIVATE_DOCS_DIR, productId);
  if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });

  const sanitized = sanitizeFilename(originalFilename);
  const storedName = generateStoredFilename(sanitized);
  const storagePath = path.join(productDir, storedName);
  const storageReference = path.join("private", "documents", productId, storedName);

  fs.writeFileSync(storagePath, buffer);
  log.info("Private document stored", { productId, sizeBytes: buffer.byteLength });

  return {
    originalName: originalFilename,
    sanitizedName: sanitized,
    storagePath,
    storageReference,
    mimeType,
    sizeBytes: buffer.byteLength,
    sha256: computeSha256(buffer),
    isPrivate: true,
    uploadedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Signed Access Tokens (for private documents)
// ---------------------------------------------------------------------------

const SIGNED_TOKEN_SECRET = process.env.JWT_SECRET || "veriprice_secure_storage_key";
const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

export interface SignedTokenPayload {
  documentId: string;
  storageReference: string;
  userId: string;
  expiresAt: number;
}

/**
 * Generates a time-limited HMAC-signed access token for a private document.
 * This token must be verified server-side before serving any private file.
 */
export function generateSignedAccessToken(
  documentId: string,
  storageReference: string,
  userId: string
): string {
  const payload: SignedTokenPayload = {
    documentId,
    storageReference,
    userId,
    expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SIGNED_TOKEN_SECRET)
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${sig}`;
}

/**
 * Verifies a signed access token and returns the payload if valid.
 * Returns null if the token is expired, tampered with, or malformed.
 */
export function verifySignedAccessToken(token: string): SignedTokenPayload | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;

    const expectedSig = crypto
      .createHmac("sha256", SIGNED_TOKEN_SECRET)
      .update(payloadB64)
      .digest("base64url");

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

    const payload: SignedTokenPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
