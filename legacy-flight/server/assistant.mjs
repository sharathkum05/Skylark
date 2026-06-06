/**
 * server/assistant.mjs — Relay's brain (OUTBOUND edition)
 * ------------------------------------------------------------------
 * Single editable home for the agent that calls businesses on YOUR behalf:
 *   - the system prompt (persona + rules for talking to a human/IVR)
 *   - the model / transcriber / voice providers (swappable in one place)
 *   - the `report_result` server tool the agent calls to hand the outcome back
 *   - `buildOutboundAssistant(task, webhookUrl)` — the inline assistant Vapi
 *     uses when it DIALS OUT.
 *
 * This is the mirror image of the old flight agent: instead of being the
 * business that answers, Relay is the *caller* — a personal assistant working
 * a task ("book a table for 2 at 7pm") by talking to whoever picks up.
 *
 * Nothing here places a call; `index.mjs` hands this object to Vapi's REST
 * `POST /call` endpoint, which does the dialing.
 */

/* ------------------------------------------------------------------ *
 * Provider config — change Claude/voice/transcriber HERE and nowhere else
 * ------------------------------------------------------------------ */

/** The LLM behind the agent. Anthropic Claude — fast, steerable on the phone. */
export const MODEL_CONFIG = {
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  temperature: 0.5, // a little warmth; the prompt keeps it on-task
};

/** Speech-to-text. Deepgram nova-2 is fast and accurate for phone-style audio. */
export const TRANSCRIBER_CONFIG = {
  provider: "deepgram",
  model: "nova-2",
  language: "en",
};

/** Text-to-speech. ElevenLabs "burt" — warm, conversational. */
export const VOICE_CONFIG = {
  provider: "11labs",
  voiceId: "burt",
  stability: 0.5,
  similarityBoost: 0.75,
};

/* ------------------------------------------------------------------ *
 * System prompt — the caller persona
 * ------------------------------------------------------------------ */

/**
 * Build the system prompt for one task. The agent is told WHO it represents,
 * WHAT to accomplish, and HOW to behave on a live outbound call.
 */
function systemPrompt(task, today) {
  const caller = task.user?.name?.trim() || "the client";
  const callback = task.user?.callbackNumber?.trim();
  const business = task.business?.name?.trim() || "the business";
  const details = task.details?.trim();

  return `You are Relay, a calm, polite human-sounding assistant making a phone call ON BEHALF OF ${caller}.
You are NOT the business — you are calling ${business} to get something done for ${caller}.

TODAY'S DATE is ${today}. Convert any spoken/relative date ("next Friday", "the 12th") to a real one.

YOUR TASK (this is the only reason you're calling)
${task.task}
${details ? `\nUSEFUL DETAILS YOU CAN PROVIDE IF ASKED\n${details}` : ""}
${callback ? `\nIf they need a callback number, give: ${callback}.` : ""}

WHO YOU REPRESENT
- You are calling for ${caller}. Speak as their assistant ("I'm calling on behalf of ${caller}").
- Never pretend to BE ${caller}; you're their assistant. If asked, say so plainly.

STYLE — THIS IS A LIVE PHONE CALL
- Keep every turn to ONE or TWO short, natural sentences. No lists, no markdown.
- Be warm and concise. Let the other person talk; don't monologue.
- Open with a one-line greeting that states why you're calling.

NAVIGATING THE CALL
- If you reach a menu/IVR or hold music, wait patiently and respond to prompts. If you
  must press a key to reach a human, say which digit you'd press out loud.
- If you reach a voicemail, leave a brief message with the task and the callback number, then end.
- If they can't help or are closed, note that and wrap up — don't invent a result.
- If they ask something you don't know, say you'll need to check with ${caller} rather than guessing.

CONFIRMING & FINISHING — CRITICAL
- Before you hang up, read back the key details once (date/time, name, party size, etc.)
  and get a clear confirmation.
- THEN call the report_result tool with an honest outcome: success true/false, a one-line
  summary, any confirmation number, and notes. ALWAYS call report_result before ending.
- After report_result, thank them in one sentence and end the call.`;
}

/* ------------------------------------------------------------------ *
 * Tools
 * ------------------------------------------------------------------ */

/**
 * `report_result` is a SERVER-SIDE tool: Vapi POSTs the call to our webhook,
 * which records the structured outcome against the task so the UI can show it.
 * This is how the agent "hands back" what happened on the call.
 */
function reportResultTool(webhookUrl) {
  return {
    type: "function",
    function: {
      name: "report_result",
      description:
        "Report the final outcome of the call. Call this once, right before ending the call, after you have a clear result.",
      parameters: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "True if the task was accomplished, false otherwise.",
          },
          summary: {
            type: "string",
            description:
              "One short sentence the client will read, e.g. 'Table for 2 booked Friday 7pm.'",
          },
          confirmation: {
            type: "string",
            description: "Any confirmation/reference number given, if applicable.",
          },
          details: {
            type: "string",
            description:
              "Anything else worth knowing: alternatives offered, what to bring, next steps.",
          },
        },
        required: ["success", "summary"],
      },
    },
    server: { url: webhookUrl },
  };
}

/* ------------------------------------------------------------------ *
 * Assembled inline assistant
 * ------------------------------------------------------------------ */

/**
 * Build the inline assistant Vapi dials out with for a single task.
 * @param {object} task  - { task, business:{name,number}, user:{name,callbackNumber}, details }
 * @param {string} webhookUrl - public URL Vapi posts server-messages + tool-calls to
 */
export function buildOutboundAssistant(task, webhookUrl) {
  const today = new Date().toISOString().slice(0, 10);
  const business = task.business?.name?.trim() || "you";

  return {
    name: "Relay",
    // The agent speaks first — it placed the call.
    firstMessage: `Hi, this is Relay, an assistant calling on behalf of ${
      task.user?.name?.trim() || "a client"
    }. Do you have a quick moment?`,
    transcriber: TRANSCRIBER_CONFIG,
    model: {
      provider: MODEL_CONFIG.provider,
      model: MODEL_CONFIG.model,
      temperature: MODEL_CONFIG.temperature,
      messages: [{ role: "system", content: systemPrompt(task, today) }],
      tools: [reportResultTool(webhookUrl), { type: "endCall" }],
    },
    voice: VOICE_CONFIG,
    // Push live events (transcript, status, end-of-call report) to our webhook.
    server: { url: webhookUrl },
    serverMessages: ["status-update", "transcript", "end-of-call-report", "tool-calls"],
    // Don't let a call run forever if a human never picks up cleanly.
    maxDurationSeconds: 600,
    // Cosmetic: labels the call in the Vapi dashboard.
    metadata: { product: "relay", business },
  };
}
