import { cookies } from "next/headers";
import { User, UserRole } from "@/lib/db/types";
import { SEED_USERS } from "@/lib/auth/mock-users";

export const SESSION_COOKIE_NAME = "skillhunt_session_token";

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
 * Creates a lightweight signed/encoded session token containing role and orgId
 */
export function createSessionToken(user: User): string {
  const payload: SessionData = {
    userId: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
    organizationName: user.organizationName,
    name: user.name,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * Decodes and validates session token on the server
 */
export function decodeSessionToken(token: string | undefined | null): SessionData | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const parsed: SessionData = JSON.parse(raw);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently active user on the server from cookies or headers
 */
export async function getServerSession(req?: Request): Promise<{ user: User | null; session: SessionData | null }> {
  let token: string | null = null;

  if (req) {
    // Check Authorization header first
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    // Check cookie header
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

  // Fallback to Next.js cookies() helper if no req was passed or token not found
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
    } catch {
      // In non-request contexts or static generation
      token = null;
    }
  }

  const session = decodeSessionToken(token);
  if (!session) {
    // Default fallback to CONSUMER role for public scanning convenience if unauthenticated
    return { user: null, session: null };
  }

  const user = SEED_USERS.find((u) => u.id === session.userId) || {
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    orgId: session.orgId,
    organizationName: session.organizationName,
    status: "ACTIVE",
    createdAt: new Date(session.issuedAt).toISOString(),
  };

  return { user, session };
}
