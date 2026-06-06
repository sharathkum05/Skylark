/**
 * server/index.mjs — Relay's call orchestrator
 * ------------------------------------------------------------------
 * The brain that makes AI phone calls FOR you (a Simple-AI-style assistant).
 *
 * Flow:
 *   1. Browser POSTs a task ("book a table for 2 at 7pm") + a business number.
 *   2. We build an outbound assistant (server/assistant.mjs) and tell Vapi to
 *      DIAL that number via its REST `POST /call` API (uses the PRIVATE key).
 *   3. Vapi streams live events (status, transcript, end-of-call report) and the
 *      agent's `report_result` tool-call back to our /api/vapi-webhook.
 *   4. We stash everything against the task; the browser polls for live updates.
 *   5. Tasks + results persist to data/tasks.json so history survives restarts.
 *
 * Run:  npm run server     (node --env-file=.env server/index.mjs)
 * Env:  VAPI_PRIVATE_KEY, VAPI_PHONE_NUMBER_ID, PUBLIC_URL, PORT
 *
 * PUBLIC_URL must be a public https URL pointing at THIS server (e.g. an ngrok
 * tunnel), because Vapi's cloud needs to reach the webhook. In dev:
 *   ngrok http 8787   ->   PUBLIC_URL=https://<sub>.ngrok-free.app
 */

import express from "express";
import cors from "cors";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOutboundAssistant } from "./assistant.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;
const VAPI_BASE = "https://api.vapi.ai";
const DATA_FILE = join(__dirname, "..", "data", "tasks.json");

const PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY || "";
const PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || "";
// Where Vapi posts events back. Falls back to localhost so the server still
// boots, but real calls need a public tunnel set in PUBLIC_URL.
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, "");

/* ------------------------------------------------------------------ *
 * Tiny JSON-file store (no DB needed for a demo)
 * ------------------------------------------------------------------ */
/** @type {Map<string, any>} keyed by our task id */
const tasks = new Map();
/** Vapi callId -> our task id, so webhooks can find their task. */
const callIndex = new Map();

async function persist() {
  try {
    await mkdir(dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify([...tasks.values()], null, 2));
  } catch (e) {
    console.error("[persist] failed:", e.message);
  }
}

async function loadFromDisk() {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    for (const t of JSON.parse(raw)) {
      tasks.set(t.id, t);
      if (t.callId) callIndex.set(t.callId, t.id);
    }
    console.log(`↺ loaded ${tasks.size} task(s) from history`);
  } catch {
    /* no history yet — fine */
  }
}

// Monotonic-ish id without external deps. (Date.now is fine on a real server.)
let seq = 0;
function newId() {
  seq += 1;
  return `t_${Date.now().toString(36)}_${seq}`;
}

/* ------------------------------------------------------------------ *
 * Vapi REST helper
 * ------------------------------------------------------------------ */
