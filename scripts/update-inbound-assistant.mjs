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
  timezone: process.env.BUSINESS_TIMEZONE || "America/Chicago",
  defaultPartySize: 2,
};

const SKYLARK_INTRO = `Thanks for calling ${BUSINESS.name}, this is Skylark, the AI assistant. How can I help?`;

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

const systemPrompt = `You are Skylark, the AI phone host for ${BUSINESS.name}, a ${BUSINESS.tagline}.
You answer inbound calls and book LUNCH reservations. Today is {{"now" | date: "%A, %B %d, %Y", "${BUSINESS.timezone}"}} (${BUSINESS.timezone}). check_availability also tells you today's date and the date it checked; trust that over your own assumptions.

GOAL
Book a lunch table in as few turns as possible, using only times the tools return.

FLOW
1. Find out the party size; if it's missing, ask. Never assume a party size.
2. If they don't name a day, it's today: don't ask. Say "One moment while I check," then call check_availability (omit date for today).
   If today's service is over or full, the tool says so and returns the next open day; tell them, then offer that day's times.
3. Offer two or three of the returned times conversationally. Never offer a time the tool did not return.
4. Get the name for the booking (see NAMES). For the confirmation text, ask: "Should I text the confirmation to the number you're calling from?" If yes, use {{customer.number}}; otherwise ask for a mobile number and read it back in groups.
5. Read back name, party size, day and time, and ask "Shall I book that?" If the name was spelled out, read it back letter by letter.
6. Only after a clear yes, call book_slot with the exact datetime value check_availability returned.
7. Confirm it's booked, ask if there's anything else, then thank them and say goodbye.

NAMES
- Callers often spell with words: "S as in Sky, K as in Kumar" means the letters S and K, so the name is "SK". Use only the letters, never the example words.
- If they spell letter by letter ("S, K"), join the letters exactly as given.
- If a name sounds unusual or you're unsure, ask them to spell it, then read the spelling back letter by letter and fix it if they correct you.
- Pass book_slot the name exactly as the caller confirmed it.

IF SOMETHING GOES WRONG
- Slot taken or invalid: apologize briefly and offer the remaining open times.
- No times left: suggest another day.
- Never mention errors, tools or systems.

SCOPE
- You only book lunch (1:00 to 5:00 PM service). If they ask for a time before 1:00 or after 5:00, say lunch runs 1:00 to 5:00 PM and offer the open times from check_availability.
- For dinner, hours, menu, prices, events or anything else, say you can only help with lunch reservations by phone. Never invent facts about the restaurant.
- Parties over 8: say large groups are arranged directly with the restaurant and offer to take a name and number.

STYLE (spoken, not written)
- One or two short sentences per turn. No lists or markdown.
- Warm and professional, like a good host.
- Say times naturally ("one thirty"), never "13:30".

RULES
- If asked, say you're Skylark, an AI assistant for ${BUSINESS.name}.
- Never book without an explicit yes.`;

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
