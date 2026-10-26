/**
 * lib/db.ts — Postgres connection (Neon on Vercel) for the booking ledger.
 * When no DATABASE_URL / POSTGRES_URL is set, callers fall back to JSON files in data/.
 */

import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

let client: Sql | null = null;
let schemaReady: Promise<void> | null = null;

function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(databaseUrl());
}

async function ensureSchema(sql: Sql): Promise<void> {
  // One row per lunch slot: the UNIQUE constraint is what makes double-booking
  // impossible across every serverless instance, not just within one.
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id                text PRIMARY KEY,
      slot_start        timestamptz NOT NULL UNIQUE,
      service_date      date NOT NULL,
      party_size        integer NOT NULL,
      guest_name        text NOT NULL,
      guest_phone       text NOT NULL,
      calendar_event_id text,
      created_at        timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS bookings_service_date_idx ON bookings (service_date)`;
  await sql`
    CREATE TABLE IF NOT EXISTS confirmations (
      id           text PRIMARY KEY,
      to_phone     text NOT NULL,
      body         text NOT NULL,
      guest_name   text NOT NULL,
      party_size   integer NOT NULL,
      slot_start   timestamptz NOT NULL,
      service_date date NOT NULL,
      created_at   timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS confirmations_service_date_idx ON confirmations (service_date)`;
}

/** Shared client with the schema in place, or null when no database is configured. */
export async function getSql(): Promise<Sql | null> {
  const url = databaseUrl();
  if (!url) return null;

  if (!client) {
    const local = /localhost|127\.0\.0\.1/.test(url);
    client = postgres(url, {
      ssl: local ? false : "require",
      max: 5,
      idle_timeout: 20,
      prepare: false, // safe behind Neon's pgbouncer pooler
    });
  }
  if (!schemaReady) {
    schemaReady = ensureSchema(client).catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  await schemaReady;
  return client;
}
