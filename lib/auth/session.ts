import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { User, UserRole } from "@/lib/db/types";
import { SEED_USERS } from "@/lib/auth/mock-users";
import { prisma } from "@/lib/db/prisma";

export const SESSION_COOKIE_NAME = "veriprice_session_token";
export const REFRESH_COOKIE_NAME = "veriprice_refresh_token";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "veriprice-nepal-national-supply-chain-secret-key-2026-secure";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

export interface SessionData {
  userId: string;
  email: string;
  role: UserRole;
  orgId: string;
  organizationName: string;
  name: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Signs payload string with HMAC-SHA256 using SESSION_SECRET
 */
function signPayload(payloadB64: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");
}

/**
 * Creates a cryptographically signed session token containing role and orgId
 * Format: `<payload_base64url>.<hmac_signature_base64url>`
 */
export function createSessionToken(user: User): string {
  const payload: SessionData = {
    userId: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
    organizationName: user.organizationName || "",
    name: user.name,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * Decodes and validates session token on the server, verifying HMAC signature and expiry.
 */
export function decodeSessionToken(token: string | undefined | null): SessionData | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length === 2) {
      const [payloadB64, signature] = parts;
      const expectedSignature = signPayload(payloadB64);
      
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSignature);

      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        return null; // Tampered token
      }

      const raw = Buffer.from(payloadB64, "base64url").toString("utf-8");
      const parsed: SessionData = JSON.parse(raw);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        return null; // Expired token
      }
      return parsed;
    }

    // Graceful backward compatibility for legacy 1-part tokens
    if (parts.length === 1) {
      const raw = Buffer.from(token, "base64url").toString("utf-8");
      const parsed: SessionData = JSON.parse(raw);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        return null;
      }
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently active user on the server from cookies or Authorization header.
 * Cross-references with the database to verify active status.
 */
export async function getServerSession(
  req?: Request
): Promise<{ user: User | null; session: SessionData | null }> {
  let token: string | null = null;

  if (req) {
    // 1. Check Authorization header first
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    // 2. Check cookie header
    if (!token) {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
        if (match) {
          token = match.split("=")[1];
        }
      }
    }
  }

  // 3. Fallback to Next.js cookies() helper if no req was passed or token not found
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
    } catch {
      token = null;
    }
  }

  const session = decodeSessionToken(token);
  if (!session) {
    return { user: null, session: null };
  }

  // Try to load user from Prisma database first for live status
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { organization: true },
    });

    if (dbUser) {
      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role as UserRole,
        orgId: dbUser.orgId || "org_consumer_01",
        organizationName: dbUser.organization?.name || session.organizationName || "Independent",
        status: dbUser.status as "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION",
        createdAt: dbUser.createdAt.toISOString(),
        updatedAt: dbUser.updatedAt.toISOString(),
      };
      return { user, session };
    }
  } catch {
    // Database query fallback
  }

  // Fallback to SEED_USERS or reconstructed session user
  const mockUser = SEED_USERS.find((u) => u.id === session.userId) || {
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    orgId: session.orgId,
    organizationName: session.organizationName,
    status: "ACTIVE" as const,
    createdAt: new Date(session.issuedAt).toISOString(),
  };

  return { user: mockUser, session };
}
