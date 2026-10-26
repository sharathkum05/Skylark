/**
 * lib/inbound/assistant.ts — inbound booking agent for Vapi phone line
 */

import { BUSINESS, SKYLARK_INTRO } from "@/lib/booking/config";
import { MODEL_CONFIG, TRANSCRIBER_CONFIG, VOICE_CONFIG } from "@/lib/relay/assistant";

export const INBOUND_ASSISTANT_ID =
  process.env.VAPI_INBOUND_ASSISTANT_ID || "df8f440b-990b-4ae4-94cf-3c74d26b856e";

function systemPrompt(): string {
  return `You are Skylark, the AI phone assistant for ${BUSINESS.name}, a ${BUSINESS.tagline}.
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
}

function toolServerUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path}`;
}

export function buildInboundBookingTools(publicUrl: string) {
  const url = toolServerUrl(publicUrl, "/api/vapi-inbound-tool");
  // Vapi sends this Custom Credential's token with every tool call (see lib/auth/vapi.ts).
  const credentialId = process.env.VAPI_SERVER_CREDENTIAL_ID;
  const server = credentialId ? { url, credentialId } : { url };

  return [
    {
      type: "function" as const,
      function: {
        name: "check_availability",
        description:
          "Check which lunch reservation times are still open on the restaurant calendar for a given party size and date.",
        parameters: {
          type: "object",
          properties: {
            party_size: { type: "number", description: "Number of guests" },
            date: {
              type: "string",
              description: "Date as YYYY-MM-DD. Omit for today.",
            },
          },
        },
      },
      server,
    },
    {
      type: "function" as const,
      function: {
        name: "book_slot",
        description:
          "Book a confirmed reservation. Requires exact ISO datetime from check_availability, guest name, and phone for SMS.",
        parameters: {
          type: "object",
          properties: {
            datetime: {
              type: "string",
              description: "Exact ISO datetime check_availability returned for the chosen time",
            },
            party_size: { type: "number" },
            guest_name: { type: "string" },
            guest_phone: { type: "string", description: "E.164 or US mobile, e.g. +18035551234" },
          },
          required: ["datetime", "guest_name", "guest_phone", "party_size"],
        },
      },
      server,
    },
  ];
}

export function buildInboundAssistantBody(publicUrl: string) {
  return {
    name: "Skylark (inbound booking)",
    firstMessage: SKYLARK_INTRO,
    transcriber: TRANSCRIBER_CONFIG,
    model: {
      ...MODEL_CONFIG,
      messages: [{ role: "system", content: systemPrompt() }],
      tools: buildInboundBookingTools(publicUrl),
    },
    voice: VOICE_CONFIG,
  };
}
