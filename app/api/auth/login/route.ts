/**
 * /api/auth/login — User Authentication & Session Generation
 *
 * Verifies email/password against database hashes or role authentication,
 * checks account status (ACTIVE/SUSPENDED), creates HMAC-signed session tokens,
 * and sets secure HTTP-only cookies.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword, generateSecureToken, hashToken } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/session";
import { SEED_USERS } from "@/lib/auth/mock-users";
import { loginSchema } from "@/lib/server/validators";
import { successResponse, errorResponse } from "@/lib/server/api-response";
import { Logger } from "@/lib/server/logger";
import { User, UserRole } from "@/lib/db/types";

const log = Logger.child("api/auth/login");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Validation failed", parsed.error.flatten().fieldErrors),
        { status: 422 }
      );
    }

    const { email, password, role } = parsed.data;

    let user: User | null = null;

    // 1. Try finding user by email in Prisma DB
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const dbUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { organization: true },
      });

      if (dbUser) {
        // Verify password if passwordHash exists
        if (dbUser.passwordHash && password) {
          const isValidPassword = await verifyPassword(password, dbUser.passwordHash);
          if (!isValidPassword) {
            log.warn("Failed login attempt — invalid password", { email: normalizedEmail });
            return NextResponse.json(
              errorResponse("Invalid email or password", null, "INVALID_CREDENTIALS"),
              { status: 401 }
            );
          }
        }

        // Account status check
        if (dbUser.status === "SUSPENDED") {
          log.warn("Login blocked for suspended user", { userId: dbUser.id, email: dbUser.email });
          return NextResponse.json(
            errorResponse("Your account has been suspended by the administrator.", null, "ACCOUNT_SUSPENDED"),
            { status: 403 }
          );
        }

        user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role as UserRole,
          orgId: dbUser.orgId || "org_consumer_01",
          organizationName: dbUser.organization?.name || "Independent",
          status: dbUser.status as "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION",
          designation: dbUser.designation || undefined,
          employeeCode: dbUser.employeeCode || undefined,
          createdAt: dbUser.createdAt.toISOString(),
          updatedAt: dbUser.updatedAt.toISOString(),
        };
      }
    }

    // 2. Role-based fallback (for quick portal switching / demo seeds)
    if (!user && role) {
      const matchedMock = SEED_USERS.find((u) => u.role === role);
      if (matchedMock) {
        user = matchedMock;
      }
    }

    // 3. Fallback mock email lookup
    if (!user && email) {
      const mockByEmail = SEED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (mockByEmail) {
        user = mockByEmail;
      }
    }

    if (!user) {
      return NextResponse.json(
        errorResponse("Invalid credentials or user not found", null, "USER_NOT_FOUND"),
        { status: 401 }
      );
    }

    // 4. Generate Session Token and Refresh Token
    const sessionToken = createSessionToken(user);
    const rawRefreshToken = generateSecureToken(40);

    // Save refresh token in database
    try {
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: hashToken(rawRefreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    } catch {
      // Non-blocking in fallback mock modes
    }

    log.info("User login successful", {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Centralized Audit Log for administrative and portal logins
    const isAdmin = ["SUPER_ADMIN", "ADMIN", "GOVERNMENT_OFFICIAL", "TAX_OFFICER", "AUDITOR"].includes(user.role);
    try {
      await prisma.systemAuditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          orgId: user.orgId || "org_gov_01",
          orgName: user.organizationName || "National Authority",
          action: isAdmin ? "ADMIN_LOGIN" : "USER_LOGIN",
          resourceType: "AUTH",
          resourceId: user.id,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
          status: "SUCCESS",
          details: `${isAdmin ? "Administrator" : "User"} login authenticated: '${user.name}' (${user.email}) as role '${user.role}'.`,
          metadata: JSON.stringify({ email: user.email, role: user.role }),
        },
      });
    } catch {
      // Non-blocking
    }

    const response = NextResponse.json(
      successResponse(
        {
          user,
          token: sessionToken,
          refreshToken: rawRefreshToken,
        },
        { message: "Authentication successful." }
      ),
      { status: 200 }
    );


    // Set secure HTTP-only cookies
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      ...SESSION_COOKIE_OPTIONS,
    });

    response.cookies.set({
      name: REFRESH_COOKIE_NAME,
      value: rawRefreshToken,
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    log.error("POST /api/auth/login failed", err);
    return NextResponse.json(errorResponse("Login failed due to an internal server error"), {
      status: 500,
    });
  }
}
