/**
 * assistant.ts
 * ------------------------------------------------------------------
 * Single editable home for the Skylark agent's brain:
 *   - the mock flight inventory the agent is allowed to offer
 *   - the system prompt (personality + rules)
 *   - the model / transcriber / voice providers (swappable in one place)
 *   - the client-side `book_flight` tool schema
 *   - the assembled inline (ephemeral) Vapi assistant config
 *
 * Nothing here talks to the network directly — `main.ts` hands this whole
 * object to `vapi.start(...)`, which spins up an ephemeral assistant so no
 * Vapi dashboard setup is required.
 */

/* ------------------------------------------------------------------ *
 * Mock flight inventory
 * ------------------------------------------------------------------ *
 * The agent may ONLY offer flights from this list. It is embedded in the
 * system prompt so the model never invents fares. Keep it small + legible.
 * (For a production app these would come from a real `search_flights`
 * server-side tool — see the TODO near `bookFlightTool` below.)
 */
export interface Flight {
  airline: string;
  departure: string; // human-friendly departure time, e.g. "8:00 AM"
  price: number; // USD
  stops: string; // "nonstop" | "1-stop" | ...
}

export const MOCK_FLIGHTS: Flight[] = [
  { airline: "SkyHop", departure: "8:00 AM", price: 180, stops: "nonstop" },
  { airline: "SkyHop", departure: "2:00 PM", price: 150, stops: "1-stop" },
  { airline: "NightJet", departure: "9:00 PM", price: 240, stops: "nonstop" },
];

/** Render the inventory as a compact list the model can read back verbatim. */
function flightLines(flights: Flight[]): string {
  return flights
    .map(
      (f) =>
        `- ${f.airline} ${f.departure} — $${f.price}, ${f.stops}`,
    )
    .join("\n");
}

/* ------------------------------------------------------------------ *
 * Provider config — change Claude/voice/transcriber HERE and nowhere else
 * ------------------------------------------------------------------ */

/**
 * The LLM behind the agent. Kept as one constant so you can swap OpenAI for
 * Anthropic Claude by editing just these three lines, e.g.:
 *   { provider: "anthropic", model: "claude-sonnet-4-6" }
 * (Vapi supports `anthropic` as a model provider.)
 */
export const MODEL_CONFIG = {
  provider: "openai" as const,
  model: "gpt-4o" as const,
  temperature: 0.4, // low: stick to the script + inventory, minimal improvisation
};

/** Speech-to-text. Deepgram nova-2 is fast and accurate for phone-style audio. */
export const TRANSCRIBER_CONFIG = {
  provider: "deepgram" as const,
  model: "nova-2" as const,
  language: "en" as const,
};

/**
 * Text-to-speech. ElevenLabs voice. `voiceId` "burt" is a warm, conversational
 * preset that ships with Vapi's ElevenLabs integration; swap for any voice id
 * from your ElevenLabs account.
 */
export const VOICE_CONFIG = {
  provider: "11labs" as const,
  voiceId: "burt" as const,
  // Lower stability = a touch more expressive; tune to taste.
  stability: 0.5,
  similarityBoost: 0.75,
};

/** The agent's opening line, spoken before the caller says anything. */
export const FIRST_MESSAGE =
  "Hi, this is Skylark. Where would you like to fly?";

/* ------------------------------------------------------------------ *
 * System prompt
 * ------------------------------------------------------------------ */

