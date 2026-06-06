/**
 * app/api/tasks/route.ts
 *   POST  /api/tasks  — create a task and place the outbound call via Vapi
 *   GET   /api/tasks  — list all tasks (newest first) for the history view
 */

import { NextResponse } from "next/server";
import { buildOutboundAssistant } from "@/lib/relay/assistant";
import { listTasks, newTaskId, saveTask } from "@/lib/relay/store";
import { PHONE_NUMBER_ID, isConfigured, vapiPost, webhookUrl } from "@/lib/relay/vapi";
import type { NewTaskInput, Task } from "@/lib/relay/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listTasks());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<NewTaskInput>;
  const number = body.business?.number?.trim();
  if (!body.task?.trim() || !number) {
    return NextResponse.json(
      { error: "Need at least a task description and a business phone number." },
      { status: 400 },
    );
  }
  if (!isConfigured()) {
    return NextResponse.json(
      {
        error:
          "Server isn't configured for calls. Set VAPI_PRIVATE_KEY, VAPI_PHONE_NUMBER_ID and PUBLIC_URL (see README).",
      },
      { status: 500 },
    );
  }

  const task: Task = {
    id: newTaskId(),
    createdAt: new Date().toISOString(),
    task: body.task.trim(),
    business: { name: body.business?.name?.trim() || "", number },
    user: {
      name: body.user?.name?.trim() || "",
      callbackNumber: body.user?.callbackNumber?.trim() || "",
    },
    details: body.details?.trim() || "",
    status: "queued",
    callId: null,
    transcript: [],
    result: null,
    endedReason: null,
    recordingUrl: null,
    error: null,
  };

  try {
    const assistant = buildOutboundAssistant(task, webhookUrl());
    const call = await vapiPost("/call", {
      phoneNumberId: PHONE_NUMBER_ID,
      customer: { number },
      assistant,
    });
    task.callId = call.id;
    task.status = call.status || "ringing";
  } catch (e: any) {
    task.status = "failed";
    task.error = String(e?.message || e);
    console.error("[POST /api/tasks] call failed:", task.error);
  }

  await saveTask(task);
  return NextResponse.json(task);
}
