import twilio from "twilio";

import { buildConfirmationBody } from "./confirmation";
import { formatPhoneE164 } from "./format-phone";

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

export async function sendBookingConfirmationSms(opts: {
  to: string;
  guestName: string;
  partySize: number;
  startIso: string;
}): Promise<boolean> {
  if (!isSmsConfigured()) return false;

  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  const body = buildConfirmationBody(opts);
  const to = formatPhoneE164(opts.to);

  await client.messages.create({
    to,
    from: process.env.TWILIO_FROM_NUMBER!,
    body,
  });

  return true;
}
