/**
 * Booking ledger — the single source of truth for who holds which slot.
 * Postgres when DATABASE_URL is set (persistent, safe across instances);
 * otherwise a local JSON file for offline development.
 * Syncs to Google Calendar when credentials are present.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { formatInTimeZone } from "date-fns-tz";

import { getDataDir } from "@/lib/data-dir";
import { getSql } from "@/lib/db";

import { BUSINESS } from "./config";

export interface Booking {
  id: string;
  startIso: string;
  partySize: number;
  guestName: string;
  guestPhone: string;
  createdAt: string;
  calendarEventId?: string;
}

export interface DayCount {
  date: string;
  bookings: number;
  guests: number;
}

const DATA_FILE = join(getDataDir(), "bookings.json");

/** Business-local service date (yyyy-MM-dd) for a slot start. */
export function businessDateOf(startIso: string): string {
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(startIso)) {
    return formatInTimeZone(new Date(startIso), BUSINESS.timezone, "yyyy-MM-dd");
  }
  // Legacy rows stored without an offset are already business-local.
  return startIso.slice(0, 10);
}

type BookingRow = {
  id: string;
  slot_start: Date;
  party_size: number;
  guest_name: string;
  guest_phone: string;
  calendar_event_id: string | null;
  created_at: Date;
};

function fromRow(r: BookingRow): Booking {
  return {
    id: r.id,
    startIso: r.slot_start.toISOString(),
    partySize: r.party_size,
    guestName: r.guest_name,
    guestPhone: r.guest_phone,
    createdAt: r.created_at.toISOString(),
    calendarEventId: r.calendar_event_id ?? undefined,
  };
}

async function readAll(): Promise<Booking[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8")) as Booking[];
  } catch {
    return [];
  }
}

async function writeAll(bookings: Booking[]): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(bookings, null, 2));
}

/** All bookings for one service date, oldest first. */
export async function listBookingsForDate(date: string): Promise<Booking[]> {
  const sql = await getSql();
  if (sql) {
    const rows = await sql<BookingRow[]>`
      SELECT * FROM bookings WHERE service_date = ${date} ORDER BY slot_start`;
    return rows.map(fromRow);
  }
  return (await readAll()).filter((b) => businessDateOf(b.startIso) === date);
}

/** Booking and guest totals per day in [from, to] — drives the dashboard calendar. */
export async function listDayCounts(from: string, to: string): Promise<DayCount[]> {
  const sql = await getSql();
  if (sql) {
    const rows = await sql<{ date: string; bookings: number; guests: number }[]>`
      SELECT to_char(service_date, 'YYYY-MM-DD') AS date,
             count(*)::int AS bookings,
             sum(party_size)::int AS guests
      FROM bookings
      WHERE service_date BETWEEN ${from} AND ${to}
      GROUP BY service_date
      ORDER BY service_date`;
    return rows;
  }

  const byDate = new Map<string, DayCount>();
  for (const b of await readAll()) {
    const date = businessDateOf(b.startIso);
    if (date < from || date > to) continue;
    const day = byDate.get(date) ?? { date, bookings: 0, guests: 0 };
    day.bookings += 1;
    day.guests += b.partySize;
    byDate.set(date, day);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Serialises read-check-write for the file store so concurrent calls can't both
 * claim one slot. Postgres gets the same guarantee from its UNIQUE constraint.
 */
let writeLock: Promise<unknown> = Promise.resolve();

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeLock.then(fn, fn);
  writeLock = run.catch(() => undefined);
  return run;
}

const SLOT_TAKEN = "That time was just booked by another caller.";

/** `booking.startIso` must already be canonical (see resolveSlotIso). */
export async function saveBooking(booking: Booking): Promise<void> {
  const sql = await getSql();
  if (sql) {
    const inserted = await sql`
      INSERT INTO bookings (id, slot_start, service_date, party_size, guest_name, guest_phone, created_at)
      VALUES (${booking.id}, ${booking.startIso}, ${businessDateOf(booking.startIso)},
              ${booking.partySize}, ${booking.guestName}, ${booking.guestPhone}, ${booking.createdAt})
      ON CONFLICT (slot_start) DO NOTHING
      RETURNING id`;
    if (inserted.length === 0) throw new Error(SLOT_TAKEN);
    return;
  }

  return withWriteLock(async () => {
    const all = await readAll();
    if (all.some((b) => b.startIso === booking.startIso)) throw new Error(SLOT_TAKEN);
    all.push(booking);
    await writeAll(all);
  });
}

export async function attachCalendarEvent(bookingId: string, eventId: string): Promise<void> {
  const sql = await getSql();
  if (sql) {
    await sql`UPDATE bookings SET calendar_event_id = ${eventId} WHERE id = ${bookingId}`;
    return;
  }
  await withWriteLock(async () => {
    const all = await readAll();
    const row = all.find((b) => b.id === bookingId);
    if (!row) return;
    row.calendarEventId = eventId;
    await writeAll(all);
  });
}
