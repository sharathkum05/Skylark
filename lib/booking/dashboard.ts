import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { BUSINESS } from "./config";
import { todayInBusinessTz } from "./slots";
import { type Booking, type DayCount, listBookingsForDate, listDayCounts } from "./store";

export interface SlotBoardEntry {
  time: string;
  label: string;
  slotKey: string;
  /** `closed` = the slot's start time has passed without a booking. */
  status: "available" | "booked" | "closed";
  booking: Booking | null;
}

export interface LunchBoard {
  businessName: string;
  date: string;
  dateLabel: string;
  today: string;
  isToday: boolean;
  slots: SlotBoardEntry[];
  stats: {
    total: number;
    booked: number;
    available: number;
    guests: number;
  };
  bookings: Booking[];
}

/** Match bookings to grid slots by business-local wall time (`yyyy-MM-ddTHH:mm`). */
export function slotMatchKey(startIso: string): string {
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(startIso)) {
    return formatInTimeZone(new Date(startIso), BUSINESS.timezone, "yyyy-MM-dd'T'HH:mm");
  }
  // Legacy rows stored without an offset are already business-local.
  const date = startIso.slice(0, 10);
  const timeMatch = startIso.match(/T(\d{2}:\d{2})/);
  return timeMatch ? `${date}T${timeMatch[1]}` : startIso;
}

export function isValidDate(date: string | undefined): date is string {
  return Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)));
}

function formatSlotLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** Per-day booking totals for a month (`yyyy-MM`) — marks days on the dashboard calendar. */
export async function getMonthCounts(month: string): Promise<DayCount[]> {
  const { from, to } = monthRange(`${month}-01`);
  return listDayCounts(from, to);
}

function monthRange(date: string): { from: string; to: string } {
  const [y, m] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

export async function getLunchBoard(date?: string): Promise<LunchBoard> {
  const today = todayInBusinessTz();
  const targetDate = isValidDate(date) ? date : today;
  const dayBookings = await listBookingsForDate(targetDate);

  const bookingBySlot = new Map<string, Booking>();
  for (const booking of dayBookings) {
    bookingBySlot.set(slotMatchKey(booking.startIso), booking);
  }

  const now = Date.now();
  const slots: SlotBoardEntry[] = BUSINESS.lunchSlots.map((time) => {
    const slotKey = `${targetDate}T${time}`;
    const booking = bookingBySlot.get(slotKey) ?? null;
    const started = fromZonedTime(`${slotKey}:00`, BUSINESS.timezone).getTime() <= now;
    return {
      time,
      label: formatSlotLabel(time),
      slotKey,
      status: booking ? "booked" : started ? "closed" : "available",
      booking,
    };
  });

  const booked = slots.filter((s) => s.status === "booked").length;
  const guests = slots.reduce((sum, s) => sum + (s.booking?.partySize ?? 0), 0);

  return {
    businessName: BUSINESS.name,
    date: targetDate,
    dateLabel: formatInTimeZone(
      fromZonedTime(`${targetDate}T12:00:00`, BUSINESS.timezone),
      BUSINESS.timezone,
      "EEEE, MMMM d, yyyy",
    ),
    today,
    isToday: targetDate === today,
    slots,
    stats: {
      total: slots.length,
      booked,
      available: slots.filter((s) => s.status === "available").length,
      guests,
    },
    bookings: dayBookings.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  };
}