export const SYSTEM_PROMPT = `You are Skylark, a warm, efficient voice agent that books flights over the phone.

STYLE
- This is a live phone call. Keep every turn to ONE or TWO short sentences.
- Speak naturally and warmly. No bullet points, no markdown, no emoji.
- Ask exactly ONE question at a time, then wait for the answer.

WHAT TO COLLECT (one question per turn, in roughly this order)
1. Origin city ("Where are you flying from?")
2. Destination city
3. Travel date
4. Budget (optional — if they give one, prefer flights at or under it)

AVAILABLE FLIGHTS (this is your ENTIRE inventory — never invent or imply others)
${flightLines(MOCK_FLIGHTS)}

OFFERING FLIGHTS
- Once you know origin, destination, and date, offer the matching options from the
  list above, briefly (airline, time, price, stops). If they gave a budget, lead with
  options at or under it and mention if a pricier nonstop exists.
- If asked for something you don't have (an airline, time, or price not in the list),
  say you don't have that and offer the closest real option instead. NEVER make one up.

BOOKING — THIS IS THE CRITICAL RULE
- Do NOT call the book_flight tool until the caller EXPLICITLY confirms the exact flight
  AND its price. A vague "sounds good" while still comparing is not confirmation.
- Before booking, read back the choice once: airline, time, price, and route, then ask
  "Shall I book that?" Only after a clear yes do you call book_flight.
- After the tool call, confirm warmly in one sentence and ask if there's anything else.

HANDLING THE MESSY STUFF
- If the caller changes their mind, just update the relevant detail and keep going.
- If you didn't catch something, ask them to repeat it — don't guess.
- If they ask for a city/route, assume the inventory above applies to it (it's a demo).
- Default the seat to "economy" unless they ask otherwise.`;

/* ------------------------------------------------------------------ *
 * Client-side tool: book_flight
 * ------------------------------------------------------------------ */

/**
 * `book_flight` is intentionally a CLIENT-SIDE tool: it has NO `server.url`,
 * so Vapi does not POST anywhere — instead it emits a `tool-calls` message
 * that the browser handles (see main.ts), which renders the confirmation
 * ticket. This is the right shape for an action the UI performs locally.
 *
 * TODO (server-side tool, NOT built in v0):
 *   A real `search_flights(from, to, date, budget)` must be a SERVER-SIDE tool
 *   with a `server.url`, because its results need to flow BACK into the model's
 *   context so it can reason over live fares. Client tools can't feed data back
 *   into the same turn. Implement that as a small backend endpoint later and add
 *   it to the `tools` array below with a `server: { url }` field.
 */
export const bookFlightTool = {
  type: "function" as const,
  // `async: false` => Vapi waits for a result, but since there's no server.url
  // it's surfaced to the client as a tool-call the browser fulfils.
  function: {
    name: "book_flight",
    description:
      "Book the specific flight the caller has explicitly confirmed. Only call this AFTER the caller has confirmed both the exact flight and its price.",
    parameters: {
      type: "object" as const,
      properties: {
        airline: {
          type: "string",
          description: "Airline name, e.g. SkyHop or NightJet.",
        },
        from: { type: "string", description: "Origin city." },
        to: { type: "string", description: "Destination city." },
        date: { type: "string", description: "Travel date as the caller said it." },
        price: { type: "number", description: "Confirmed fare in USD." },
        seat: {
          type: "string",
          description: "Seat class, e.g. economy. Default economy.",
        },
      },
      required: ["airline", "from", "to", "date", "price"],
    },
  },
};

/* ------------------------------------------------------------------ *
 * Assembled inline assistant config
 * ------------------------------------------------------------------ */

/**
 * Passed verbatim to `vapi.start(buildAssistant())`. Typed loosely as the Vapi
 * SDK's `start()` accepts a broad inline-assistant shape; keeping it as a plain
 * object here avoids fighting the SDK's union types while staying readable.
 */
export function buildAssistant() {
  return {
    name: "Skylark",
    firstMessage: FIRST_MESSAGE,
    // Surface partial transcripts so the UI can show live, updating text.
    transcriber: TRANSCRIBER_CONFIG,
    model: {
      provider: MODEL_CONFIG.provider,
      model: MODEL_CONFIG.model,
      temperature: MODEL_CONFIG.temperature,
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      tools: [bookFlightTool],
    },
    voice: VOICE_CONFIG,
  };
}

/** Shape of the arguments the browser receives from a `book_flight` tool-call. */
export interface BookFlightArgs {
  airline: string;
  from: string;
  to: string;
  date: string;
  price: number;
  seat?: string;
}
