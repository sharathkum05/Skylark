import { NextResponse } from "next/server";

import { listDemoConfirmations } from "@/lib/sms/demo-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const confirmations = await listDemoConfirmations();
  return NextResponse.json({ confirmations });
}
