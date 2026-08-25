import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/**
 * Hashes a plain-text password using cryptographic scrypt with a cryptographically secure random salt.
 * Result format: `scrypt$<salt_hex>$<derived_key_hex>`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

/**
 * Securely verifies a password against a stored scrypt hash using constant-time comparison
 * to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") {
      return false;
    }

    const salt = parts[1];
    const key = parts[2];
    const keyBuffer = Buffer.from(key, "hex");

    const derivedKey = (await scryptAsync(password, salt, keyBuffer.length)) as Buffer;
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy random token for password resets, email verification, and refresh tokens.
 */
export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("hex");
}

/**
 * Creates a deterministic SHA-256 hash of a token for indexing/storage.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
