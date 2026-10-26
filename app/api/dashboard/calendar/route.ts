/**
 * GET /api/dashboard/calendar?month=YYYY-MM — bookings and guests per day, for the date picker
 */

import { NextResponse } from "next/server";

import { getMonthCounts } from "@/lib/booking/dashboard";
import { todayInBusinessTz } from "@/lib/booking/slots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const param = new URL(req.url).searchParams.get("month") ?? "";
  const month = /^\d{4}-\d{2}$/.test(param) ? param : todayInBusinessTz().slice(0, 7);

  return NextResponse.json({ month, days: await getMonthCounts(month) });
}
