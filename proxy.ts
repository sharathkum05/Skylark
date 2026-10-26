/**
 * proxy.ts — admin gate for the owner dashboard and its data APIs.
 * The Vapi tool endpoint (/api/vapi-inbound-tool) is deliberately NOT matched.
 */

import { type NextRequest, NextResponse } from "next/server";

import { authMode, isValidSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function proxy(req: NextRequest) {
  const mode = authMode();
  if (mode === "open") return NextResponse.next();

  const ok =
    mode === "enabled" && (await isValidSession(req.cookies.get(SESSION_COOKIE)?.value));
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/dashboard/:path*",
    "/api/demo-confirmations",
    "/demo/confirmations",
  ],
};
