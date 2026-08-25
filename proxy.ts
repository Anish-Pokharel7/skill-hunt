import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "veriprice_session_token";

// Define portal role requirements
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/admin": ["SUPER_ADMIN", "ADMIN", "GOVERNMENT_OFFICIAL"],
  "/tax-engine": ["SUPER_ADMIN", "ADMIN", "TAX_OFFICER", "AUDITOR"],
  "/fraud-desk": ["SUPER_ADMIN", "ADMIN", "GOVERNMENT_OFFICIAL", "TAX_OFFICER"],
  "/manufacturer": ["MANUFACTURER", "SUPER_ADMIN", "ADMIN"],
  "/importer": ["IMPORTER", "SUPER_ADMIN", "ADMIN"],
  "/business": ["SELLER", "BUSINESS_EMPLOYEE", "ADMIN", "SUPER_ADMIN"],
  "/reports": ["AUDITOR", "ADMIN", "TAX_OFFICER", "SUPER_ADMIN"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check if the current route matches any protected portal prefix
  const matchedRoute = Object.keys(PROTECTED_ROUTES).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!matchedRoute) {
    // Route is public
    return NextResponse.next();
  }

  // 2. Extract session token from cookie or Authorization header
  const token =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")?.substring(7)
      : null);

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Decode session token (extract payload without Node-only crypto in Edge)
  try {
    const payloadPart = token.split(".")[0];
    const raw = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
    const session = JSON.parse(raw);

    // Check expiration
    if (session.expiresAt && Date.now() > session.expiresAt) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("expired", "1");
      return NextResponse.redirect(loginUrl);
    }

    // Role-based portal authorization check
    const allowedRoles = PROTECTED_ROUTES[matchedRoute];
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      // Forbidden: redirect to general dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Pass user context to downstream handlers via headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", session.userId);
    requestHeaders.set("x-user-role", session.role);
    requestHeaders.set("x-user-org", session.orgId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    // Malformed token
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export default proxy;

export const config = {
  matcher: [
    "/admin/:path*",
    "/tax-engine/:path*",
    "/fraud-desk/:path*",
    "/manufacturer/:path*",
    "/importer/:path*",
    "/business/:path*",
    "/reports/:path*",
  ],
};
