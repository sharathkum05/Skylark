import { google } from "googleapis";

import { BUSINESS } from "@/lib/booking/config";
import type { Booking } from "@/lib/booking/store";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_CALENDAR_ID,
  );
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2;
}

export async function createCalendarEvent(booking: Booking): Promise<string | null> {
  if (!isGoogleCalendarConfigured()) return null;

  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID!;

  const start = new Date(booking.startIso);
  const end = new Date(start.getTime() + BUSINESS.slotDurationMinutes * 60_000);

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Reservation — ${booking.guestName} (party of ${booking.partySize})`,
      description: `Booked via Skylark inbound agent.\nGuest phone: ${booking.guestPhone}`,
      start: { dateTime: start.toISOString(), timeZone: BUSINESS.timezone },
      end: { dateTime: end.toISOString(), timeZone: BUSINESS.timezone },
    },
  });

  return event.data.id ?? null;
}

/** Optional: merge busy times from Google into availability checks later. */
export async function getBusySlotStarts(date: string, slotStarts: string[]): Promise<Set<string>> {
  if (!isGoogleCalendarConfigured()) return new Set();

  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID!;

  const timeMin = slotStarts[0];
  const timeMax = new Date(
    new Date(slotStarts[slotStarts.length - 1]).getTime() +
      BUSINESS.slotDurationMinutes * 60_000,
  ).toISOString();

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: BUSINESS.timezone,
      items: [{ id: calendarId }],
    },
  });

  const busy = res.data.calendars?.[calendarId]?.busy ?? [];
  const blocked = new Set<string>();

  for (const iso of slotStarts) {
    const start = new Date(iso).getTime();
    const end = start + BUSINESS.slotDurationMinutes * 60_000;
    for (const b of busy) {
      const b0 = new Date(b.start!).getTime();
      const b1 = new Date(b.end!).getTime();
      if (start < b1 && end > b0) blocked.add(iso);
    }
  }

  return blocked;
}
