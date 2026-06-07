/**
 * provision-demo-line.mjs — a real number people can call to try Skylark live.
 * ------------------------------------------------------------------
 * This sets up the INBOUND "Call to try Skylark's AI agent live" demo shown in
 * the hero. It:
 *   1. creates a persistent demo assistant (Skylark answering as your assistant)
 *   2. mints a free Vapi number (or reuses a spare one)
 *   3. attaches the assistant to that number for INBOUND calls
 *   4. prints the number to paste into .env.local as NEXT_PUBLIC_SKYLARK_DEMO_NUMBER
 *
 * This is separate from `provision:phone` (which mints the OUTBOUND number
 * Skylark dials FROM). Use a different number for each so they don't clash.
 *
 * USAGE:
 *   1. Put your PRIVATE key in .env.local (VAPI_PRIVATE_KEY=...).
 *   2. npm run provision:demo
 *
 * Costs: the number is free; inbound calls bill per minute on your account.
 */

const KEY = process.env.VAPI_PRIVATE_KEY;
if (!KEY) {
  console.error("✗ Set VAPI_PRIVATE_KEY in .env.local and re-run.");
  process.exit(1);
}

const BASE = "https://api.vapi.ai";
const headers = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const SYSTEM_PROMPT = `You are Skylark, a warm, human-sounding AI assistant. This is a LIVE DEMO: someone
has called your public number to experience what Skylark can do.

WHAT SKYLARK IS
- Skylark makes phone calls on people's behalf. They tell you a task ("book a table
  for two on Friday", "ask my pharmacy if a prescription is ready", "get me the
  earliest dentist appointment") and you call the business, wait on hold, navigate
  phone menus, talk to whoever answers, get it done, and report back.

YOUR JOB ON THIS CALL
- Greet them, then ask what they'd like Skylark to take care of.
- When they describe a task, confirm the key details back (who to call, what you'd
  ask for, any date/time) exactly as a real assistant would before placing the call.
- Walk them through how you'd handle it — including hold music and phone trees — so
  they can feel what the real product does. This is a demo, so don't place a real
  outbound call; describe what you'd do and confirm you've "got it".
- Be genuinely helpful and curious. Keep it light.

STYLE — THIS IS A LIVE PHONE CALL
- Keep every turn to ONE or TWO short, natural sentences. No lists, no markdown.
- Ask one question at a time, then wait. Let them talk.
- If they ask what you can do, give two or three quick examples and ask which they'd
  like to try.`;

const assistantBody = {
  name: "Skylark (live demo)",
  firstMessage:
    "Hi, this is Skylark — your AI calling assistant. What would you like me to take care of today?",
  transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
  model: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    temperature: 0.6,
    messages: [{ role: "system", content: SYSTEM_PROMPT }],
  },
  voice: { provider: "11labs", voiceId: "burt", stability: 0.5, similarityBoost: 0.75 },
};

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
  console.log("→ Creating the Skylark live-demo assistant…");
  const assistant = await api("POST", "/assistant", assistantBody);
  console.log(`  assistant id: ${assistant.id}`);

  console.log("→ Minting a free Vapi number and attaching it for inbound…");
  const number = await api("POST", "/phone-number", {
    provider: "vapi",
    assistantId: assistant.id,
    name: "Skylark live demo line",
  });

  console.log("\n✓ Done. People can now call Skylark live at:\n");
  console.log(`    ${number.number || "(assigned shortly — check the dashboard)"}\n`);
  console.log("  Paste this into .env.local (keep the spacing you want shown):\n");
  console.log(`    NEXT_PUBLIC_SKYLARK_DEMO_NUMBER="${number.number || "+1 ..."}"\n`);
  console.log("  Then restart `npm run dev` so the hero picks it up.");
})().catch((e) => {
  console.error("\n✗ Provisioning failed:\n", e.message);
  console.error(
    "\nCommon causes: invalid private key, no billing set up, or no free numbers in your region.\n" +
      "You can also buy/import a number in the dashboard and attach the assistant there.",
  );
  process.exit(1);
});
