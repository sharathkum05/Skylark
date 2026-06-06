/**
 * provision-phone.mjs — give Skylark a real phone number people can call.
 * ------------------------------------------------------------------
 * Run this ONCE to set up inbound phone calls. It:
 *   1. creates a PERSISTENT assistant (the web app uses an ephemeral one)
 *   2. buys a free Vapi phone number
 *   3. attaches the assistant to that number for INBOUND calls
 *
 * It uses your Vapi PRIVATE key (server-side) — never ship that to the browser.
 *
 * USAGE:
 *   1. Rotate your private key first (you shared the old one in chat).
 *   2. export VAPI_PRIVATE_KEY=pk_your_NEW_private_key
 *   3. node scripts/provision-phone.mjs
 *
 * Costs: a Vapi number is free; live phone calls bill per minute on your account.
 *
 * NOTE: the assistant body below mirrors src/assistant.ts. If you edit the
 * prompt/model/voice there, mirror the change here (or re-run to make a new one).
 */

const KEY = process.env.VAPI_PRIVATE_KEY;
if (!KEY) {
  console.error("✗ Set VAPI_PRIVATE_KEY (your NEW private key) and re-run.");
  process.exit(1);
}

const BASE = "https://api.vapi.ai";
const headers = {
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

// Keep in sync with src/assistant.ts ---------------------------------
const MOCK_FLIGHTS = [
  "- SkyHop 8:00 AM — $180, nonstop",
  "- SkyHop 2:00 PM — $150, 1-stop",
  "- NightJet 9:00 PM — $240, nonstop",
].join("\n");

const SYSTEM_PROMPT = `You are Skylark, a warm, efficient voice agent that books flights over the phone.

STYLE
- This is a live phone call. Keep every turn to ONE or TWO short sentences.
- Speak naturally and warmly. Ask exactly ONE question at a time, then wait.

WHAT TO COLLECT (one question per turn)
1. Origin city  2. Destination city  3. Travel date  4. Budget (optional)

AVAILABLE FLIGHTS (your ENTIRE inventory — never invent others)
${MOCK_FLIGHTS}

OFFERING
- Once you know origin, destination and date, offer the matching options briefly.
- If asked for something not in the list, say you don't have it and offer the closest real option. NEVER make one up.

BOOKING — CRITICAL
- Do NOT call book_flight until the caller EXPLICITLY confirms the exact flight AND its price.
- Read back airline, time, price and route, then ask "Shall I book that?" Only book after a clear yes.
- Default the seat to "economy" unless they ask otherwise.`;

const assistantBody = {
  name: "Skylark (phone)",
  firstMessage: "Hi, this is Skylark. Where would you like to fly?",
  transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
  model: {
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.4,
    messages: [{ role: "system", content: SYSTEM_PROMPT }],
    tools: [
      {
        type: "function",
        function: {
          name: "book_flight",
          description:
            "Book the flight the caller has explicitly confirmed (flight + price).",
          parameters: {
            type: "object",
            properties: {
              airline: { type: "string" },
              from: { type: "string" },
              to: { type: "string" },
              date: { type: "string" },
              price: { type: "number" },
              seat: { type: "string" },
            },
            required: ["airline", "from", "to", "date", "price"],
          },
        },
      },
    ],
  },
  voice: { provider: "11labs", voiceId: "burt" },
};
// --------------------------------------------------------------------

async function api(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

(async () => {
  console.log("→ Creating persistent assistant…");
  const assistant = await api("/assistant", assistantBody);
  console.log(`  assistant id: ${assistant.id}`);

  console.log("→ Buying a free Vapi phone number and attaching the assistant…");
  // provider "vapi" = a free Vapi-managed US number. For your own Twilio/Telnyx
  // number, use provider "twilio"/"telnyx" with the relevant credentials instead.
  const number = await api("/phone-number", {
    provider: "vapi",
    assistantId: assistant.id,
    name: "Skylark line",
  });

  console.log("\n✓ Done. People can now call your agent at:");
  console.log(`\n    ${number.number || "(check dashboard → Phone Numbers)"}\n`);
  console.log("Inbound calls route to assistant:", assistant.id);
  console.log("Manage it at https://dashboard.vapi.ai → Phone Numbers.");
})().catch((e) => {
  console.error("\n✗ Provisioning failed:\n", e.message);
  console.error(
    "\nIf this is a 4xx, the most common causes are: an invalid/private key, " +
      "no billing set up, or no free numbers available in your region — in which " +
      "case buy/import a number in the dashboard and set its inbound assistant there.",
  );
  process.exit(1);
});
