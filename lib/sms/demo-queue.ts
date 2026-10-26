import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { businessDateOf } from "@/lib/booking/store";
import { getDataDir } from "@/lib/data-dir";
import { getSql } from "@/lib/db";

export interface DemoConfirmation {
  id: string;
  to: string;
  body: string;
  guestName: string;
  partySize: number;
  startIso: string;
  createdAt: string;
  channel: "demo";
}

const DATA_FILE = join(getDataDir(), "demo-sms.json");

type ConfirmationRow = {
  id: string;
  to_phone: string;
  body: string;
  guest_name: string;
  party_size: number;
  slot_start: Date;
  created_at: Date;
};

function fromRow(r: ConfirmationRow): DemoConfirmation {
  return {
    id: r.id,
    to: r.to_phone,
    body: r.body,
    guestName: r.guest_name,
    partySize: r.party_size,
    startIso: r.slot_start.toISOString(),
    createdAt: r.created_at.toISOString(),
    channel: "demo",
  };
}

async function readAll(): Promise<DemoConfirmation[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8")) as DemoConfirmation[];
  } catch {
    return [];
  }
}

async function writeAll(items: DemoConfirmation[]): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(items, null, 2));
}

export async function queueDemoConfirmation(
  item: Omit<DemoConfirmation, "id" | "createdAt" | "channel">,
): Promise<DemoConfirmation> {
  const entry: DemoConfirmation = {
    ...item,
    id: `sms_${randomUUID()}`,
    createdAt: new Date().toISOString(),
    channel: "demo",
  };

  const sql = await getSql();
  if (sql) {
    await sql`
      INSERT INTO confirmations (id, to_phone, body, guest_name, party_size, slot_start, service_date, created_at)
      VALUES (${entry.id}, ${entry.to}, ${entry.body}, ${entry.guestName}, ${entry.partySize},
              ${entry.startIso}, ${businessDateOf(entry.startIso)}, ${entry.createdAt})`;
    return entry;
  }

  const all = await readAll();
  all.unshift(entry);
  await writeAll(all.slice(0, 50));
  return entry;
}

/** Newest first. With `date`, only confirmations for bookings on that service date. */
export async function listDemoConfirmations(date?: string): Promise<DemoConfirmation[]> {
  const sql = await getSql();
  if (sql) {
    const rows = date
      ? await sql<ConfirmationRow[]>`
          SELECT * FROM confirmations WHERE service_date = ${date} ORDER BY created_at DESC LIMIT 50`
      : await sql<ConfirmationRow[]>`
          SELECT * FROM confirmations ORDER BY created_at DESC LIMIT 50`;
    return rows.map(fromRow);
  }

  const all = await readAll();
  return date ? all.filter((c) => businessDateOf(c.startIso) === date) : all;
}
