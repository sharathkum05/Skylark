import { NextResponse } from "next/server";

import { getLunchBoard } from "@/lib/booking/dashboard";
import { listDemoConfirmations } from "@/lib/sms/demo-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? undefined;

  const board = await getLunchBoard(date);
  const confirmations = await listDemoConfirmations(board.date);

  return NextResponse.json({
    board,
    confirmations: confirmations.slice(0, 10),
    updatedAt: new Date().toISOString(),
  });
}
