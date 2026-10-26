/**
 * POST /api/auth/login — exchange admin credentials for a session cookie
 * DELETE /api/auth/login — sign out
 */

import { NextResponse } from "next/server";

import {
  authMode,
  checkCredentials,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (authMode() === "locked") {
    return NextResponse.json(
      { error: "Admin login is not configured. Set ADMIN_PASSWORD in the deployment." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const username = String(body?.username ?? "");
  const password = String(body?.password ?? "");

  if (!(await checkCredentials(username, password))) {
    // Slow down guessing a little without blocking legitimate retries.
    await new Promise((r) => setTimeout(r, 600));
    console.warn(JSON.stringify({ evt: "admin_login", ok: false }));
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }

  console.log(JSON.stringify({ evt: "admin_login", ok: true }));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
