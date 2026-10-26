/**
 * scripts/update-inbound-assistant.mjs
 * Push the inbound booking prompt + calendar tools to your Vapi assistant.
 *
 *   npm run update:inbound
 *
 * Requires in .env.local:
 *   VAPI_PRIVATE_KEY
 *   PUBLIC_URL=https://your-ngrok-url   (no trailing slash)
 *   VAPI_INBOUND_ASSISTANT_ID=...       (optional; defaults to live demo assistant)
 *   VAPI_SERVER_CREDENTIAL_ID=...       (recommended; Custom Credential that authenticates tool calls)
 *
 * The credential is a Bearer Token created once in the Vapi dashboard
 * (Integrations → Server Configuration → Add Custom Credential, header Authorization,
 * Bearer prefix on). Its token must equal VAPI_SERVER_SECRET on the deployment.
 */

// Minimal duplicate of lib/booking/config for Node script
const BUSINESS = {
  name: "The Copper Table",
  tagline: "modern American bistro",
  timezone: process.env.BUSINESS_TIMEZONE || "America/New_York",
  defaultPartySize: 2,
};

const SKYLARK_INTRO = `Hi, this is Skylark, the AI assistant for ${BUSINESS.name}. What would you like me to do?`;

const KEY = process.env.VAPI_PRIVATE_KEY;
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
const ASSISTANT_ID =
  process.env.VAPI_INBOUND_ASSISTANT_ID || "df8f440b-990b-4ae4-94cf-3c74d26b856e";
const CREDENTIAL_ID = process.env.VAPI_SERVER_CREDENTIAL_ID;

if (!KEY) {
  console.error("✗ Set VAPI_PRIVATE_KEY in .env.local");
  process.exit(1);
}
if (!PUBLIC_URL) {
  console.error("✗ Set PUBLIC_URL in .env.local (ngrok https URL)");
  process.exit(1);
}

const toolUrl = `${PUBLIC_URL}/api/vapi-inbound-tool`;
const toolServer = CREDENTIAL_ID ? { url: toolUrl, credentialId: CREDENTIAL_ID } : { url: toolUrl };

const systemPrompt = `You are Skylark, the AI phone assistant for ${BUSINESS.name}, a ${BUSINESS.tagline}.
You answer INBOUND calls from guests who want to book a table.

TODAY'S DATE is {{"now" | date: "%A, %B %d, %Y", "${BUSINESS.timezone}"}} (timezone: ${BUSINESS.timezone}). Resolved by Vapi at the start of every call.

OPENING
- You already greeted them. Continue naturally.

YOUR JOB
- Help callers book lunch reservations at ${BUSINESS.name}.
- Typical party size is ${BUSINESS.defaultPartySize}; confirm if they say a different number.
- Lunch service slots are checked via your tools — never invent times.

TOOLS — USE THESE, DO NOT GUESS
1. check_availability — call when they want a reservation (party size, optional date). Use the returned times in your reply.
2. book_slot — call ONLY after they pick a time AND give their name AND mobile number AND say yes to confirm.

BOOKING FLOW
- If they say "book for 2 today" (or similar), call check_availability with party_size 2.
- Offer available lunch times conversationally, e.g. "We have 1, 1:30, or 2 — which works?" Only offer times the tool returned.
- Collect: name, mobile number for confirmation text.
- Read back: name, party size, time. Ask "Shall I book that?"
- On clear yes → book_slot, passing the exact datetime value check_availability gave for that time.
- If book_slot says a time is taken or invalid, apologise briefly and offer the other open times — never mention technical errors.

STYLE — LIVE PHONE CALL
- One or two short sentences per turn. No lists, no markdown.
- Warm, professional, like a host at a nice restaurant.
- Always say you're Skylark, the AI assistant for ${BUSINESS.name}, if asked.

RULES
- Disclose you are an AI assistant if asked.
- Never book without explicit confirmation.
- If no times available, apologize and suggest calling back or another day.`;

const assistantBody = {
  name: "Skylark (inbound booking)",
  firstMessage: SKYLARK_INTRO,
  transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
  model: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    temperature: 0.5,
    messages: [{ role: "system", content: systemPrompt }],
    tools: [
      {
        type: "function",
        function: {
          name: "check_availability",
          description:
            "Check which lunch reservation times are still open for a party size and date.",
          parameters: {
            type: "object",
            properties: {
              party_size: { type: "number" },
              date: { type: "string", description: "YYYY-MM-DD, omit for today" },
            },
          },
        },
        server: toolServer,
      },
      {
        type: "function",
        function: {
          name: "book_slot",
          description: "Book a confirmed reservation with datetime, name, and phone.",
          parameters: {
            type: "object",
            properties: {
              datetime: {
                type: "string",
                description: "Exact ISO datetime check_availability returned for the chosen time",
              },
              party_size: { type: "number" },
              guest_name: { type: "string" },
              guest_phone: { type: "string" },
            },
            required: ["datetime", "guest_name", "guest_phone", "party_size"],
          },
        },
        server: toolServer,
      },
    ],
  },
  voice: { provider: "11labs", voiceId: "burt", stability: 0.5, similarityBoost: 0.75 },
};

const BASE = "https://api.vapi.ai";

(async () => {
  console.log(`→ Updating assistant ${ASSISTANT_ID}…`);
  console.log(`  Tool URL: ${toolUrl}`);
  console.log(
    CREDENTIAL_ID
      ? `  Tool auth: credential ${CREDENTIAL_ID}`
      : "  ⚠ Tool auth: none — set VAPI_SERVER_CREDENTIAL_ID to authenticate tool calls",
  );

  const res = await fetch(`${BASE}/assistant/${ASSISTANT_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(assistantBody),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("✗ Update failed:", res.status, text);
    process.exit(1);
  }

  console.log("\n✓ Inbound booking assistant updated.");
  console.log(`  Greeting: "${SKYLARK_INTRO}"`);
  console.log(`\n  Next: make sure ${PUBLIC_URL} is up, then call your demo number.`);
})();
