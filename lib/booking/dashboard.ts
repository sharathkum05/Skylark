import { formatInTimeZone } from "date-fns-tz";

import { BUSINESS } from "./config";
import { type Booking, listBookings } from "./store";

export interface SlotBoardEntry {
  time: string;
  label: string;
  slotKey: string;
  status: "available" | "booked";
  booking: Booking | null;
}

export interface LunchBoard {
  businessName: string;
  date: string;
  dateLabel: string;
  slots: SlotBoardEntry[];
  stats: {
    total: number;
    booked: number;
    available: number;
    guests: number;
  };
  bookings: Booking[];
}

/** Match bookings to grid slots regardless of ISO timezone suffix. */
export function slotMatchKey(startIso: string): string {
  const date = startIso.slice(0, 10);
  const timeMatch = startIso.match(/T(\d{2}:\d{2})/);
  return timeMatch ? `${date}T${timeMatch[1]}` : startIso;
}

function todayInBusinessTz(): string {
  return formatInTimeZone(new Date(), BUSINESS.timezone, "yyyy-MM-dd");
}

function formatSlotLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export async function getLunchBoard(date?: string): Promise<LunchBoard> {
  const targetDate = date || todayInBusinessTz();
  const allBookings = await listBookings();
  const todayBookings = allBookings.filter((b) => b.startIso.startsWith(targetDate));

  const bookingBySlot = new Map<string, Booking>();
  for (const booking of todayBookings) {
    bookingBySlot.set(slotMatchKey(booking.startIso), booking);
  }

  const slots: SlotBoardEntry[] = BUSINESS.lunchSlots.map((time) => {
    const slotKey = `${targetDate}T${time}`;
    const booking = bookingBySlot.get(slotKey) ?? null;
    return {
      time,
      label: formatSlotLabel(time),
      slotKey,
      status: booking ? "booked" : "available",
      booking,
    };
  });

  const booked = slots.filter((s) => s.status === "booked").length;
  const guests = slots.reduce((sum, s) => sum + (s.booking?.partySize ?? 0), 0);

  return {
    businessName: BUSINESS.name,
    date: targetDate,
    dateLabel: formatInTimeZone(
      new Date(`${targetDate}T12:00:00`),
      BUSINESS.timezone,
      "EEEE, MMMM d, yyyy",
    ),
    slots,
    stats: {
      total: slots.length,
      booked,
      available: slots.length - booked,
      guests,
    },
    bookings: todayBookings.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  };
}