async function vapi(path, body) {
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) throw new Error(`Vapi ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

/* ------------------------------------------------------------------ *
 * App
 * ------------------------------------------------------------------ */
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

/* ---- Create a task and place the outbound call ------------------- */
app.post("/api/tasks", async (req, res) => {
  const { task, business, user, details } = req.body || {};
  const number = business?.number?.trim();
  if (!task?.trim() || !number) {
    return res
      .status(400)
      .json({ error: "Need at least a task description and a business phone number." });
  }
  if (!PRIVATE_KEY || !PHONE_NUMBER_ID) {
    return res.status(500).json({
      error:
        "Server isn't configured for calls. Set VAPI_PRIVATE_KEY and VAPI_PHONE_NUMBER_ID (run `npm run provision:phone`).",
    });
  }

  const record = {
    id: newId(),
    createdAt: new Date().toISOString(),
    task: task.trim(),
    business: { name: business?.name?.trim() || "", number },
    user: { name: user?.name?.trim() || "", callbackNumber: user?.callbackNumber?.trim() || "" },
    details: details?.trim() || "",
    status: "queued",
    callId: null,
    transcript: [], // [{ role, text }]
    result: null, // { success, summary, confirmation, details }
    endedReason: null,
    recordingUrl: null,
    error: null,
  };
  tasks.set(record.id, record);

  try {
    const assistant = buildOutboundAssistant(record, `${PUBLIC_URL}/api/vapi-webhook`);
    const call = await vapi("/call", {
      phoneNumberId: PHONE_NUMBER_ID,
      customer: { number },
      assistant,
    });
    record.callId = call.id;
    record.status = call.status || "ringing";
    callIndex.set(call.id, record.id);
  } catch (e) {
    record.status = "failed";
    record.error = String(e.message || e);
    console.error("[create task] call failed:", record.error);
  }

  await persist();
  res.json(record);
});

/* ---- History + single task (polled by the UI) ------------------- */
app.get("/api/tasks", (_req, res) => {
  const list = [...tasks.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});

app.get("/api/tasks/:id", (req, res) => {
  const t = tasks.get(req.params.id);
  if (!t) return res.status(404).json({ error: "No such task." });
  res.json(t);
});

app.delete("/api/tasks/:id", async (req, res) => {
  const t = tasks.get(req.params.id);
  if (t) {
    tasks.delete(t.id);
    if (t.callId) callIndex.delete(t.callId);
    await persist();
  }
  res.json({ ok: true });
});

/* ---- Vapi webhook: status, transcript, end-of-call, tool-calls --- */
app.post("/api/vapi-webhook", async (req, res) => {
  const msg = req.body?.message ?? req.body ?? {};
  const callId = msg.call?.id ?? msg.callId;
  const task = callId ? tasks.get(callIndex.get(callId)) : null;

  switch (msg.type) {
    case "status-update": {
      if (task) {
        task.status = msg.status || task.status;
        if (msg.endedReason) task.endedReason = msg.endedReason;
        await persist();
      }
      break;
    }

    case "transcript": {
      // Only keep finalized turns so the log doesn't thrash with partials.
      if (task && msg.transcriptType === "final" && typeof msg.transcript === "string") {
        task.transcript.push({
          role: msg.role === "user" ? "business" : "relay",
          text: msg.transcript,
        });
        await persist();
      }
      break;
    }

    case "end-of-call-report": {
      if (task) {
        task.status = "ended";
        task.endedReason = msg.endedReason || task.endedReason;
        task.recordingUrl = msg.recordingUrl || msg.recording?.url || task.recordingUrl;
        // If the agent never called report_result, fall back to Vapi's summary.
        if (!task.result && msg.summary) {
          task.result = { success: null, summary: msg.summary, confirmation: "", details: "" };
        }
        await persist();
      }
      break;
    }

    case "tool-calls": {
      const calls = msg.toolCallList ?? msg.toolCalls ?? msg.tool_calls ?? [];
      const results = [];
      for (const c of calls) {
        const fn = c?.function ?? c;
        const id = c?.id ?? c?.toolCallId ?? fn?.id;
        if (fn?.name !== "report_result") continue;
        let args = fn.arguments ?? fn.parameters ?? {};
        if (typeof args === "string") {
          try {
            args = JSON.parse(args);
          } catch {
            args = {};
          }
        }
        if (task) {
          task.result = {
            success: !!args.success,
            summary: String(args.summary || ""),
            confirmation: String(args.confirmation || ""),
            details: String(args.details || ""),
          };
          await persist();
        }
        results.push({ toolCallId: id, result: "Recorded. You can wrap up the call now." });
      }
      return res.json({ results });
    }

    default:
      break;
  }

  res.json({ ok: true });
});

/* ---- Config probe so the UI can warn before a doomed call ------- */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(PRIVATE_KEY && PHONE_NUMBER_ID),
    publicUrl: PUBLIC_URL,
    webhookReachable: !PUBLIC_URL.startsWith("http://localhost"),
  });
});

await loadFromDisk();
app.listen(PORT, () => {
  console.log(`📞 Relay orchestrator on http://localhost:${PORT}`);
  console.log(`   Webhook: ${PUBLIC_URL}/api/vapi-webhook`);
  if (!PRIVATE_KEY || !PHONE_NUMBER_ID) {
    console.log("   ⚠  Set VAPI_PRIVATE_KEY + VAPI_PHONE_NUMBER_ID to place calls.");
  }
  if (PUBLIC_URL.startsWith("http://localhost")) {
    console.log("   ⚠  PUBLIC_URL is localhost — Vapi can't reach the webhook. Use ngrok.");
  }
});
