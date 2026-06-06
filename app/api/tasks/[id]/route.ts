/**
 * app/api/tasks/[id]/route.ts
 *   GET     /api/tasks/:id  — one task (the UI polls this for live updates)
 *   DELETE  /api/tasks/:id  — remove a task from history
 */

import { NextResponse } from "next/server";
import { deleteTask, getTask } from "@/lib/relay/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) return NextResponse.json({ error: "No such task." }, { status: 404 });
  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
