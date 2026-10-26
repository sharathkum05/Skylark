import { randomUUID } from "node:crypto";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { BUSINESS } from "@/lib/booking/config";
import {
  formatSlotForSpeech,
  getAvailableLunchSlots,
  lunchSlotStarts,
  resolveSlotIso,
  slotsToSpeech,
} from "@/lib/booking/slots";
import { attachCalendarEvent, type Booking, saveBooking } from "@/lib/booking/store";
import { createCalendarEvent, getBusySlotStarts } from "@/lib/calendar/google";
import { sendBookingConfirmation } from "@/lib/sms/confirmation";

function parseArgs(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

export async function handleCheckAvailability(args: unknown): Promise<string> {
  const a = parseArgs(args);
  const partySize = Number(a.party_size ?? a.partySize ?? BUSINESS.defaultPartySize);
  const date = typeof a.date === "string" ? a.date : undefined;

  let { date: targetDate, available } = await getAvailableLunchSlots(date);

  // Calendar is a secondary source — if Google is down or the token expired, the
  // local ledger still answers so the caller never hears an error.
  const busyFromGoogle = await getBusySlotStarts(targetDate, lunchSlotStarts(targetDate)).catch(
    (e: unknown) => {
      console.warn("[inbound] google freebusy failed, using ledger only:", String(e));
      return new Set<string>();
    },
  );
  if (busyFromGoogle.size) {
    available = available.filter((iso) => !busyFromGoogle.has(iso));
  }

  // State the date explicitly so relative dates ("tomorrow", "Friday") never hinge on the prompt template.
  const today = formatInTimeZone(new Date(), BUSINESS.timezone, "EEEE, MMMM d, yyyy");
  const checked = formatInTimeZone(
    fromZonedTime(`${targetDate}T12:00:00`, BUSINESS.timezone),
    BUSINESS.timezone,
    "EEEE, MMMM d",
  );

  if (available.length === 0) {
    return `Today is ${today}. No lunch tables left for party of ${partySize} on ${checked}. Suggest another day or ask them to call back later.`;
  }

  const exactValues = available.map((iso) => `${formatSlotForSpeech(iso)} = ${iso}`).join("; ");
  return `Today is ${today}. For lunch on ${checked} (${targetDate}), party of ${partySize}, available times are: ${slotsToSpeech(available)}. Offer these naturally — do not read as a bullet list. When booking, pass the exact datetime for the chosen time to book_slot: ${exactValues}.`;
}

export async function handleBookSlot(args: unknown): Promise<string> {
  const a = parseArgs(args);
  const requested = String(a.datetime ?? a.start_iso ?? a.startIso ?? "").trim();
  const guestName = String(a.guest_name ?? a.guestName ?? "Guest").trim();
  const guestPhone = String(a.guest_phone ?? a.guestPhone ?? "").trim();
  const partySize = Number(a.party_size ?? a.partySize ?? BUSINESS.defaultPartySize);

  if (!requested) return "Missing booking time. Ask which slot they want.";
  if (!guestPhone) return "Need their mobile number for a confirmation text before booking.";

  const startIso = resolveSlotIso(requested);
  if (!startIso) {
    return `${requested} is not one of our lunch times. Call check_availability again and offer one of the returned times.`;
  }
  if (new Date(startIso).getTime() <= Date.now()) {
    return "That time has already passed. Call check_availability again and offer one of the returned times.";
  }

  const booking: Booking = {
    id: `b_${randomUUID()}`,
    startIso,
    partySize,
    guestName,
    guestPhone,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveBooking(booking);
  } catch (e: unknown) {
    return `${e instanceof Error ? e.message : String(e)} Apologise and offer the other open times from check_availability.`;
  }

  const calendarEventId = await createCalendarEvent(booking).catch(() => null);
  if (calendarEventId) await attachCalendarEvent(booking.id, calendarEventId).catch(() => undefined);

  // The table is already held — a confirmation failure must not read as a failed booking.
  const confirmation = await sendBookingConfirmation({
    to: guestPhone,
    guestName,
    partySize,
    startIso,
  }).catch((e: unknown) => {
    console.warn("[inbound] confirmation failed:", String(e));
    return "none" as const;
  });

  const when = slotsToSpeech([startIso]);
  const smsNote =
    confirmation === "sms"
      ? "A confirmation text was sent."
      : confirmation === "demo"
        ? "A confirmation text was sent."
        : "Calendar updated; SMS not configured yet.";

  return `Booked: ${guestName}, party of ${partySize}, ${when} at ${BUSINESS.name}. ${smsNote} Tell them they're all set.`;
}

export async function runInboundTool(
  name: string,
  args: unknown,
): Promise<string> {
  switch (name) {
    case "check_availability":
      return handleCheckAvailability(args);
    case "book_slot":
      return handleBookSlot(args);
    default:
      return `Unknown tool: ${name}`;
  }
}
