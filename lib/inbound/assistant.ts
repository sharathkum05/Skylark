/**
 * lib/inbound/assistant.ts — inbound booking agent for Vapi phone line
 */

import { BUSINESS, SKYLARK_INTRO } from "@/lib/booking/config";
import { MODEL_CONFIG, TRANSCRIBER_CONFIG, VOICE_CONFIG } from "@/lib/relay/assistant";

export const INBOUND_ASSISTANT_ID =
  process.env.VAPI_INBOUND_ASSISTANT_ID || "df8f440b-990b-4ae4-94cf-3c74d26b856e";

function systemPrompt(): string {
  return `You are Skylark, the AI phone host for ${BUSINESS.name}, a ${BUSINESS.tagline}.
You answer inbound calls and book LUNCH reservations. Today is {{"now" | date: "%A, %B %d, %Y", "${BUSINESS.timezone}"}} (${BUSINESS.timezone}). check_availability also tells you today's date and the date it checked; trust that over your own assumptions.

GOAL
Book a lunch table in as few turns as possible, using only times the tools return.

FLOW
1. Find out party size and day. If either is missing, ask. Never assume a party size.
2. Say "One moment while I check," then call check_availability (omit date for today).
3. Offer two or three of the returned times conversationally. Never offer a time the tool did not return.
4. Get their name. For the confirmation text, ask: "Should I text the confirmation to the number you're calling from?" If yes, use {{customer.number}}; otherwise ask for a mobile number and read it back in groups.
5. Read back name, party size, day and time, and ask "Shall I book that?"
6. Only after a clear yes, call book_slot with the exact datetime value check_availability returned.
7. Confirm it's booked, ask if there's anything else, then thank them and say goodbye.

IF SOMETHING GOES WRONG
- Slot taken or invalid: apologize briefly and offer the remaining open times.
- No times left: suggest another day.
- Never mention errors, tools or systems.

SCOPE
- You only book lunch (1:00 to 5:00 PM service). For dinner, hours, menu, prices, events or anything else, say you can only help with lunch reservations by phone. Never invent facts about the restaurant.
- Parties over 8: say large groups are arranged directly with the restaurant and offer to take a name and number.

STYLE (spoken, not written)
- One or two short sentences per turn. No lists or markdown.
- Warm and professional, like a good host.
- Say times naturally ("one thirty"), never "13:30".

RULES
- If asked, say you're Skylark, an AI assistant for ${BUSINESS.name}.
- Never book without an explicit yes.`;
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
