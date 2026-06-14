import { BUSINESS } from "@/lib/booking/config";
import { getAvailableLunchSlots, lunchSlotStarts, slotsToSpeech } from "@/lib/booking/slots";
import { saveBooking } from "@/lib/booking/store";
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

  const busyFromGoogle = await getBusySlotStarts(targetDate, lunchSlotStarts(targetDate));
  if (busyFromGoogle.size) {
    available = available.filter((iso) => !busyFromGoogle.has(iso));
  }

  if (available.length === 0) {
    return `No lunch tables left for party of ${partySize} on ${targetDate}. Suggest another day or ask them to call back later.`;
  }

  return `For lunch on ${targetDate}, party of ${partySize}, available times are: ${slotsToSpeech(available)}. Offer these naturally — do not read as a bullet list.`;
}

export async function handleBookSlot(args: unknown): Promise<string> {
  const a = parseArgs(args);
  const startIso = String(a.datetime ?? a.start_iso ?? a.startIso ?? "").trim();
  const guestName = String(a.guest_name ?? a.guestName ?? "Guest").trim();
  const guestPhone = String(a.guest_phone ?? a.guestPhone ?? "").trim();
  const partySize = Number(a.party_size ?? a.partySize ?? BUSINESS.defaultPartySize);

  if (!startIso) return "Missing booking time. Ask which slot they want.";
  if (!guestPhone) return "Need their mobile number for a confirmation text before booking.";

  const booking = {
    id: `b_${Date.now().toString(36)}`,
    startIso,
    partySize,
    guestName,
    guestPhone,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveBooking(booking);
  } catch (e: unknown) {
    return String(e instanceof Error ? e.message : e);
  }

  const calendarEventId = await createCalendarEvent(booking).catch(() => null);
  if (calendarEventId) booking.calendarEventId = calendarEventId;

  const confirmation = await sendBookingConfirmation({
    to: guestPhone,
    guestName,
    partySize,
    startIso,
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
