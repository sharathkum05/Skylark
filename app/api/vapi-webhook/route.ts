/**
 * app/api/vapi-webhook/route.ts — POST /api/vapi-webhook
 * ------------------------------------------------------------------
 * Vapi's cloud posts everything that happens on a call here:
 *   - status-update      → call lifecycle (ringing → in-progress → ended)
 *   - transcript         → each finalized turn of the conversation
 *   - end-of-call-report → summary + recording when the call wraps
 *   - tool-calls         → the agent's report_result(...) outcome
 *
 * We correlate each message to a task by its Vapi call id and update the store.
 * For tool-calls we must reply with { results: [...] } so the agent can proceed.
 */

import { NextResponse } from "next/server";
import { getTaskByCallId, saveTask } from "@/lib/relay/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const msg = body?.message ?? body ?? {};
  const callId = msg.call?.id ?? msg.callId;
  const task = callId ? await getTaskByCallId(callId) : null;

  switch (msg.type) {
    case "status-update": {
      if (task) {
        task.status = msg.status || task.status;
        if (msg.endedReason) task.endedReason = msg.endedReason;
        await saveTask(task);
      }
      break;
    }

    case "transcript": {
      // Keep only finalized turns so the log doesn't thrash with partials.
      if (task && msg.transcriptType === "final" && typeof msg.transcript === "string") {
        task.transcript.push({
          role: msg.role === "user" ? "business" : "skylark",
          text: msg.transcript,
        });
        await saveTask(task);
      }
      break;
    }

    case "end-of-call-report": {
      if (task) {
        task.status = "ended";
        task.endedReason = msg.endedReason || task.endedReason;
        task.recordingUrl = msg.recordingUrl || msg.recording?.url || task.recordingUrl;
        if (!task.result && msg.summary) {
          task.result = { success: null, summary: msg.summary, confirmation: "", details: "" };
        }
        await saveTask(task);
      }
      break;
    }

    case "tool-calls": {
      const calls = msg.toolCallList ?? msg.toolCalls ?? msg.tool_calls ?? [];
      const results: Array<{ toolCallId: string; result: string }> = [];
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
          await saveTask(task);
        }
        results.push({ toolCallId: id, result: "Recorded. You can wrap up the call now." });
      }
      return NextResponse.json({ results });
    }

    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
