/**
 * provision-phone.mjs — mint a Vapi phone number for Skylark to call FROM.
 * ------------------------------------------------------------------
 * Outbound calls need a `phoneNumberId`. This buys a free Vapi-managed US
 * number and prints its id, which you paste into .env.local as
 * VAPI_PHONE_NUMBER_ID. No assistant is attached — Skylark passes its assistant
 * inline on every /call, so one number serves every task.
 *
 * USAGE:
 *   1. Put your PRIVATE key in .env.local (VAPI_PRIVATE_KEY=...).
 *   2. npm run provision:phone
 *
 * Costs: the number itself is free; live calls bill per minute on your account.
 */

const KEY = process.env.VAPI_PRIVATE_KEY;
if (!KEY) {
  console.error("✗ Set VAPI_PRIVATE_KEY in .env.local and re-run.");
  process.exit(1);
}

const BASE = "https://api.vapi.ai";
const headers = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

(async () => {
  // Reuse an existing Vapi-managed number if there is one, else create one.
  const existing = await api("GET", "/phone-number");
  const reusable = Array.isArray(existing)
    ? existing.find((n) => n.provider === "vapi")
    : null;

  const number = reusable || (await api("POST", "/phone-number", {
    provider: "vapi",
    name: "Skylark outbound line",
  }));

  console.log(reusable ? "\n✓ Reusing an existing Vapi number." : "\n✓ Minted a new Vapi number.");
  console.log(`\n  Calls from: ${number.number || "(assigned shortly)"}`);
  console.log("\n  Paste this into .env.local:\n");
  console.log(`    VAPI_PHONE_NUMBER_ID=${number.id}\n`);
})().catch((e) => {
  console.error("\n✗ Provisioning failed:\n", e.message);
  console.error(
    "\nCommon causes: invalid private key, no billing set up, or no free numbers in your region.\n" +
      "You can also buy/import a number in the dashboard and copy its id.",
  );
  process.exit(1);
});
