/**
 * lib/auth/session.ts — admin login for the owner dashboard.
 *
 * Credentials come from env (ADMIN_USERNAME / ADMIN_PASSWORD), never the repo.
 * A session is an HMAC-signed, expiring cookie; Web Crypto keeps it usable from proxy.ts.
 */

export const SESSION_COOKIE = "skylark_admin";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

export type AuthMode = "enabled" | "open" | "locked";

/**
 * enabled — ADMIN_PASSWORD is set; a valid session is required.
 * open    — local dev with no password configured; dashboard stays reachable.
 * locked  — deployed with no password configured; fail closed.
 */
export function authMode(): AuthMode {
  if (process.env.ADMIN_PASSWORD) return "enabled";
  return process.env.VERCEL ? "locked" : "open";
}

export function adminUsername(): string {
  return process.env.ADMIN_USERNAME || "admin";
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || `skylark:${process.env.ADMIN_PASSWORD ?? ""}`;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

/** Constant-time string comparison (both sides hashed first so lengths match). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

export async function checkCredentials(username: string, password: string): Promise<boolean> {
  if (authMode() !== "enabled") return false;
  const [userOk, passOk] = await Promise.all([
    safeEqual(username, adminUsername()),
    safeEqual(password, process.env.ADMIN_PASSWORD!),
  ]);
  return userOk && passOk;
}

/** `<username>.<expiresAtMs>.<signature>` */
export async function createSessionToken(): Promise<string> {
  const payload = `${adminUsername()}.${Date.now() + SESSION_TTL_SECONDS * 1000}`;
  return `${payload}.${await sign(payload)}`;
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const cut = token.lastIndexOf(".");
  if (cut < 0) return false;
  const payload = token.slice(0, cut);
  const expires = Number(payload.slice(payload.lastIndexOf(".") + 1));
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  return safeEqual(token.slice(cut + 1), await sign(payload));
}
