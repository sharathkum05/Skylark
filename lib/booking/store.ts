/**
 * Local booking ledger — prevents double-booking even before Google Calendar is wired.
 * Syncs to Google Calendar when credentials are present.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { getDataDir } from "@/lib/data-dir";

export interface Booking {
  id: string;
  startIso: string;
  partySize: number;
  guestName: string;
  guestPhone: string;
  createdAt: string;
  calendarEventId?: string;
}

const DATA_FILE = join(getDataDir(), "bookings.json");

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

export async function listBookings(): Promise<Booking[]> {
  return readAll();
}

export async function isSlotTaken(startIso: string): Promise<boolean> {
  const all = await readAll();
  return all.some((b) => b.startIso === startIso);
}

export async function saveBooking(booking: Booking): Promise<void> {
  const all = await readAll();
  if (all.some((b) => b.startIso === booking.startIso)) {
    throw new Error("That time was just booked by another caller.");
  }
  all.push(booking);
  await writeAll(all);
}
