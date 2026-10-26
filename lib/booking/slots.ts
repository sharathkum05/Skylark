import { format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { BUSINESS } from "./config";
import { listBookings } from "./store";

function todayInBusinessTz(): string {
  return formatInTimeZone(new Date(), BUSINESS.timezone, "yyyy-MM-dd");
}

/** Build ISO start times for lunch on `date` (yyyy-MM-dd) in business timezone. */
export function lunchSlotStarts(date: string): string[] {
  return BUSINESS.lunchSlots.map((time) =>
    fromZonedTime(`${date}T${time}:00`, BUSINESS.timezone).toISOString(),
  );
}

/**
 * Resolve whatever datetime the LLM sends ("2026-10-27T13:00:00", "...T17:00:00.000Z",
 * "...T13:00:00-04:00") to the canonical UTC ISO of a real lunch slot, or null.
 * Times without an offset are read as business-local, never server-local (UTC on Vercel).
 */
export function resolveSlotIso(input: string): string | null {
  const raw = input.trim();
  const date = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const instant = hasOffset ? new Date(raw) : fromZonedTime(raw, BUSINESS.timezone);
  if (Number.isNaN(instant.getTime())) return null;

  const localDate = formatInTimeZone(instant, BUSINESS.timezone, "yyyy-MM-dd");
  return lunchSlotStarts(localDate).find((iso) => iso === instant.toISOString()) ?? null;
}

export function formatSlotForSpeech(iso: string): string {
  const zoned = toZonedTime(parseISO(iso), BUSINESS.timezone);
  return format(zoned, "h:mm a");
}

export async function getAvailableLunchSlots(date?: string): Promise<{
  date: string;
  available: string[];
  taken: string[];
}> {
  const targetDate = date || todayInBusinessTz();
  const slots = lunchSlotStarts(targetDate);
  const booked = new Set(
    (await listBookings()).map((b) => resolveSlotIso(b.startIso) ?? b.startIso),
  );

  const available: string[] = [];
  const taken: string[] = [];

  for (const iso of slots) {
    if (booked.has(iso)) taken.push(iso);
    else available.push(iso);
  }

  return { date: targetDate, available, taken };
}

export function slotsToSpeech(availableIso: string[]): string {
  if (availableIso.length === 0) {
    return "Sorry, lunch is fully booked for that day.";
  }
  const labels = availableIso.map(formatSlotForSpeech);
  if (labels.length === 1) return labels[0];
  const last = labels.pop();
  return `${labels.join(", ")}, and ${last}`;
}
