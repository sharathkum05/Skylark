/**
 * lib/relay/vapi.ts — server-side Vapi config + REST helper.
 * Reads secrets from the environment; never import this into client code.
 */

export const VAPI_BASE = "https://api.vapi.ai";

export const PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY || "";
export const PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || "";

/**
 * Public https URL pointing at THIS app, so Vapi's cloud can reach the webhook.
 * In dev that's an ngrok tunnel; in prod it's your deploy URL.
 */
export const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/$/, "");

export function isConfigured(): boolean {
  return Boolean(PRIVATE_KEY && PHONE_NUMBER_ID && PUBLIC_URL);
}

export function webhookUrl(): string {
  return `${PUBLIC_URL}/api/vapi-webhook`;
}

/** POST to the Vapi REST API with the private key. Throws on non-2xx. */
export async function vapiPost(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) throw new Error(`Vapi ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
