/**
 * POST /api/vapi-inbound-tool — Vapi server tools for inbound booking
 */

import { NextResponse } from "next/server";

import { runInboundTool } from "@/lib/inbound/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ToolCall = {
  id?: string;
  toolCallId?: string;
  function?: { name?: string; arguments?: unknown; parameters?: unknown; id?: string };
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const msg = body?.message ?? body ?? {};
  const calls: ToolCall[] =
    msg.toolCallList ?? msg.toolCalls ?? msg.tool_calls ?? (Array.isArray(body) ? body : []);

  if (!calls.length) {
    return NextResponse.json({ error: "No tool calls in payload" }, { status: 400 });
  }

  const results: Array<{ toolCallId: string; result: string }> = [];

  for (const c of calls) {
    const fn = c?.function ?? c;
    const id = c?.id ?? c?.toolCallId ?? fn?.id ?? "unknown";
    const name = fn?.name ?? "";
    const args = fn?.arguments ?? fn?.parameters ?? {};

    try {
      const result = await runInboundTool(name, args);
      results.push({ toolCallId: id, result });
    } catch (e: unknown) {
      results.push({
        toolCallId: id,
        result: `Error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return NextResponse.json({ results });
}
