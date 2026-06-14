import { format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { BUSINESS } from "./config";
import { isSlotTaken, listBookings } from "./store";

function todayInBusinessTz(): string {
  return formatInTimeZone(new Date(), BUSINESS.timezone, "yyyy-MM-dd");
}

/** Build ISO start times for lunch on `date` (yyyy-MM-dd) in business timezone. */
export function lunchSlotStarts(date: string): string[] {
  return BUSINESS.lunchSlots.map((time) =>
    fromZonedTime(`${date}T${time}:00`, BUSINESS.timezone).toISOString(),
  );
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
  const booked = new Set((await listBookings()).map((b) => b.startIso));

  const available: string[] = [];
  const taken: string[] = [];

  for (const iso of slots) {
    if (booked.has(iso) || (await isSlotTaken(iso))) taken.push(iso);
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
