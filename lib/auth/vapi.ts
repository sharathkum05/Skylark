/**
 * lib/auth/vapi.ts — verify that a tool call really comes from our Vapi assistant.
 *
 * Vapi sends the token of the Custom Credential attached to each tool's server
 * (dashboard → Integrations → Server Configuration) as `Authorization: Bearer <token>`,
 * or as `X-Vapi-Secret: <token>` in legacy mode. We compare it to VAPI_SERVER_SECRET.
 */

import { safeEqual } from "./session";

export type VapiAuthResult = "ok" | "unconfigured" | "rejected";

let warnedUnconfigured = false;

export async function verifyVapiRequest(req: Request): Promise<VapiAuthResult> {
  const secret = process.env.VAPI_SERVER_SECRET;
  if (!secret) {
    // Not enforced until the secret is set, so a deploy can't silently take the
    // phone line down. Logged so the gap is visible.
    if (!warnedUnconfigured) {
      console.warn(JSON.stringify({ evt: "vapi_auth", warning: "VAPI_SERVER_SECRET not set; tool endpoint is open" }));
      warnedUnconfigured = true;
    }
    return "unconfigured";
  }

  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? req.headers.get("x-vapi-secret") ?? "";
  return token && (await safeEqual(token, secret)) ? "ok" : "rejected";
}
